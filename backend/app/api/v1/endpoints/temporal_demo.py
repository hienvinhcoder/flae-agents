import uuid
from fastapi import APIRouter, Depends, status
from temporalio.client import Client

from app.core.temporal import get_temporal_client
from app.core.logger import get_logger
from app.schemas.sche_base import DataResponse
from app.schemas.temporal_demo import GreetingRequest, GreetingResponse
from app.temporal.workflows.greeting import GreetingWorkflow

logger = get_logger(__name__)
router = APIRouter()


@router.post(
    "/greet",
    response_model=DataResponse[GreetingResponse],
    status_code=status.HTTP_200_OK,
)
async def trigger_greeting(
    payload: GreetingRequest,
    client: Client = Depends(get_temporal_client),
):
    """
    Trigger Temporal GreetingWorkflow và đợi kết quả trả về.
    """
    workflow_id = f"greet-workflow-{uuid.uuid4()}"
    logger.info(f"Starting GreetingWorkflow with id={workflow_id} for name={payload.name}")

    try:
        # Chạy workflow và đợi kết quả trả về (trong thực tế có thể dùng start_workflow để chạy async)
        result = await client.execute_workflow(
            GreetingWorkflow.run,
            payload.name,
            id=workflow_id,
            task_queue="flae-default-queue",
        )
        logger.info(f"Workflow {workflow_id} completed with result: {result}")
        return DataResponse[GreetingResponse].success_response(
            data=GreetingResponse(workflow_id=workflow_id, result=result)
        )
    except Exception as e:
        logger.error(f"Error executing workflow {workflow_id}: {e}")
        # CustomException hoặc trả về nguyên trạng để FastAPI error handler xử lý
        raise e
