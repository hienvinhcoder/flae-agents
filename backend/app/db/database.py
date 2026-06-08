from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from redis.asyncio import Redis
from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)

# SQLAlchemy engine setup
engine = create_async_engine(settings.POSTGRES_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)

# Redis setup
redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)

async def get_db():
    """Dependency to get the database session"""
    async with AsyncSessionLocal() as session:
        yield session

def setup_database():
    """
    Initialize database components.
    Since we are using async SQLAlchemy, the engine is already created globally.
    Redis connection is also managed lazily.
    """
    from app.db.rag_db import rag_db_manager
    try:
        rag_db_manager.initialize()
    except Exception as e:
        logger.warning(
            f"⚠️ Không thể khởi tạo RAG database tại startup (có thể DB chưa sẵn sàng hoặc thiếu extension vector): {e}"
        )

