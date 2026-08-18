from uuid import uuid4

import pytest
from temporalio import activity
from temporalio.contrib.pydantic import pydantic_data_converter
from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Worker

from app.schemas.graph_enrichment import (
    EntityResolutionActivityInput,
    EntityResolutionResult,
    GraphEnrichmentWorkflowInput,
    GraphFailureActivityInput,
    GraphProjectionActivityInput,
    GraphProjectionResult,
    GraphSnapshotActivityInput,
    GraphSnapshotPublishResult,
)
from app.temporal.workflows.enrichment import GraphEnrichmentWorkflow


@pytest.mark.asyncio
async def test_enrichment_workflow_passes_compact_references_and_publishes() -> None:
    workspace_id = uuid4()
    resolution_run_id = uuid4()
    projection_id = uuid4()
    snapshot_id = uuid4()
    calls: list[str] = []

    @activity.defn(name="resolve_entities_activity")
    async def resolve(command: EntityResolutionActivityInput) -> EntityResolutionResult:
        calls.append("resolve")
        assert command.workspace_id == workspace_id
        return EntityResolutionResult(
            resolution_run_id=resolution_run_id,
            evidence_checksum="sha256:" + "a" * 64,
            mapping_checksum="sha256:" + "b" * 64,
            entity_count=2,
            assignment_count=2,
        )

    @activity.defn(name="project_graph_activity")
    async def project(command: GraphProjectionActivityInput) -> GraphProjectionResult:
        calls.append("project")
        assert command.workspace_id == workspace_id
        return GraphProjectionResult(
            projection_id=projection_id,
            resolution_run_id=resolution_run_id,
            revision_set_checksum="sha256:" + "c" * 64,
            projection_checksum="sha256:" + "d" * 64,
            relationship_count=1,
            mapping_count=4,
        )

    @activity.defn(name="publish_graph_snapshot_activity")
    async def publish(command: GraphSnapshotActivityInput) -> GraphSnapshotPublishResult:
        calls.append("publish")
        assert command.projection_id == projection_id
        return GraphSnapshotPublishResult(
            snapshot_id=snapshot_id,
            projection_id=projection_id,
            revision_count=1,
            relationship_count=1,
            mapping_count=4,
            graph_checksum="sha256:" + "e" * 64,
            published=True,
        )

    @activity.defn(name="mark_graph_failed_activity")
    async def mark_failed(_command: GraphFailureActivityInput) -> None:
        calls.append("failed")

    command = GraphEnrichmentWorkflowInput(
        workspace_id=workspace_id,
        resolver_version="resolver-v1",
        projection_version="projection-v1",
    )
    assert "chunk" not in command.model_dump_json()
    assert "document" not in command.model_dump_json()

    async with await WorkflowEnvironment.start_time_skipping(
        data_converter=pydantic_data_converter
    ) as environment:
        task_queue = f"graph-enrichment-{uuid4()}"
        async with Worker(
            environment.client,
            task_queue=task_queue,
            workflows=[GraphEnrichmentWorkflow],
            activities=[resolve, project, publish, mark_failed],
        ):
            result = await environment.client.execute_workflow(
                GraphEnrichmentWorkflow.run,
                command,
                id=f"graph-enrichment-{uuid4()}",
                task_queue=task_queue,
            )

    assert result.snapshot_id == snapshot_id
    assert calls == ["resolve", "project", "publish"]
