from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import create_engine

from app.core.config import settings

async_engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

sync_engine = create_engine(settings.DATABASE_SYNC_URL, pool_pre_ping=True)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
