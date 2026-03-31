from __future__ import annotations
import os
import datetime as dt
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
import psycopg

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALG = "HS256"
JWT_EXP_MIN = int(os.getenv("JWT_EXP_MIN", "60"))

DATABASE_URL = os.getenv("DATABASE_URL")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


class UserOut(BaseModel):
    id: str
    email: EmailStr
    role: str


def get_db_conn():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL not configured")
    return psycopg.connect(DATABASE_URL)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def create_access_token(sub: str, role: str) -> str:
    now = dt.datetime.utcnow()
    payload = {"sub": sub, "role": role, "iat": int(now.timestamp()), "exp": int((now + dt.timedelta(minutes=JWT_EXP_MIN)).timestamp())}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def get_user_by_email(email: str) -> Optional[dict]:
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id::text, email, role, password_hash FROM users WHERE email = %s", (email,))
            row = cur.fetchone()
            if not row:
                return None
            return {"id": row[0], "email": row[1], "role": row[2], "password_hash": row[3]}


def get_user_by_id(uid: str) -> Optional[dict]:
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id::text, email, role FROM users WHERE id = %s", (uid,))
            row = cur.fetchone()
            if not row:
                return None
            return {"id": row[0], "email": row[1], "role": row[2]}


def create_user(email: str, password: str, role: str = "user") -> dict:
    hpw = hash_password(password)
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (email, password_hash, role)
                VALUES (%s, %s, %s)
                ON CONFLICT (email) DO NOTHING
                RETURNING id::text, email, role
                """,
                (email, hpw, role),
            )
            row = cur.fetchone()
            if not row:
                u = get_user_by_email(email)
                if not u:
                    raise HTTPException(status_code=500, detail="Failed to upsert user")
                return {"id": u["id"], "email": u["email"], "role": u["role"]}
            return {"id": row[0], "email": row[1], "role": row[2]}


async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserOut:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        uid: str = payload.get("sub")
        role: str = payload.get("role")
        if uid is None or role is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = get_user_by_id(uid)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return UserOut(id=user["id"], email=user["email"], role=user["role"])  # type: ignore


def require_admin(user: UserOut = Depends(get_current_user)) -> UserOut:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user
