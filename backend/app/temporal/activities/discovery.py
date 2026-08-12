"""References-only activities for discovery projection and publication."""

from temporalio import activity

from app.db.rag_db import rag_db_manager
from app.schemas.discovery_catalog import DiscoverySnapshot
from app.schemas.discovery_workflow import DiscoveryFailureInput, DiscoveryWorkflowInput
from app.services.knowledge.discovery.projection_service import DiscoveryProjectionService


@activity.defn
async def project_and_publish_discovery_activity(
    command: DiscoveryWorkflowInput,
) -> DiscoverySnapshot:
    activity.heartbeat({"stage": "discovery", "completed": 0})
    result = await DiscoveryProjectionService(
        rag_db_manager
    ).discover_and_publish(command)
    activity.heartbeat({"stage": "discovery", "completed": 1})
    return result


@activity.defn
async def mark_discovery_failed_activity(command: DiscoveryFailureInput) -> None:
    await DiscoveryProjectionService(rag_db_manager).mark_failed(
        command.workspace_id, command.reason
    )
