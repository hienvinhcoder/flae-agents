"""Durable, references-only extraction for every current revision chunk."""

from __future__ import annotations

import asyncio
from datetime import timedelta

from temporalio import workflow
from temporalio.common import RetryPolicy
from temporalio.exceptions import ApplicationError

with workflow.unsafe.imports_passed_through():
    from app.schemas.enrichment import (
        EvidenceBatchPlan,
        EvidenceBatchPlanInput,
        EvidenceExtractionResult,
        EvidenceExtractionWorkflowInput,
        EvidenceExtractionWorkflowResult,
        EvidenceManifestVerificationInput,
    )
    from app.schemas.graph_enrichment import GraphFailureActivityInput
    from app.temporal.activities.enrichment import (
        extract_evidence_activity,
        mark_graph_failed_activity,
        plan_evidence_batch_activity,
        verify_evidence_manifests_activity,
    )


EVIDENCE_RETRY = RetryPolicy(
    initial_interval=timedelta(seconds=2),
    backoff_coefficient=2.0,
    maximum_interval=timedelta(minutes=1),
    maximum_attempts=4,
    non_retryable_error_types=(
        "INVALID_EVIDENCE_OUTPUT",
        "INVALID_EVIDENCE_PLAN",
        "INCOMPLETE_EVIDENCE",
    ),
)


@workflow.defn(name="EvidenceExtractionWorkflow")
class EvidenceExtractionWorkflow:
    @workflow.run
    async def run(
        self, command: EvidenceExtractionWorkflowInput
    ) -> EvidenceExtractionWorkflowResult:
        try:
            return await self._extract(command)
        except Exception:
            await workflow.execute_activity(
                mark_graph_failed_activity,
                GraphFailureActivityInput(
                    workspace_id=command.workspace_id,
                    reason="EVIDENCE_EXTRACTION_INCOMPLETE",
                ),
                start_to_close_timeout=timedelta(seconds=30),
                schedule_to_close_timeout=timedelta(minutes=3),
                retry_policy=EVIDENCE_RETRY,
            )
            raise

    async def _extract(
        self, command: EvidenceExtractionWorkflowInput
    ) -> EvidenceExtractionWorkflowResult:
        cursor: str | None = None
        results: list[EvidenceExtractionResult] = []
        while True:
            value = await workflow.execute_activity(
                plan_evidence_batch_activity,
                EvidenceBatchPlanInput(
                    workspace_id=command.workspace_id,
                    ingestion_run_id=command.ingestion_run_id,
                    revision_id=command.revision_id,
                    extractor_version=command.extractor_version,
                    model_name=command.model_name,
                    glean_max=command.glean_max,
                    cursor=cursor,
                    batch_size=command.batch_size,
                ),
                start_to_close_timeout=timedelta(minutes=2),
                schedule_to_close_timeout=timedelta(minutes=10),
                heartbeat_timeout=timedelta(seconds=30),
                retry_policy=EVIDENCE_RETRY,
            )
            plan = EvidenceBatchPlan.model_validate(value)
            for offset in range(0, len(plan.items), command.max_parallel_chunks):
                group = plan.items[offset : offset + command.max_parallel_chunks]
                extracted = await asyncio.gather(
                    *(
                        workflow.execute_activity(
                            extract_evidence_activity,
                            item,
                            start_to_close_timeout=timedelta(minutes=5),
                            schedule_to_close_timeout=timedelta(minutes=20),
                            heartbeat_timeout=timedelta(seconds=30),
                            retry_policy=EVIDENCE_RETRY,
                        )
                        for item in group
                    )
                )
                results.extend(
                    EvidenceExtractionResult.model_validate(item)
                    for item in extracted
                )
                if len(results) > command.max_chunks:
                    raise ApplicationError(
                        "Evidence extraction exceeded its bounded chunk budget.",
                        type="EVIDENCE_CHUNK_BUDGET_EXCEEDED",
                    )
            if plan.next_cursor is None:
                break
            cursor = plan.next_cursor
        if not results:
            raise ApplicationError(
                "Evidence extraction found no current chunks.",
                type="INVALID_EVIDENCE_PLAN",
            )
        verified = await workflow.execute_activity(
            verify_evidence_manifests_activity,
            EvidenceManifestVerificationInput(
                workspace_id=command.workspace_id,
                ingestion_run_id=command.ingestion_run_id,
                revision_id=command.revision_id,
                extractor_version=command.extractor_version,
                expected_chunk_count=len(results),
                expected_observation_count=sum(
                    item.observation_count for item in results
                ),
                expected_assertion_count=sum(item.assertion_count for item in results),
            ),
            start_to_close_timeout=timedelta(minutes=2),
            schedule_to_close_timeout=timedelta(minutes=10),
            heartbeat_timeout=timedelta(seconds=30),
            retry_policy=EVIDENCE_RETRY,
        )
        return EvidenceExtractionWorkflowResult.model_validate(verified)
