"""Activity boundary for reference-only memory-state projection."""

from pydantic import ValidationError
from temporalio import activity
from temporalio.exceptions import ApplicationError

from app.core.exceptions import InvalidArgumentError
from app.db.rag_db import rag_db_manager
from app.schemas.memory_state import (
    MemoryStateActivityInput,
    MemoryStateProjectionResult,
)
from app.services.knowledge.memory_state.repository import MemoryStateRepository
from app.services.knowledge.memory_state.service import MemoryStateService


@activity.defn
async def project_memory_state_activity(
    command: MemoryStateActivityInput,
) -> MemoryStateProjectionResult:
    activity.heartbeat({"stage": "project_memory_state", "completed": 0})
    service = MemoryStateService(
        repository=MemoryStateRepository(rag_db_manager)
    )
    try:
        projection = await service.project_workspace(
            command.workspace_id,
            projection_version=command.projection_version,
            inspected_at=command.inspected_at,
        )
    except (InvalidArgumentError, ValidationError) as error:
        raise ApplicationError(
            str(error),
            type="INVALID_MEMORY_STATE_PROJECTION",
            non_retryable=True,
        ) from error
    activity.heartbeat({"stage": "project_memory_state", "completed": 1})
    return MemoryStateProjectionResult(
        projection_id=projection.projection_id,
        projection_checksum=projection.projection_checksum,
        change_count=len(projection.changes),
        contradiction_count=len(projection.contradictions),
        gap_count=len(projection.gaps),
    )
