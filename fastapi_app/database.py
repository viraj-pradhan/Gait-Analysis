"""
fastapi_app/database.py
Async MongoDB client via Motor. Provides a single db instance and
two convenience helpers for the users and jobs collections.
"""
from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.MONGODB_URI)
    return _client


def get_db():
    return get_client()[settings.DB_NAME]


def users_col():
    return get_db()["users"]


def jobs_col():
    return get_db()["jobs"]
