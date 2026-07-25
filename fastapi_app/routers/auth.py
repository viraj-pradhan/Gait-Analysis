"""
fastapi_app/routers/auth.py
Register and login endpoints.
"""
from fastapi import APIRouter, HTTPException, status
from datetime import datetime, timezone

from ..models import RegisterRequest, LoginRequest, TokenResponse
from ..database import users_col
from ..auth import hash_password, verify_password, create_access_token

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest):
    existing = await users_col().find_one({"email": body.email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user_doc = {
        "name": body.name,
        "email": body.email,
        "hashed_password": hash_password(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await users_col().insert_one(user_doc)

    token = create_access_token({"sub": body.email})
    return TokenResponse(
        access_token=token,
        user={"id": str(result.inserted_id), "name": body.name, "email": body.email},
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    user = await users_col().find_one({"email": body.email})
    if not user or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token({"sub": body.email})
    return TokenResponse(
        access_token=token,
        user={"id": str(user["_id"]), "name": user["name"], "email": user["email"]},
    )
