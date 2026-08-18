from typing import Any, Optional, cast
from psycopg import AsyncConnection
from psycopg_pool import AsyncConnectionPool
from psycopg.rows import dict_row
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)

# Global instances
pool: Optional[AsyncConnectionPool[AsyncConnection[dict[str, Any]]]] = None
checkpointer: Optional[AsyncPostgresSaver] = None


async def init_checkpoint_db() -> AsyncPostgresSaver:
    """
    Khởi tạo và thiết lập cơ sở dữ liệu checkpoint cho LangGraph sử dụng AsyncConnectionPool.
    """
    global pool, checkpointer
    if checkpointer is not None:
        return checkpointer

    try:
        logger.info(f"Đang kết nối tới db checkpoint LangGraph: {settings.AGENT_STATE_DATABASE_URL}")

        # Tạo Connection Pool thủ công với cấu hình autocommit và dict_row bắt buộc
        pool_instance = cast(
            AsyncConnectionPool[AsyncConnection[dict[str, Any]]],
            AsyncConnectionPool(
                conninfo=settings.AGENT_STATE_DATABASE_URL,
                min_size=1,
                max_size=10,
                open=False,
                kwargs={"autocommit": True, "row_factory": dict_row}
            )
        )
        # Mở pool và đợi kết nối sẵn sàng
        await pool_instance.open()
        await pool_instance.wait()

        # Khởi tạo checkpointer sử dụng connection pool vừa tạo
        checkpointer = AsyncPostgresSaver(pool_instance)
        pool = pool_instance

        # Tạo bảng nếu chưa tồn tại
        await checkpointer.setup()

        logger.info("Khởi tạo và thiết lập LangGraph AsyncPostgresSaver & AsyncConnectionPool thành công.")
        return checkpointer
    except Exception as e:
        logger.error(f"Lỗi khi khởi tạo AsyncPostgresSaver: {e}", exc_info=True)
        # Dọn dẹp pool nếu có lỗi xảy ra
        if pool is not None:
            try:
                await pool.close()
            except Exception:
                pass
        pool = None
        checkpointer = None
        raise e


async def close_checkpoint_db():
    """
    Đóng kết nối connection pool khi tắt ứng dụng.
    """
    global pool, checkpointer
    if pool is not None:
        try:
            await pool.close()
            logger.info("Đã đóng kết nối LangGraph AsyncConnectionPool thành công.")
        except Exception as e:
            logger.error(f"Lỗi khi đóng AsyncConnectionPool: {e}", exc_info=True)
        finally:
            pool = None
            checkpointer = None
