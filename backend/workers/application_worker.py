"""Temporal worker for interactive application workflows."""

import asyncio
import concurrent.futures
from temporalio.worker import Worker
from app.core.temporal import get_temporal_client
from app.core.logger import get_logger, setup_logging

from app.temporal.workflows.invitation import WorkspaceInvitationWorkflow
from app.temporal.workflows.topic import TopicUpdateWorkflow
from app.temporal.activities.invitation import send_invitation_email
from app.temporal.activities.topic import update_topic_summary_activity

logger = get_logger(__name__)


async def run_worker() -> None:
    setup_logging()

    logger.info("Initializing application Temporal worker")
    try:
        client = await get_temporal_client()
    except Exception as e:
        logger.error("Could not connect to Temporal server, exiting: %s", e)
        return

    with concurrent.futures.ThreadPoolExecutor(max_workers=100) as activity_executor:
        worker = Worker(
            client,
            task_queue="flae-default-queue",
            workflows=[
                WorkspaceInvitationWorkflow,
                TopicUpdateWorkflow,
            ],
            activities=[
                send_invitation_email,
                update_topic_summary_activity,
            ],
            activity_executor=activity_executor,
        )
        logger.info("Application worker started on queue flae-default-queue")
        await worker.run()


def main() -> None:
    try:
        asyncio.run(run_worker())
    except KeyboardInterrupt:
        logger.info("Application worker stopped by user")


if __name__ == "__main__":
    main()
