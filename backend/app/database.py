from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from dotenv import load_dotenv
import os
import logging
import asyncio

load_dotenv()

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:password@localhost:5432/moi_wedding_db")

# Set connection timeout to 10 seconds
engine = create_async_engine(
    DATABASE_URL, 
    echo=True,
    connect_args={
        "timeout": 10,
        "server_settings": {"jit": "off"}
    }
)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db():
    try:
        async with engine.begin() as conn:
            await asyncio.wait_for(conn.run_sync(Base.metadata.create_all), timeout=30)
        logger.info("Database tables created successfully")
    except asyncio.TimeoutError:
        logger.warning("Database initialization timed out - database may already be initialized")
    except Exception as e:
        logger.error(f"Database initialization error: {e}")
        raise
