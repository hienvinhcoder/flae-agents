from datetime import UTC, datetime
from uuid import uuid4

import pytest
from temporalio import activity
from temporalio.contrib.pydantic import pydantic_data_converter
from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Worker

from app.schemas.memory_state import (
    MemoryStateActivityInput,
    MemoryStateProjectionResult,
    MemoryStateWorkflowInput,
)
from app.temporal.workflows.memory_state import MEMORY_STATE_RETRY, MemoryStateWorkflow


@pytest.mark.asyncio
async def test_memory_state_workflow_passes_references_only() -> None:
    workspace_id = uuid4()
    projection_id = uuid4()
    calls: list[MemoryStateActivityInput] = []

    @activity.defn(name="project_memory_state_activity")
    async def project(
        command: MemoryStateActivityInput,
    ) -> MemoryStateProjectionResult:
        calls.append(command)
        return MemoryStateProjectionResult(
            projection_id=projection_id,
            projection_checksum="sha256:" + "a" * 64,
            change_count=1,
            contradiction_count=2,
            gap_count=1,
        )

    command = MemoryStateWorkflowInput(
        workspace_id=workspace_id,
        projection_version="memory-state-v1",
    )
    assert "assertion" not in command.model_dump_json()
    assert "evidence" not in command.model_dump_json()

    async with await WorkflowEnvironment.start_time_skipping(
        data_converter=pydantic_data_converter
    ) as environment:
        task_queue = f"memory-state-{uuid4()}"
        async with Worker(
            environment.client,
            task_queue=task_queue,
            workflows=[MemoryStateWorkflow],
            activities=[project],
        ):
            result = await environment.client.execute_workflow(
                MemoryStateWorkflow.run,
                command,
                id=f"memory-state-{uuid4()}",
                task_queue=task_queue,
            )

    assert result.projection_id == projection_id
    assert calls[0].workspace_id == workspace_id
    assert calls[0].projection_version == "memory-state-v1"
    assert calls[0].inspected_at.tzinfo is not None
    assert calls[0].inspected_at <= datetime.now(UTC)


def test_invalid_memory_state_projection_is_not_retried() -> None:
    assert "INVALID_MEMORY_STATE_PROJECTION" in (
        MEMORY_STATE_RETRY.non_retryable_error_types or ()
    )
