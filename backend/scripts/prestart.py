import asyncio
import logging
import subprocess
from tenacity import after_log, before_log, retry, stop_after_attempt, wait_fixed
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings
from urllib.parse import urlparse, urlunparse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

max_tries = 60 * 5  # 5 minutes
wait_seconds = 1


@retry(
    stop=stop_after_attempt(max_tries),
    wait=wait_fixed(wait_seconds),
    before=before_log(logger, logging.INFO),
    after=after_log(logger, logging.WARN),
)
async def wait_for_db(engine) -> None:
    try:
        # Try to create session/connection to check if DB is awake
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:
        logger.error(f"Lỗi kết nối cơ sở dữ liệu: {e}")
        raise e


async def init_rag_database() -> None:
    """
    Kiểm tra và tạo database 'rag_db' nếu chưa tồn tại,
    sau đó cài đặt extension pgvector trên database này.
    """
    # Phân tích URL hiện tại
    parsed_url = urlparse(settings.POSTGRES_URL)

    # Kết nối vào database mặc định (postgres) để tạo DB mới
    default_db_url = urlunparse(parsed_url._replace(path="/postgres"))
    rag_db_name = "rag_db"
    rag_db_url = urlunparse(parsed_url._replace(path=f"/{rag_db_name}"))

    logger.info(f"Đang kiểm tra và khởi tạo cơ sở dữ liệu RAG: {rag_db_name}...")

    engine_default = create_async_engine(default_db_url, isolation_level="AUTOCOMMIT")
    try:
        async with engine_default.connect() as conn:
            result = await conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname = '{rag_db_name}'"))
            exists = result.scalar()

            if not exists:
                logger.info(f"Database '{rag_db_name}' chưa tồn tại. Đang tạo mới...")
                await conn.execute(text(f"CREATE DATABASE {rag_db_name}"))
                logger.info(f"Đã tạo thành công database '{rag_db_name}'.")
            else:
                logger.info(f"Database '{rag_db_name}' đã tồn tại.")
    except Exception as e:
        logger.error(f"Lỗi khi khởi tạo database RAG: {e}")
        raise e
    finally:
        await engine_default.dispose()

    # Cài đặt pgvector
    logger.info(f"Đang kiểm tra extension 'vector' trên database '{rag_db_name}'...")
    engine_rag = create_async_engine(rag_db_url, isolation_level="AUTOCOMMIT")
    try:
        async with engine_rag.connect() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            logger.info("Đã đảm bảo extension 'vector' tồn tại trên RAG database.")
    except Exception as e:
        logger.error(f"Lỗi khi tạo extension vector: {e}")
        raise e
    finally:
        await engine_rag.dispose()


async def main() -> None:
    logger.info("Initializing service...")

    engine = create_async_engine(settings.POSTGRES_URL)
    await wait_for_db(engine)
    await engine.dispose()

    # Khởi tạo RAG database
    await init_rag_database()

    # Chạy Alembic migrations để đưa main database schema up to date
    logger.info("Running Alembic migrations for main database...")
    try:
        # Sử dụng asyncio.create_subprocess_exec thay cho subprocess.run
        process = await asyncio.create_subprocess_exec(
            "alembic", "upgrade", "head", stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            logger.error(f"Main DB Alembic migration failed: {stderr.decode().strip()}")
            raise RuntimeError(f"Main DB Alembic migration failed: {stderr.decode().strip()}")

        logger.info(f"Main DB Alembic migrations complete:\n{stdout.decode().strip()}")
    except Exception as e:
        logger.error(f"Error running Alembic: {e}")
        raise e

    logger.info("Service finished initializing")


if __name__ == "__main__":
    asyncio.run(main())
