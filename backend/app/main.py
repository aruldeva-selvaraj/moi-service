from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os
import logging

from app.database import init_db
from app.routers import events, moi

load_dotenv()

logger = logging.getLogger(__name__)
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:4200").split(",")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        logger.info("Initializing database...")
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Application shutting down...")


app = FastAPI(
    title="Moi Manager API",
    description="South Indian Moi (Cash Gift) Management System — supports weddings, birthdays, baby showers, and more",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router)
app.include_router(moi.router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Moi Manager API", "version": "2.0.0"}
