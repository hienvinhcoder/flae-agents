from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from redis.asyncio import Redis
from app.core.config import settings

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
    pass
