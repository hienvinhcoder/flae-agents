import asyncio
from uuid import uuid4

import pytest
from temporalio import activity
from temporalio.contrib.pydantic import pydantic_data_converter
from temporalio.exceptions import ApplicationError
from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Replayer, Worker

from app.schemas.enrichment import (
    EvidenceBatchPlan,
    EvidenceBatchPlanInput,
    EvidenceExtractionActivityInput,
    EvidenceExtractionResult,
    EvidenceExtractionWorkflowInput,
    EvidenceExtractionWorkflowResult,
    EvidenceManifestVerificationInput,
)
from app.schemas.graph_enrichment import GraphFailureActivityInput
from app.temporal.workflows.evidence_extraction import EvidenceExtractionWorkflow


def _command() -> EvidenceExtractionWorkflowInput:
    return EvidenceExtractionWorkflowInput(
        workspace_id=uuid4(),
        ingestion_run_id=uuid4(),
        revision_id=uuid4(),
        extractor_version="evidence-v2",
        model_name="fixture-model",
        glean_max=1,
        batch_size=20,
        max_parallel_chunks=2,
    )


@pytest.mark.asyncio
async def test_workflow_extracts_every_reference_with_bounded_retry_and_replay() -> None:
    command = _command()
    chunk_ids = ("chunk-1", "chunk-2", "chunk-3")
    attempts: dict[str, int] = {}
    active = 0
    peak = 0
    failures: list[str] = []

    @activity.defn(name="plan_evidence_batch_activity")
    async def plan(input_value: EvidenceBatchPlanInput) -> EvidenceBatchPlan:
        assert input_value.cursor is None
        return EvidenceBatchPlan(
            items=tuple(
                EvidenceExtractionActivityInput(
                    workspace_id=command.workspace_id,
                    ingestion_run_id=command.ingestion_run_id,
                    revision_id=command.revision_id,
                    chunk_id=chunk_id,
                    extractor_version=command.extractor_version,
                    model_name=command.model_name,
                    glean_max=command.glean_max,
                )
                for chunk_id in chunk_ids
            ),
            next_cursor=None,
        )

    @activity.defn(name="extract_evidence_activity")
    async def extract(
        input_value: EvidenceExtractionActivityInput,
    ) -> EvidenceExtractionResult:
        nonlocal active, peak
        attempts[input_value.chunk_id] = attempts.get(input_value.chunk_id, 0) + 1
        if input_value.chunk_id == "chunk-1" and attempts[input_value.chunk_id] == 1:
            raise RuntimeError("transient model failure")
        active += 1
        peak = max(peak, active)
        await asyncio.sleep(0.01)
        active -= 1
        return EvidenceExtractionResult(
            revision_id=command.revision_id,
            chunk_id=input_value.chunk_id,
            observation_count=1,
            assertion_count=1,
            output_checksum="sha256:" + input_value.chunk_id[-1] * 64,
        )

    @activity.defn(name="verify_evidence_manifests_activity")
    async def verify(
        input_value: EvidenceManifestVerificationInput,
    ) -> EvidenceExtractionWorkflowResult:
        assert input_value.revision_id == command.revision_id
        return EvidenceExtractionWorkflowResult(
            revision_id=command.revision_id,
            chunk_count=3,
            observation_count=3,
            assertion_count=3,
            manifest_checksum="sha256:" + "f" * 64,
        )

    @activity.defn(name="mark_graph_failed_activity")
    async def mark_failed(input_value: GraphFailureActivityInput) -> None:
        failures.append(input_value.reason)

    async with await WorkflowEnvironment.start_time_skipping(
        data_converter=pydantic_data_converter
    ) as environment:
        async with Worker(
            environment.client,
            task_queue="evidence-extraction-test",
            workflows=[EvidenceExtractionWorkflow],
            activities=[plan, extract, verify, mark_failed],
        ):
            handle = await environment.client.start_workflow(
                EvidenceExtractionWorkflow.run,
                command,
                id=f"evidence-{uuid4()}",
                task_queue="evidence-extraction-test",
            )
            result = await handle.result()
            history = await handle.fetch_history()

    assert result.chunk_count == 3
    assert attempts == {"chunk-1": 2, "chunk-2": 1, "chunk-3": 1}
    assert peak <= 2
    assert failures == []
    assert "VERY_SECRET_RAW_CHUNK" not in history.to_json()
    await Replayer(
        workflows=[EvidenceExtractionWorkflow],
        data_converter=pydantic_data_converter,
    ).replay_workflow(history)


@pytest.mark.asyncio
async def test_permanent_partial_failure_marks_graph_failed() -> None:
    command = _command()
    failures: list[str] = []

    @activity.defn(name="plan_evidence_batch_activity")
    async def plan(_input: EvidenceBatchPlanInput) -> EvidenceBatchPlan:
        return EvidenceBatchPlan(
            items=(
                EvidenceExtractionActivityInput(
                    workspace_id=command.workspace_id,
                    ingestion_run_id=command.ingestion_run_id,
                    revision_id=command.revision_id,
                    chunk_id="chunk-invalid",
                    extractor_version=command.extractor_version,
                    model_name=command.model_name,
                ),
            ),
            next_cursor=None,
        )

    @activity.defn(name="extract_evidence_activity")
    async def reject(_input: EvidenceExtractionActivityInput) -> EvidenceExtractionResult:
        raise ApplicationError(
            "unsupported relationship endpoint",
            type="INVALID_EVIDENCE_OUTPUT",
            non_retryable=True,
        )

    @activity.defn(name="mark_graph_failed_activity")
    async def mark_failed(input_value: GraphFailureActivityInput) -> None:
        failures.append(input_value.reason)

    async with await WorkflowEnvironment.start_time_skipping(
        data_converter=pydantic_data_converter
    ) as environment:
        async with Worker(
            environment.client,
            task_queue="evidence-extraction-failure-test",
            workflows=[EvidenceExtractionWorkflow],
            activities=[plan, reject, mark_failed],
        ):
            with pytest.raises(Exception):
                await environment.client.execute_workflow(
                    EvidenceExtractionWorkflow.run,
                    command,
                    id=f"evidence-failure-{uuid4()}",
                    task_queue="evidence-extraction-failure-test",
                )

    assert failures == ["EVIDENCE_EXTRACTION_INCOMPLETE"]
