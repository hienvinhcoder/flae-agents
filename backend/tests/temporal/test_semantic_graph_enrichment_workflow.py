from uuid import uuid4

import pytest
from temporalio import activity
from temporalio.contrib.pydantic import pydantic_data_converter
from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Replayer, Worker

from app.schemas.graph_enrichment import (
    CompleteGraphSnapshotActivityInput,
    EntityResolutionActivityInput,
    EntityResolutionResult,
    GraphFailureActivityInput,
    GraphProjectionActivityInput,
    GraphProjectionResult,
    GraphSemanticActivityInput,
    GraphSnapshotPublishResult,
    SemanticGraphEnrichmentWorkflowInput,
)
from app.schemas.graph_semantics import GraphSemanticBuildResult
from app.temporal.workflows.semantic_graph_enrichment import (
    SemanticGraphEnrichmentWorkflow,
)


@pytest.mark.asyncio
async def test_semantic_graph_workflow_materializes_complete_graph_before_publish() -> None:
    workspace_id = uuid4()
    resolution_run_id = uuid4()
    relationship_projection_id = uuid4()
    semantic_projection_id = uuid4()
    snapshot_id = uuid4()
    calls: list[str] = []

    @activity.defn(name="resolve_entities_activity")
    async def resolve(command: EntityResolutionActivityInput) -> EntityResolutionResult:
        calls.append("resolve")
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
        return GraphProjectionResult(
            projection_id=relationship_projection_id,
            resolution_run_id=resolution_run_id,
            revision_set_checksum="sha256:" + "c" * 64,
            projection_checksum="sha256:" + "d" * 64,
            relationship_count=1,
            mapping_count=4,
        )

    @activity.defn(name="project_graph_semantics_activity")
    async def semantics(command: GraphSemanticActivityInput) -> GraphSemanticBuildResult:
        calls.append("semantics")
        assert command.resolution_run_id == resolution_run_id
        assert command.relationship_projection_id == relationship_projection_id
        return GraphSemanticBuildResult(
            semantic_projection_id=semantic_projection_id,
            resolution_run_id=resolution_run_id,
            relationship_projection_id=relationship_projection_id,
            input_checksum="sha256:" + "e" * 64,
            projection_checksum="sha256:" + "f" * 64,
            entity_count=2,
            relationship_count=1,
            mapping_count=4,
        )

    @activity.defn(name="publish_complete_graph_snapshot_activity")
    async def publish(
        command: CompleteGraphSnapshotActivityInput,
    ) -> GraphSnapshotPublishResult:
        calls.append("publish")
        assert command.semantic_projection_id == semantic_projection_id
        return GraphSnapshotPublishResult(
            snapshot_id=snapshot_id,
            projection_id=relationship_projection_id,
            semantic_projection_id=semantic_projection_id,
            revision_count=1,
            entity_count=2,
            relationship_count=1,
            mapping_count=4,
            graph_checksum="sha256:" + "0" * 64,
            published=True,
        )

    @activity.defn(name="mark_graph_failed_activity")
    async def mark_failed(_command: GraphFailureActivityInput) -> None:
        calls.append("failed")

    command = SemanticGraphEnrichmentWorkflowInput(
        workspace_id=workspace_id,
        resolver_version="resolver-v2",
        projection_version="projection-v2",
    )
    payload = command.model_dump_json()
    assert "chunk_id" not in payload
    assert "chunk_text" not in payload
    assert "document" not in payload

    async with await WorkflowEnvironment.start_time_skipping(
        data_converter=pydantic_data_converter
    ) as environment:
        task_queue = f"semantic-graph-{uuid4()}"
        async with Worker(
            environment.client,
            task_queue=task_queue,
            workflows=[SemanticGraphEnrichmentWorkflow],
            activities=[resolve, project, semantics, publish, mark_failed],
        ):
            handle = await environment.client.start_workflow(
                SemanticGraphEnrichmentWorkflow.run,
                command,
                id=f"semantic-graph-{uuid4()}",
                task_queue=task_queue,
            )
            result = await handle.result()
            history = await handle.fetch_history()

    assert result.snapshot_id == snapshot_id
    assert calls == ["resolve", "project", "semantics", "publish"]
    await Replayer(
        workflows=[SemanticGraphEnrichmentWorkflow],
        data_converter=pydantic_data_converter,
    ).replay_workflow(history)
