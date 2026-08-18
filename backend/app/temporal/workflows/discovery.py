"""Replay-safe topic, context, and discovery snapshot orchestration."""

from __future__ import annotations

from datetime import timedelta

from temporalio import workflow
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    from app.schemas.discovery_workflow import (
        DiscoveryFailureInput,
        DiscoveryWorkflowInput,
        DiscoveryWorkflowResult,
    )
    from app.temporal.activities.discovery import (
        mark_discovery_failed_activity,
        project_and_publish_discovery_activity,
    )


DISCOVERY_RETRY = RetryPolicy(
    initial_interval=timedelta(seconds=2),
    backoff_coefficient=2.0,
    maximum_interval=timedelta(minutes=1),
    maximum_attempts=4,
    non_retryable_error_types=("INVALID_DISCOVERY_INPUT",),
)


@workflow.defn(name="DiscoveryEnrichmentWorkflow")
class DiscoveryEnrichmentWorkflow:
    @workflow.run
    async def run(
        self, command: DiscoveryWorkflowInput
    ) -> DiscoveryWorkflowResult:
        try:
            value = await workflow.execute_activity(
                project_and_publish_discovery_activity,
                command,
                start_to_close_timeout=timedelta(minutes=10),
                schedule_to_close_timeout=timedelta(minutes=30),
                heartbeat_timeout=timedelta(seconds=30),
                retry_policy=DISCOVERY_RETRY,
            )
            return DiscoveryWorkflowResult.model_validate(value.model_dump())
        except Exception:
            await workflow.execute_activity(
                mark_discovery_failed_activity,
                DiscoveryFailureInput(
                    workspace_id=command.workspace_id,
                    reason="DISCOVERY_ENRICHMENT_FAILED",
                ),
                start_to_close_timeout=timedelta(seconds=30),
                schedule_to_close_timeout=timedelta(minutes=3),
                retry_policy=DISCOVERY_RETRY,
            )
            raise
