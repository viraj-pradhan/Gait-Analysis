"""
fastapi_app/database.py
Supabase client via supabase-py. Provides a single client instance
and convenience helpers for the users and jobs tables.
"""
from supabase import create_client, Client
from .config import settings

_client: Client | None = None


def get_supabase() -> Client:
    """Return the singleton Supabase client."""
    global _client
    if _client is None:
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    return _client


def users_table():
    """Return a reference to the users table."""
    return get_supabase().table("users")


def jobs_table():
    """Return a reference to the jobs table."""
    return get_supabase().table("jobs")
