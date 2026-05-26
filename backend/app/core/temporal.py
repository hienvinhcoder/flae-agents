from temporalio.client import Client
from app.core.config import settings
from app.core.logger import get_logger

from tenacity import retry, stop_after_attempt, wait_exponential

logger = get_logger(__name__)

_temporal_client: Client | None = None


@retry(
    stop=stop_after_attempt(12),
    wait=wait_exponential(multiplier=1, min=2, max=15),
    reraise=True,
    before_sleep=lambda retry_state: logger.warning(
        f"Temporal connection attempt {retry_state.attempt_number} failed. Retrying in {retry_state.next_action.sleep:.2f}s..."
    ),
)
async def _connect_client() -> Client:
    return await Client.connect(
        settings.TEMPORAL_HOST,
        namespace=settings.TEMPORAL_NAMESPACE,
    )


async def get_temporal_client() -> Client:
    """
    Tạo hoặc trả về kết nối duy nhất (singleton) tới Temporal Server.
    Tự động thử lại kết nối nhiều lần nếu server chưa sẵn sàng khi khởi động.
    """
    global _temporal_client
    if _temporal_client is None:
        try:
            logger.info(
                f"Connecting to Temporal Server at {settings.TEMPORAL_HOST} in namespace {settings.TEMPORAL_NAMESPACE}"
            )
            _temporal_client = await _connect_client()
            logger.info("Successfully connected to Temporal Server")
        except Exception as e:
            logger.error(f"Failed to connect to Temporal Server after multiple attempts: {e}")
            raise e
    return _temporal_client
