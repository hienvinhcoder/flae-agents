import asyncio
from datetime import UTC, datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from temporalio import activity
from temporalio.client import WorkflowFailureError
from temporalio.contrib.pydantic import pydantic_data_converter
from temporalio.exceptions import ApplicationError
from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Replayer, Worker

from app.schemas.ingestion import (
    BaseBatchReference,
    BaseStagePlan,
    DocumentIngestionStatusInput,
    IngestionWorkflowInput,
    PrepareBaseStageInput,
    PublishBaseInput,
    PublishBaseResult,
    SourceRevisionReference,
    StageBatchResult,
    StageEmbeddingInput,
)
from app.temporal.workflows.ingestion import IngestionWorkflow


def test_workflow_declares_canonical_durable_type() -> None:
    assert (
        IngestionWorkflow.__temporal_workflow_definition.name
        == "KnowledgeIngestionWorkflowV1"
    )


def _source() -> SourceRevisionReference:
    return SourceRevisionReference(
        workspace_id=uuid4(),
        source_id=uuid4(),
        document_id=uuid4(),
        revision_id=uuid4(),
        ingestion_run_id=uuid4(),
        source_uri="gcs://flae-test/workspace/document.md",
        source_name="Workflow reference",
        source_type="gcs",
        source_modified_at=datetime(2026, 7, 29, tzinfo=UTC),
        content_checksum="sha256:" + "a" * 64,
        acl_checksum="sha256:" + "b" * 64,
        acl_scope="workspace",
        parser_version="markdown-v1",
        chunker_version="structure-v1",
        pipeline_version="v1",
    )


def _plan(source: SourceRevisionReference) -> BaseStagePlan:
    batches = tuple(
        BaseBatchReference(
            workspace_id=source.workspace_id,
            ingestion_run_id=source.ingestion_run_id,
            revision_id=source.revision_id,
            batch_id=f"base-{index:06d}",
            item_count=1,
            pipeline_version=source.pipeline_version,
            input_checksum=source.content_checksum,
            output_checksum="sha256:" + str(index + 1) * 64,
        )
        for index in range(3)
    )
    return BaseStagePlan(
        revision_id=source.revision_id,
        ingestion_run_id=source.ingestion_run_id,
        chunk_count=3,
        batches=batches,
        manifest_checksum="sha256:" + "e" * 64,
    )


