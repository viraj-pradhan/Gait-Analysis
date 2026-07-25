"""
fastapi_app/routers/auth.py
Register and login endpoints with MongoDB + Local JSON fallback for zero-downtime auth.
"""
from fastapi import APIRouter, HTTPException, status
from datetime import datetime, timezone
import json
from pathlib import Path

from ..models import RegisterRequest, LoginRequest, TokenResponse
from ..database import users_col
from ..auth import hash_password, verify_password, create_access_token

router = APIRouter()

SESSIONS_DIR = Path(__file__).parent.parent.parent / "sessions"
USERS_FILE = SESSIONS_DIR / "users.json"


def _get_local_users() -> dict:
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    if not USERS_FILE.exists():
        # Pre-seed clinician default user
        default_data = {
            "pradhanviraj48@gmail.com": {
                "id": "clinician_default",
                "name": "Viraj Pradhan",
                "email": "pradhanviraj48@gmail.com",
                "hashed_password": hash_password("password"),
            }
        }
        try:
            with open(USERS_FILE, "w", encoding="utf-8") as f:
                json.dump(default_data, f, indent=2)
        except Exception:
            pass
        return default_data
    try:
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _save_local_user(email: str, user_dict: dict):
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    current = _get_local_users()
    current[email] = user_dict
    try:
        with open(USERS_FILE, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=2)
    except Exception as e:
        print(f"⚠ Warning: Could not save to local users.json: {e}")


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest):
    user_doc = None

    # Try MongoDB first
    try:
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
        user_id = str(result.inserted_id)
    except HTTPException:
        raise
    except Exception as e:
        print(f"⚠ MongoDB error during register, using local storage: {e}")

    # Save locally as well
    hashed = hash_password(body.password)
    local_users = _get_local_users()
    if body.email in local_users and not user_doc:
        raise HTTPException(status_code=409, detail="Email already registered")

    user_id = user_doc.get("_id") if user_doc else f"user_{int(datetime.now().timestamp())}"
    _save_local_user(body.email, {
        "id": str(user_id),
        "name": body.name,
        "email": body.email,
        "hashed_password": hashed,
    })

    token = create_access_token({"sub": body.email})
    return TokenResponse(
        access_token=token,
        user={"id": str(user_id), "name": body.name, "email": body.email},
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    user_email = body.email.strip().lower()
    user = None

    # 1. Check local users.json first (instant response)
    local_users = _get_local_users()
    for email, udata in local_users.items():
        if email.lower() == user_email:
            user = udata
            break

    # 2. Try MongoDB if not found in local users
    if not user:
        try:
            mongo_user = await users_col().find_one({"email": user_email})
            if mongo_user:
                user = {
                    "id": str(mongo_user["_id"]),
                    "name": mongo_user.get("name", "Clinician"),
                    "email": mongo_user["email"],
                    "hashed_password": mongo_user["hashed_password"],
                }
        except Exception as e:
            print(f"⚠ MongoDB connection error during login: {e}")

    # 3. If credentials missing or invalid
    if not user or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token({"sub": user["email"]})
    return TokenResponse(
        access_token=token,
        user={"id": str(user.get("id", "user_1")), "name": user.get("name", "Clinician"), "email": user["email"]},
    )
