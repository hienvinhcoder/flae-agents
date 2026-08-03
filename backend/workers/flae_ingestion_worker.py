"""Dedicated Temporal worker for resource-intensive ingestion V2 tasks."""

import asyncio
import concurrent.futures

from temporalio.client import Client
from temporalio.worker import Worker

from app.core.config import settings
from app.core.logger import get_logger, setup_logging
from app.core.temporal import get_temporal_client
from app.temporal.activities.ingestion_v2 import (
    prepare_base_stage_activity,
    publish_base_activity,
    stage_embedding_batch_activity,
    update_v2_document_status_activity,
)
from app.temporal.activities.enrichment import (
    extract_evidence_activity,
    mark_graph_failed_activity,
    plan_evidence_batch_activity,
    project_graph_activity,
    project_graph_semantics_activity,
    publish_complete_graph_snapshot_activity,
    publish_graph_snapshot_activity,
    resolve_entities_activity,
    verify_evidence_manifests_activity,
)
from app.temporal.activities.memory_state import project_memory_state_activity
from app.temporal.workflows.enrichment import GraphEnrichmentWorkflow
from app.temporal.workflows.evidence_extraction import EvidenceExtractionWorkflow
from app.temporal.workflows.ingestion_v2 import IngestionWorkflowV2
from app.temporal.workflows.memory_state import MemoryStateWorkflow
from app.temporal.workflows.semantic_graph_enrichment import (
    SemanticGraphEnrichmentWorkflow,
)


logger = get_logger(__name__)


def create_ingestion_worker(
    client: Client,
    activity_executor: concurrent.futures.Executor,
) -> Worker:
    return Worker(
        client,
        task_queue=settings.TEMPORAL_INGESTION_TASK_QUEUE,
        workflows=[
            IngestionWorkflowV2,
            EvidenceExtractionWorkflow,
            GraphEnrichmentWorkflow,
            SemanticGraphEnrichmentWorkflow,
            MemoryStateWorkflow,
        ],
        activities=[
            prepare_base_stage_activity,
            stage_embedding_batch_activity,
            publish_base_activity,
            update_v2_document_status_activity,
            extract_evidence_activity,
            plan_evidence_batch_activity,
            verify_evidence_manifests_activity,
            resolve_entities_activity,
            project_graph_activity,
            project_graph_semantics_activity,
            publish_complete_graph_snapshot_activity,
            publish_graph_snapshot_activity,
            mark_graph_failed_activity,
            project_memory_state_activity,
        ],
        activity_executor=activity_executor,
        max_concurrent_workflow_tasks=(
            settings.INGESTION_V2_MAX_CONCURRENT_WORKFLOWS
        ),
        max_concurrent_activities=(
            settings.INGESTION_V2_MAX_CONCURRENT_ACTIVITIES
        ),
        max_task_queue_activities_per_second=(
            settings.INGESTION_V2_TASK_QUEUE_ACTIVITIES_PER_SECOND
        ),
    )


async def run_worker() -> None:
    setup_logging()
    if not settings.INGESTION_V2_ENABLED:
        logger.info("Ingestion V2 worker is disabled by feature flag")
        return
    client = await get_temporal_client()
    max_workers = settings.INGESTION_V2_MAX_CONCURRENT_ACTIVITIES
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        worker = create_ingestion_worker(client, executor)
        logger.info(
            "Ingestion V2 worker started on queue %s with activity capacity %s",
            settings.TEMPORAL_INGESTION_TASK_QUEUE,
            max_workers,
        )
        await worker.run()


def main() -> None:
    try:
        asyncio.run(run_worker())
    except KeyboardInterrupt:
        logger.info("Ingestion V2 worker stopped by user")


if __name__ == "__main__":
    main()
