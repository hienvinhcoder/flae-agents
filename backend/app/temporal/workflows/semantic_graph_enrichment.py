"""Replay-safe orchestration for complete semantic C-G-M publication."""

from __future__ import annotations

from datetime import timedelta

from temporalio import workflow

with workflow.unsafe.imports_passed_through():
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
    from app.temporal.activities.enrichment import (
        mark_graph_failed_activity,
        project_graph_activity,
        project_graph_semantics_activity,
        publish_complete_graph_snapshot_activity,
        resolve_entities_activity,
    )
    from app.temporal.workflows.enrichment import ENRICHMENT_RETRY


@workflow.defn(name="SemanticGraphEnrichmentWorkflow")
class SemanticGraphEnrichmentWorkflow:
    @workflow.run
    async def run(
        self, command: SemanticGraphEnrichmentWorkflowInput
    ) -> GraphSnapshotPublishResult:
        try:
            resolution = await workflow.execute_activity(
                resolve_entities_activity,
                EntityResolutionActivityInput(
                    workspace_id=command.workspace_id,
                    resolver_version=command.resolver_version,
                    minimum_confidence=command.minimum_resolution_confidence,
                ),
                start_to_close_timeout=timedelta(minutes=5),
                schedule_to_close_timeout=timedelta(minutes=20),
                heartbeat_timeout=timedelta(seconds=30),
                retry_policy=ENRICHMENT_RETRY,
            )
            typed_resolution = EntityResolutionResult.model_validate(resolution)
            projection = await workflow.execute_activity(
                project_graph_activity,
                GraphProjectionActivityInput(
                    workspace_id=command.workspace_id,
                    projection_version=command.projection_version,
                ),
                start_to_close_timeout=timedelta(minutes=5),
                schedule_to_close_timeout=timedelta(minutes=20),
                heartbeat_timeout=timedelta(seconds=30),
                retry_policy=ENRICHMENT_RETRY,
            )
            typed_projection = GraphProjectionResult.model_validate(projection)
            semantic = await workflow.execute_activity(
                project_graph_semantics_activity,
                GraphSemanticActivityInput(
                    workspace_id=command.workspace_id,
                    resolution_run_id=typed_resolution.resolution_run_id,
                    relationship_projection_id=typed_projection.projection_id,
                    profile=command.semantic_profile,
                ),
                start_to_close_timeout=timedelta(minutes=10),
                schedule_to_close_timeout=timedelta(minutes=30),
                heartbeat_timeout=timedelta(seconds=30),
                retry_policy=ENRICHMENT_RETRY,
            )
            typed_semantic = GraphSemanticBuildResult.model_validate(semantic)
            result = await workflow.execute_activity(
                publish_complete_graph_snapshot_activity,
                CompleteGraphSnapshotActivityInput(
                    workspace_id=command.workspace_id,
                    projection_id=typed_projection.projection_id,
                    semantic_projection_id=typed_semantic.semantic_projection_id,
                ),
                start_to_close_timeout=timedelta(minutes=2),
                schedule_to_close_timeout=timedelta(minutes=10),
                heartbeat_timeout=timedelta(seconds=30),
                retry_policy=ENRICHMENT_RETRY,
            )
            return GraphSnapshotPublishResult.model_validate(result)
        except Exception:
            await workflow.execute_activity(
                mark_graph_failed_activity,
                GraphFailureActivityInput(
                    workspace_id=command.workspace_id,
                    reason="SEMANTIC_GRAPH_ENRICHMENT_FAILED",
                ),
                start_to_close_timeout=timedelta(seconds=30),
                schedule_to_close_timeout=timedelta(minutes=3),
                retry_policy=ENRICHMENT_RETRY,
            )
            raise
