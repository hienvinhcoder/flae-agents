import uuid
import pytest
from temporalio.testing import WorkflowEnvironment, ActivityEnvironment
from temporalio.worker import Worker

from app.temporal.activities.greet import greet
from app.temporal.workflows.greeting import GreetingWorkflow


@pytest.mark.asyncio
async def test_greet_activity():
    """
    Test activity riêng biệt.
    """
    env = ActivityEnvironment()
    result = await env.run(greet, "World")
    assert result == "Hello, World!"


@pytest.mark.asyncio
async def test_greeting_workflow():
    """
    Test tích hợp workflow và activity trong môi trường kiểm thử Temporal local.
    """
    task_queue_name = f"test-queue-{uuid.uuid4()}"
    try:
        env_context = await WorkflowEnvironment.start_local()
    except RuntimeError as e:
        if "Failed starting Temporal dev server" in str(e):
            pytest.skip("Bỏ qua test workflow tích hợp vì không khởi động được Temporal dev server cục bộ (lỗi Gatekeeper hoặc Network trên macOS)")
            return
        raise e

    async with env_context as env:
        async with Worker(
            env.client,
            task_queue=task_queue_name,
            workflows=[GreetingWorkflow],
            activities=[greet],
        ):
            result = await env.client.execute_workflow(
                GreetingWorkflow.run,
                "Antigravity",
                id=f"test-workflow-{uuid.uuid4()}",
                task_queue=task_queue_name,
            )
            assert result == "Hello, Antigravity!"
