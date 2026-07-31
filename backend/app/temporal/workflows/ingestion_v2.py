"""Deterministic, references-only base-ingestion Workflow V2."""

from __future__ import annotations

import asyncio
from datetime import timedelta
from typing import Literal

from temporalio import workflow
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    from app.schemas.ingestion_v2 import (
        BaseStagePlan,
        IngestionWorkflowV2Input,
        IngestionWorkflowV2Output,
        ManifestExpectation,
        PrepareBaseStageInput,
        PublishBaseInput,
        StageBatchResult,
        StageEmbeddingInput,
        V2DocumentStatusInput,
    )
    from app.temporal.activities.ingestion_v2 import (
        prepare_base_stage_activity,
        publish_base_activity,
        stage_embedding_batch_activity,
        update_v2_document_status_activity,
    )


TRANSIENT_RETRY = RetryPolicy(
    initial_interval=timedelta(seconds=2),
    backoff_coefficient=2.0,
    maximum_interval=timedelta(minutes=1),
    maximum_attempts=4,
    non_retryable_error_types=(
        "INVALID_INGESTION_INPUT",
        "INVALID_PUBLISH_INPUT",
    ),
)


@workflow.defn(name="IngestionWorkflowV2")
class IngestionWorkflowV2:
    @workflow.run
    async def run(
        self, command: IngestionWorkflowV2Input
    ) -> IngestionWorkflowV2Output:
        await self._update_status(command, "processing")
        try:
            result = await self._ingest(command)
        except Exception:
            await self._update_status(
                command, "failed", error_code="INGESTION_V2_FAILED"
            )
            raise
        await self._update_status(
            command, "completed", chunk_count=result.chunk_count
        )
        return result

    async def _ingest(
        self, command: IngestionWorkflowV2Input
    ) -> IngestionWorkflowV2Output:
        plan = await workflow.execute_activity(
            prepare_base_stage_activity,
            PrepareBaseStageInput(
                source=command.source,
                batch_size=command.batch_size,
            ),
            start_to_close_timeout=timedelta(minutes=15),
            schedule_to_close_timeout=timedelta(hours=1),
            heartbeat_timeout=timedelta(seconds=30),
            retry_policy=TRANSIENT_RETRY,
        )
        typed_plan = BaseStagePlan.model_validate(plan)
        embed_results: list[StageBatchResult] = []
        width = command.max_parallel_batches
        for offset in range(0, len(typed_plan.batches), width):
            group = typed_plan.batches[offset : offset + width]
            values = await asyncio.gather(
                *(
                    workflow.execute_activity(
                        stage_embedding_batch_activity,
                        StageEmbeddingInput(batch=batch),
                        start_to_close_timeout=timedelta(minutes=10),
                        schedule_to_close_timeout=timedelta(minutes=45),
                        heartbeat_timeout=timedelta(seconds=30),
                        retry_policy=TRANSIENT_RETRY,
                    )
                    for batch in group
                )
            )
            embed_results.extend(
                StageBatchResult.model_validate(value) for value in values
            )
        published = await workflow.execute_activity(
            publish_base_activity,
            PublishBaseInput(
                source=command.source,
                manifests=self._manifest_expectations(typed_plan, embed_results),
            ),
            start_to_close_timeout=timedelta(minutes=2),
            schedule_to_close_timeout=timedelta(minutes=10),
            heartbeat_timeout=timedelta(seconds=30),
            retry_policy=TRANSIENT_RETRY,
        )
        if published.revision_id != command.source.revision_id:
            raise RuntimeError("Published revision does not match workflow input.")
        return IngestionWorkflowV2Output(
            revision_id=published.revision_id,
            chunk_count=published.chunk_count,
            batch_count=len(typed_plan.batches),
            manifest_checksum=typed_plan.manifest_checksum,
        )

    @staticmethod
    def _manifest_expectations(
        plan: BaseStagePlan, results: list[StageBatchResult]
    ) -> tuple[ManifestExpectation, ...]:
        return tuple(
            ManifestExpectation(
                stage_name="parse",
                batch_id=batch.batch_id,
                item_count=batch.item_count,
                output_checksum=batch.output_checksum,
            )
            for batch in plan.batches
        ) + tuple(
            ManifestExpectation(
                stage_name="embed",
                batch_id=result.batch_id,
                item_count=result.item_count,
                output_checksum=result.output_checksum,
            )
            for result in results
        )

    @staticmethod
    async def _update_status(
        command: IngestionWorkflowV2Input,
        status: Literal["processing", "completed", "failed"],
        *,
        chunk_count: int | None = None,
        error_code: str | None = None,
    ) -> None:
        await workflow.execute_activity(
            update_v2_document_status_activity,
            V2DocumentStatusInput(
                document_id=command.source.document_id,
                status=status,
                chunk_count=chunk_count,
                error_code=error_code,
            ),
            start_to_close_timeout=timedelta(seconds=30),
            schedule_to_close_timeout=timedelta(minutes=3),
            retry_policy=TRANSIENT_RETRY,
        )
