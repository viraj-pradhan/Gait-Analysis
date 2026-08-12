"""
fastapi_app/deps.py
FastAPI dependency: extract current user from Bearer token.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

from .auth import decode_token
from .database import users_table

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except (jwt.PyJWTError, Exception):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bad token payload")

    # Try Supabase first, fall back to local users.json
    user = None
    try:
        result = users_table().select("*").eq("email", email).limit(1).execute()
        if result.data:
            row = result.data[0]
            user = {
                "id": str(row["id"]),
                "name": row["name"],
                "email": row["email"],
                "hashed_password": row["hashed_password"],
            }
    except Exception:
        pass

    if not user:
        # Fall back to local users.json
        from .routers.auth import _get_local_users
        local_users = _get_local_users()
        for e, udata in local_users.items():
            if e.lower() == email.lower():
                user = udata
                break

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user