@pytest.mark.asyncio
async def test_workflow_skips_core_document_status_activity_for_connectors(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    execute_activity = AsyncMock()
    monkeypatch.setattr(
        "app.temporal.workflows.ingestion.workflow.execute_activity",
        execute_activity,
    )
    command = IngestionWorkflowInput(
        source=_source(), update_core_document_status=False
    )

    await IngestionWorkflow._update_status(command, "processing")

    execute_activity.assert_not_awaited()


@pytest.mark.asyncio
async def test_workflow_retries_transient_batches_and_bounds_fanout() -> None:
    source = _source()
    plan = _plan(source)
    attempts: dict[str, int] = {}
    active = 0
    peak = 0
    statuses: list[str] = []

    @activity.defn(name="update_document_status_activity")
    async def update_status(command: DocumentIngestionStatusInput) -> None:
        statuses.append(command.status)

    @activity.defn(name="prepare_base_stage_activity")
    async def prepare(_command: PrepareBaseStageInput) -> BaseStagePlan:
        return plan

    @activity.defn(name="stage_embedding_batch_activity")
    async def embed(command: StageEmbeddingInput) -> StageBatchResult:
        nonlocal active, peak
        batch_id = command.batch.batch_id
        attempts[batch_id] = attempts.get(batch_id, 0) + 1
        if batch_id == "base-000000" and attempts[batch_id] == 1:
            raise RuntimeError("transient provider failure")
        active += 1
        peak = max(peak, active)
        await asyncio.sleep(0.01)
        active -= 1
        return StageBatchResult(
            batch_id=batch_id,
            item_count=1,
            input_checksum=command.batch.output_checksum,
            output_checksum="sha256:" + "f" * 64,
        )

    @activity.defn(name="publish_base_activity")
    async def publish(command: PublishBaseInput) -> PublishBaseResult:
        assert len(command.manifests) == 6
        return PublishBaseResult(
            revision_id=source.revision_id,
            chunk_count=3,
            published=True,
        )

    async with await WorkflowEnvironment.start_time_skipping(
        data_converter=pydantic_data_converter
    ) as environment:
        async with Worker(
            environment.client,
            task_queue="ingestion-test",
            workflows=[IngestionWorkflow],
            activities=[update_status, prepare, embed, publish],
        ):
            handle = await environment.client.start_workflow(
                IngestionWorkflow.run,
                IngestionWorkflowInput(
                    source=source,
                    batch_size=20,
                    max_parallel_batches=2,
                ),
                id=f"ingestion-{uuid4()}",
                task_queue="ingestion-test",
            )
            result = await handle.result()
            history = await handle.fetch_history()

    assert result.chunk_count == 3
    assert attempts["base-000000"] == 2
    assert peak <= 2
    assert statuses == ["processing", "completed"]
    assert "VERY_SECRET_RAW_DOCUMENT" not in history.to_json()
    await Replayer(
        workflows=[IngestionWorkflow],
        data_converter=pydantic_data_converter,
    ).replay_workflow(history)


@pytest.mark.asyncio
async def test_workflow_does_not_retry_permanent_input_failure() -> None:
    source = _source()
    attempts = 0
    statuses: list[str] = []

    @activity.defn(name="update_document_status_activity")
    async def update_status(command: DocumentIngestionStatusInput) -> None:
        statuses.append(command.status)

    @activity.defn(name="prepare_base_stage_activity")
    async def reject(_command: PrepareBaseStageInput) -> BaseStagePlan:
        nonlocal attempts
        attempts += 1
        raise ApplicationError(
            "checksum mismatch",
            type="INVALID_INGESTION_INPUT",
            non_retryable=True,
        )

    async with await WorkflowEnvironment.start_time_skipping(
        data_converter=pydantic_data_converter
    ) as environment:
        async with Worker(
            environment.client,
            task_queue="ingestion-permanent-test",
            workflows=[IngestionWorkflow],
            activities=[update_status, reject],
        ):
            with pytest.raises(WorkflowFailureError):
                await environment.client.execute_workflow(
                    IngestionWorkflow.run,
                    IngestionWorkflowInput(source=source),
                    id=f"ingestion-{uuid4()}",
                    task_queue="ingestion-permanent-test",
                )

    assert attempts == 1
    assert statuses == ["processing", "failed"]


@pytest.mark.asyncio
async def test_workflow_cancellation_reaches_heartbeat_activity() -> None:
    source = _source()
    started = asyncio.Event()

    @activity.defn(name="update_document_status_activity")
    async def update_status(_command: DocumentIngestionStatusInput) -> None:
        return None

    @activity.defn(name="prepare_base_stage_activity")
    async def wait_for_cancel(_command: PrepareBaseStageInput) -> BaseStagePlan:
        started.set()
        while True:
            activity.heartbeat({"stage": "waiting-for-cancel"})
            await asyncio.sleep(0.01)

    async with await WorkflowEnvironment.start_time_skipping(
        data_converter=pydantic_data_converter
    ) as environment:
        async with Worker(
            environment.client,
            task_queue="ingestion-cancel-test",
            workflows=[IngestionWorkflow],
            activities=[update_status, wait_for_cancel],
        ):
            handle = await environment.client.start_workflow(
                IngestionWorkflow.run,
                IngestionWorkflowInput(source=source),
                id=f"ingestion-{uuid4()}",
                task_queue="ingestion-cancel-test",
            )
            await asyncio.wait_for(started.wait(), timeout=5)
            await handle.cancel()
            with pytest.raises(WorkflowFailureError):
                await handle.result()
