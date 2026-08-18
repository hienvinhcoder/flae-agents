from datetime import UTC, datetime
from uuid import uuid4

import pytest
from temporalio import activity
from temporalio.contrib.pydantic import pydantic_data_converter
from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Replayer, Worker

from app.schemas.discovery_catalog import DiscoverySnapshot
from app.schemas.discovery_workflow import DiscoveryFailureInput, DiscoveryWorkflowInput
from app.temporal.workflows.discovery import DiscoveryEnrichmentWorkflow


@pytest.mark.asyncio
async def test_discovery_workflow_publishes_reference_only_basis_and_replays() -> None:
    workspace_id = uuid4()
    graph_snapshot_id = uuid4()
    snapshot_id = uuid4()
    topic_run_id = uuid4()
    context_run_id = uuid4()
    checksum = "sha256:" + "a" * 64
    calls: list[str] = []

    @activity.defn(name="project_and_publish_discovery_activity")
    async def publish(command: DiscoveryWorkflowInput) -> DiscoverySnapshot:
        calls.append("publish")
        assert command.graph_snapshot_id == graph_snapshot_id
        return DiscoverySnapshot(
            snapshot_id=snapshot_id,
            workspace_id=workspace_id,
            graph_snapshot_id=graph_snapshot_id,
            topic_discovery_run_id=topic_run_id,
            context_discovery_run_id=context_run_id,
            revision_set_checksum=checksum,
            discovery_checksum="sha256:" + "b" * 64,
            topic_count=2,
            context_count=1,
            published_at=datetime(2026, 8, 3, tzinfo=UTC),
        )

    @activity.defn(name="mark_discovery_failed_activity")
    async def mark_failed(_command: DiscoveryFailureInput) -> None:
        calls.append("failed")

    command = DiscoveryWorkflowInput(
        workspace_id=workspace_id,
        graph_snapshot_id=graph_snapshot_id,
        revision_set_checksum=checksum,
    )
    async with await WorkflowEnvironment.start_time_skipping(
        data_converter=pydantic_data_converter
    ) as environment:
        task_queue = f"discovery-{uuid4()}"
        async with Worker(
            environment.client,
            task_queue=task_queue,
            workflows=[DiscoveryEnrichmentWorkflow],
            activities=[publish, mark_failed],
        ):
            handle = await environment.client.start_workflow(
                DiscoveryEnrichmentWorkflow.run,
                command,
                id=f"discovery-{graph_snapshot_id}",
                task_queue=task_queue,
            )
            result = await handle.result()
            history = await handle.fetch_history()

    assert result.snapshot_id == snapshot_id
    assert calls == ["publish"]
    assert "chunk_id" not in history.to_json()
    await Replayer(
        workflows=[DiscoveryEnrichmentWorkflow],
        data_converter=pydantic_data_converter,
    ).replay_workflow(history)
