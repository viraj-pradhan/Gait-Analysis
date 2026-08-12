"""
fastapi_app/routers/auth.py
Register and login endpoints with Supabase + Local JSON fallback for zero-downtime auth.
"""
from fastapi import APIRouter, HTTPException, status
from datetime import datetime, timezone
import json
from pathlib import Path

from ..models import RegisterRequest, LoginRequest, TokenResponse
from ..database import users_table
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
    user_id = None

    # Try Supabase first
    try:
        existing = users_table().select("id").eq("email", body.email).limit(1).execute()
        if existing.data:
            raise HTTPException(status_code=409, detail="Email already registered")

        hashed = hash_password(body.password)
        result = users_table().insert({
            "name": body.name,
            "email": body.email,
            "hashed_password": hashed,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
        if result.data:
            user_id = str(result.data[0]["id"])
    except HTTPException:
        raise
    except Exception as e:
        print(f"⚠ Supabase error during register, using local storage: {e}")

    # Save locally as well
    hashed = hash_password(body.password)
    local_users = _get_local_users()
    if body.email in local_users and not user_id:
        raise HTTPException(status_code=409, detail="Email already registered")

    if not user_id:
        user_id = f"user_{int(datetime.now().timestamp())}"

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

    # 1. Check Supabase first
    try:
        result = users_table().select("*").eq("email", user_email).limit(1).execute()
        if result.data:
            row = result.data[0]
            if verify_password(body.password, row["hashed_password"]):
                user = {
                    "id": str(row["id"]),
                    "name": row.get("name", "Clinician"),
                    "email": row["email"],
                }
    except Exception as e:
        print(f"⚠ Supabase connection error during login: {e}")

    # 2. Check local users.json fallback if Supabase check didn't authenticate
    if not user:
        local_users = _get_local_users()
        for email, udata in local_users.items():
            if email.lower() == user_email and verify_password(body.password, udata["hashed_password"]):
                user = {
                    "id": str(udata.get("id", "user_local")),
                    "name": udata.get("name", "Clinician"),
                    "email": udata["email"],
                }
                break

    # 3. If credentials missing or invalid in both
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token({"sub": user["email"]})
    return TokenResponse(
        access_token=token,
        user={"id": str(user["id"]), "name": user["name"], "email": user["email"]},
    )
