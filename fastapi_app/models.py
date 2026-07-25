"""
fastapi_app/models.py
Pydantic request / response models for the API.
"""
from typing import Optional, Dict, Any
from pydantic import BaseModel, EmailStr


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


# ── Jobs ──────────────────────────────────────────────────────────────────────

class JobOut(BaseModel):
    job_id: str
    status: str          # queued | processing | done | error
    filename: str
    created_at: str
    finished_at: Optional[str] = None
    report: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
