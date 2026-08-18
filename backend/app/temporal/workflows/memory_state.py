"""Bounded Temporal orchestration for memory-state projection."""

from datetime import timedelta

from temporalio import workflow
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    from app.schemas.memory_state import (
        MemoryStateActivityInput,
        MemoryStateProjectionResult,
        MemoryStateWorkflowInput,
    )
    from app.temporal.activities.memory_state import project_memory_state_activity


MEMORY_STATE_RETRY = RetryPolicy(
    initial_interval=timedelta(seconds=2),
    backoff_coefficient=2.0,
    maximum_interval=timedelta(minutes=1),
    maximum_attempts=4,
    non_retryable_error_types=("INVALID_MEMORY_STATE_PROJECTION",),
)


@workflow.defn(name="MemoryStateWorkflow")
class MemoryStateWorkflow:
    @workflow.run
    async def run(
        self, command: MemoryStateWorkflowInput
    ) -> MemoryStateProjectionResult:
        result = await workflow.execute_activity(
            project_memory_state_activity,
            MemoryStateActivityInput(
                workspace_id=command.workspace_id,
                projection_version=command.projection_version,
                inspected_at=workflow.now(),
            ),
            start_to_close_timeout=timedelta(minutes=5),
            schedule_to_close_timeout=timedelta(minutes=20),
            heartbeat_timeout=timedelta(seconds=30),
            retry_policy=MEMORY_STATE_RETRY,
        )
        return MemoryStateProjectionResult.model_validate(result)
