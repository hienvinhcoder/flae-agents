"""Dedicated Temporal worker for resource-intensive knowledge tasks."""

import asyncio
import concurrent.futures

from temporalio.client import Client
from temporalio.worker import Worker

from app.core.config import settings
from app.core.logger import get_logger, setup_logging
from app.core.temporal import get_temporal_client
from app.temporal.activities.ingestion import (
    extract_and_fuse_activity,
    prepare_base_stage_activity,
    publish_base_activity,
    stage_embedding_batch_activity,
    update_document_status_activity,
)
from app.temporal.workflows.ingestion import IngestionWorkflow


logger = get_logger(__name__)


def create_knowledge_worker(
    client: Client,
    activity_executor: concurrent.futures.Executor,
) -> Worker:
    return Worker(
        client,
        task_queue=settings.TEMPORAL_KNOWLEDGE_TASK_QUEUE,
        workflows=[
            IngestionWorkflow,
        ],
        activities=[
            extract_and_fuse_activity,
            prepare_base_stage_activity,
            stage_embedding_batch_activity,
            publish_base_activity,
            update_document_status_activity,
        ],
        activity_executor=activity_executor,
        max_concurrent_workflow_tasks=(
            settings.KNOWLEDGE_MAX_CONCURRENT_WORKFLOWS
        ),
        max_concurrent_activities=(
            settings.KNOWLEDGE_MAX_CONCURRENT_ACTIVITIES
        ),
        max_task_queue_activities_per_second=(
            settings.KNOWLEDGE_TASK_QUEUE_ACTIVITIES_PER_SECOND
        ),
    )


async def run_worker() -> None:
    setup_logging()
    client = await get_temporal_client()
    max_workers = settings.KNOWLEDGE_MAX_CONCURRENT_ACTIVITIES
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        worker = create_knowledge_worker(client, executor)
        logger.info(
            "Knowledge worker started on queue %s with activity capacity %s",
            settings.TEMPORAL_KNOWLEDGE_TASK_QUEUE,
            max_workers,
        )
        await worker.run()


def main() -> None:
    try:
        asyncio.run(run_worker())
    except KeyboardInterrupt:
        logger.info("Knowledge worker stopped by user")


if __name__ == "__main__":
    main()
