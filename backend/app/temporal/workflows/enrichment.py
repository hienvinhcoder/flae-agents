"""Durable downstream orchestration for rebuilding and publishing C-G-M."""

from __future__ import annotations

from datetime import timedelta

from temporalio import workflow
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    from app.schemas.graph_enrichment import (
        EntityResolutionActivityInput,
        GraphEnrichmentWorkflowInput,
        GraphFailureActivityInput,
        GraphProjectionActivityInput,
        GraphProjectionResult,
        GraphSnapshotActivityInput,
        GraphSnapshotPublishResult,
    )
    from app.temporal.activities.enrichment import (
        mark_graph_failed_activity,
        project_graph_activity,
        publish_graph_snapshot_activity,
        resolve_entities_activity,
    )


ENRICHMENT_RETRY = RetryPolicy(
    initial_interval=timedelta(seconds=2),
    backoff_coefficient=2.0,
    maximum_interval=timedelta(minutes=1),
    maximum_attempts=4,
    non_retryable_error_types=(
        "INVALID_RESOLUTION_INPUT",
        "INVALID_GRAPH_PROJECTION",
        "INVALID_GRAPH_SNAPSHOT",
    ),
)


@workflow.defn(name="GraphEnrichmentWorkflow")
class GraphEnrichmentWorkflow:
    @workflow.run
    async def run(
        self, command: GraphEnrichmentWorkflowInput
    ) -> GraphSnapshotPublishResult:
        try:
            await workflow.execute_activity(
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
            result = await workflow.execute_activity(
                publish_graph_snapshot_activity,
                GraphSnapshotActivityInput(
                    workspace_id=command.workspace_id,
                    projection_id=typed_projection.projection_id,
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
                    reason="GRAPH_ENRICHMENT_FAILED",
                ),
                start_to_close_timeout=timedelta(seconds=30),
                schedule_to_close_timeout=timedelta(minutes=3),
                retry_policy=ENRICHMENT_RETRY,
            )
            raise
