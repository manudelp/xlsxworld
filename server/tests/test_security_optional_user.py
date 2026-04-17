"""Tests for the get_current_user_optional dependency.

This dependency underpins the tool recording helper: it must return None for
anonymous requests (so the tool still serves them) and None for invalid
tokens (so a malformed bearer header never 401s an anonymous-capable route).
"""

from __future__ import annotations

from fastapi import HTTPException

from app.core import security
from app.core.security import (
    AuthenticatedPrincipal,
    get_current_user_optional,
)


async def test_returns_none_when_no_authorization_header() -> None:
    result = await get_current_user_optional(authorization=None)
    assert result is None


async def test_returns_none_when_header_has_no_bearer_prefix() -> None:
    result = await get_current_user_optional(authorization="Basic abc")
    assert result is None


async def test_returns_none_when_bearer_is_blank() -> None:
    result = await get_current_user_optional(authorization="Bearer    ")
    assert result is None


async def test_returns_none_when_token_verification_raises(monkeypatch) -> None:
    async def raise_401(_token: str) -> AuthenticatedPrincipal:
        raise HTTPException(status_code=401, detail="bad token")

    monkeypatch.setattr(security, "verify_supabase_token", raise_401)

    result = await get_current_user_optional(authorization="Bearer not-a-token")
    assert result is None


async def test_returns_principal_when_token_valid(monkeypatch) -> None:
    import uuid

    fake_principal = AuthenticatedPrincipal(
        user_id=uuid.uuid4(),
        email="a@b.c",
        role=None,
        session_id=None,
        claims={},
    )

    async def accept(_token: str) -> AuthenticatedPrincipal:
        return fake_principal

    monkeypatch.setattr(security, "verify_supabase_token", accept)

    result = await get_current_user_optional(authorization="Bearer valid-token")
    assert result is fake_principal
