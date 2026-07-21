import asyncio
import concurrent.futures
from temporalio.worker import Worker
from app.core.temporal import get_temporal_client
from app.core.logger import get_logger, setup_logging

# Import workflows và activities
from app.temporal.workflows.greeting import GreetingWorkflow
from app.temporal.workflows.invitation import WorkspaceInvitationWorkflow
from app.temporal.workflows.ingestion import DocumentIngestionWorkflow
from app.temporal.workflows.topic import TopicUpdateWorkflow
from app.temporal.activities.greet import greet
from app.temporal.activities.invitation import send_invitation_email
from app.temporal.activities.topic import update_topic_summary_activity
from app.temporal.activities.ingestion import (
    update_document_status,
    prepare_document_content,
    chunk_document_activity,
    generate_embeddings_activity,
    extract_entities_activity,
    fuse_and_save_activity,
    finalize_ingestion,
    trigger_topic_updates_activity,
)

logger = get_logger(__name__)


async def run_worker():
    # Đảm bảo setup logging
    setup_logging()

    logger.info("Initializing Temporal Worker...")
    try:
        client = await get_temporal_client()
    except Exception as e:
        logger.error(f"Could not connect to Temporal server, exiting: {e}")
        return

    # Định nghĩa ThreadPoolExecutor cho các sync activities
    with concurrent.futures.ThreadPoolExecutor(max_workers=100) as activity_executor:
        worker = Worker(
            client,
            task_queue="flae-default-queue",
            workflows=[
                GreetingWorkflow,
                WorkspaceInvitationWorkflow,
                DocumentIngestionWorkflow,
                TopicUpdateWorkflow,
            ],
            activities=[
                greet,
                send_invitation_email,
                update_topic_summary_activity,
                update_document_status,
                prepare_document_content,
                chunk_document_activity,
                generate_embeddings_activity,
                extract_entities_activity,
                fuse_and_save_activity,
                finalize_ingestion,
                trigger_topic_updates_activity,
            ],
            activity_executor=activity_executor,
        )
        logger.info("Temporal Worker started. Listening on task queue: flae-default-queue")
        await worker.run()


def main():
    try:
        asyncio.run(run_worker())
    except KeyboardInterrupt:
        logger.info("Worker stopped by user.")


if __name__ == "__main__":
    main()

