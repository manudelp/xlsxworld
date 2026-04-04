from __future__ import annotations

import asyncio
import time
from typing import Any, Annotated
from uuid import UUID

import httpx
from fastapi import Depends, Header, HTTPException, status
from pydantic import BaseModel, ConfigDict, EmailStr
from jose import JWTError, jwk, jwt

from app.core.config import get_settings


class SupabaseTokenClaims(BaseModel):
    model_config = ConfigDict(extra="allow")

    sub: UUID
    email: EmailStr | None = None
    role: str | None = None
    iss: str | None = None
    aud: str | list[str] | None = None
    exp: int
    iat: int | None = None
    session_id: str | None = None


class AuthenticatedPrincipal(BaseModel):
    user_id: UUID
    email: EmailStr | None = None
    role: str | None = None
    session_id: str | None = None
    claims: dict[str, Any]


class _JwksCache:
    def __init__(self, ttl_seconds: int = 600) -> None:
        self.ttl_seconds = ttl_seconds
        self._jwks: dict[str, Any] | None = None
        self._expires_at: float = 0.0
        self._lock = asyncio.Lock()

    async def _fetch_jwks(self) -> dict[str, Any]:
        settings = get_settings()
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(settings.supabase_jwks_url)
            response.raise_for_status()
            return response.json()

    async def get_jwks(self) -> dict[str, Any]:
        now = time.monotonic()
        if self._jwks is not None and now < self._expires_at:
            return self._jwks

        async with self._lock:
            now = time.monotonic()
            if self._jwks is not None and now < self._expires_at:
                return self._jwks

            jwks = await self._fetch_jwks()
            self._jwks = jwks
            self._expires_at = now + self.ttl_seconds
            return jwks

    async def get_signing_key(self, kid: str) -> Any:
        try:
            jwks = await self.get_jwks()
        except (httpx.HTTPError, ValueError):
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Unable to verify the authentication token")
        for raw_key in jwks.get("keys", []):
            if raw_key.get("kid") == kid:
                return jwk.construct(raw_key, algorithm="ES256").to_pem().decode("utf-8")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


_jwks_cache = _JwksCache()


def get_bearer_token(authorization: Annotated[str | None, Header(alias="Authorization")] = None) -> str:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    prefix = "Bearer "
    if not authorization.startswith(prefix):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    token = authorization[len(prefix) :].strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    return token


async def get_current_user(token: str = Depends(get_bearer_token)) -> AuthenticatedPrincipal:
    return await verify_supabase_token(token)


async def verify_supabase_token(token: str) -> AuthenticatedPrincipal:
    try:
        header = jwt.get_unverified_header(token)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    if header.get("alg") != "ES256":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    kid = header.get("kid")
    if not kid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    signing_key = await _jwks_cache.get_signing_key(kid)
    settings = get_settings()

    try:
        decoded = jwt.decode(
            token,
            signing_key,
            algorithms=["ES256"],
            issuer=settings.supabase_issuer,
            options={"verify_aud": False},
        )
        claims = SupabaseTokenClaims.model_validate(decoded)
    except (JWTError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    return AuthenticatedPrincipal(
        user_id=claims.sub,
        email=claims.email,
        role=claims.role,
        session_id=claims.session_id,
        claims=claims.model_dump(mode="json"),
    )
