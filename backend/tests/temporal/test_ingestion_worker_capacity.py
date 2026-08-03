import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from uuid import uuid4
from unittest.mock import MagicMock

import pytest
from temporalio import activity
from temporalio.contrib.pydantic import pydantic_data_converter
from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Worker

from app.core.config import settings
from app.schemas.ingestion_v2 import (
    BaseBatchReference,
    BaseStagePlan,
    IngestionWorkflowV2Input,
    PrepareBaseStageInput,
    PublishBaseInput,
    PublishBaseResult,
    SourceRevisionReference,
    StageBatchResult,
    StageEmbeddingInput,
    V2DocumentStatusInput,
)
from app.temporal.activities.greet import greet
from app.temporal.workflows.greeting import GreetingWorkflow
from app.temporal.workflows.company_memory_ingestion import (
    CompanyMemoryIngestionWorkflow,
)
from app.temporal.workflows.ingestion import DocumentIngestionWorkflow
from app.temporal.workflows.ingestion_v2 import IngestionWorkflowV2
from app.temporal.workflows.enrichment import GraphEnrichmentWorkflow
from app.temporal.workflows.evidence_extraction import EvidenceExtractionWorkflow
from app.temporal.workflows.memory_state import MemoryStateWorkflow
from app.temporal.workflows.semantic_graph_enrichment import (
    SemanticGraphEnrichmentWorkflow,
)
from workers import flae_ingestion_worker
from workers import flae_worker


def test_ingestion_v2_uses_a_dedicated_bounded_worker(monkeypatch) -> None:
    worker_factory = MagicMock(return_value=MagicMock())
    monkeypatch.setattr(flae_ingestion_worker, "Worker", worker_factory)
    client = MagicMock()
    with ThreadPoolExecutor(max_workers=1) as executor:
        flae_ingestion_worker.create_ingestion_worker(client, executor)

    kwargs = worker_factory.call_args.kwargs
    assert kwargs["task_queue"] == settings.TEMPORAL_INGESTION_TASK_QUEUE
    assert kwargs["task_queue"] != "flae-default-queue"
    assert kwargs["workflows"] == [
        CompanyMemoryIngestionWorkflow,
        IngestionWorkflowV2,
        EvidenceExtractionWorkflow,
        GraphEnrichmentWorkflow,
        SemanticGraphEnrichmentWorkflow,
        MemoryStateWorkflow,
    ]
    assert any(
        value.__name__ == "project_memory_state_activity"
        for value in kwargs["activities"]
    )
    assert kwargs["max_concurrent_workflow_tasks"] == (
        settings.INGESTION_V2_MAX_CONCURRENT_WORKFLOWS
    )
    assert kwargs["max_concurrent_activities"] == (
        settings.INGESTION_V2_MAX_CONCURRENT_ACTIVITIES
    )
    assert kwargs["max_task_queue_activities_per_second"] == (
        settings.INGESTION_V2_TASK_QUEUE_ACTIVITIES_PER_SECOND
    )


def test_v1_remains_registered_on_the_interactive_compatible_worker() -> None:
    source = open(flae_worker.__file__, encoding="utf-8").read()

    assert DocumentIngestionWorkflow.__name__ in source
    assert settings.TEMPORAL_INGESTION_TASK_QUEUE not in source


def _source() -> SourceRevisionReference:
    return SourceRevisionReference(
        workspace_id=uuid4(),
        source_id=uuid4(),
        document_id=uuid4(),
        revision_id=uuid4(),
        ingestion_run_id=uuid4(),
        source_uri="gcs://flae-test/workspace/document.md",
        source_name="Capacity test",
        source_type="gcs",
        source_modified_at=datetime(2026, 7, 29, tzinfo=UTC),
        content_checksum="sha256:" + "a" * 64,
        acl_checksum="sha256:" + "b" * 64,
        acl_scope="workspace",
        parser_version="markdown-v2",
        chunker_version="structure-v2",
        pipeline_version="pipeline-v2",
    )


@pytest.mark.asyncio
async def test_ingestion_backlog_does_not_starve_interactive_queue() -> None:
    release_ingestion = asyncio.Event()
    ingestion_started = asyncio.Event()

    @activity.defn(name="update_v2_document_status_activity")
    async def status(_command: V2DocumentStatusInput) -> None:
        return None

    @activity.defn(name="prepare_base_stage_activity")
    async def prepare(command: PrepareBaseStageInput) -> BaseStagePlan:
        source = command.source
        batch = BaseBatchReference(
            workspace_id=source.workspace_id,
            ingestion_run_id=source.ingestion_run_id,
            revision_id=source.revision_id,
            batch_id="base-000000",
            item_count=1,
            pipeline_version=source.pipeline_version,
            input_checksum=source.content_checksum,
            output_checksum="sha256:" + "c" * 64,
        )
        return BaseStagePlan(
            revision_id=source.revision_id,
            ingestion_run_id=source.ingestion_run_id,
            chunk_count=1,
            batches=(batch,),
            manifest_checksum="sha256:" + "d" * 64,
        )

    @activity.defn(name="stage_embedding_batch_activity")
    async def embed(command: StageEmbeddingInput) -> StageBatchResult:
        ingestion_started.set()
        await release_ingestion.wait()
        return StageBatchResult(
            batch_id=command.batch.batch_id,
            item_count=1,
            input_checksum=command.batch.output_checksum,
            output_checksum="sha256:" + "e" * 64,
        )

    @activity.defn(name="publish_base_activity")
    async def publish(command: PublishBaseInput) -> PublishBaseResult:
        return PublishBaseResult(
            revision_id=command.source.revision_id,
            chunk_count=1,
            published=True,
        )

    async with await WorkflowEnvironment.start_time_skipping(
        data_converter=pydantic_data_converter
    ) as environment:
        async with Worker(
            environment.client,
            task_queue="capacity-ingestion-queue",
            workflows=[IngestionWorkflowV2],
            activities=[status, prepare, embed, publish],
            max_concurrent_activities=1,
        ), Worker(
            environment.client,
            task_queue="capacity-interactive-queue",
            workflows=[GreetingWorkflow],
            activities=[greet],
            max_concurrent_activities=1,
        ):
            with environment.auto_time_skipping_disabled():
                handles = [
                    await environment.client.start_workflow(
                        IngestionWorkflowV2.run,
                        IngestionWorkflowV2Input(source=_source()),
                        id=f"capacity-ingestion-{uuid4()}",
                        task_queue="capacity-ingestion-queue",
                    )
                    for _ in range(3)
                ]
                await asyncio.wait_for(ingestion_started.wait(), timeout=5)
                greeting = await asyncio.wait_for(
                    environment.client.execute_workflow(
                        GreetingWorkflow.run,
                        "interactive",
                        id=f"capacity-greeting-{uuid4()}",
                        task_queue="capacity-interactive-queue",
                    ),
                    timeout=5,
                )
                assert greeting == "Hello, interactive!"
                release_ingestion.set()
                await asyncio.gather(*(handle.result() for handle in handles))
