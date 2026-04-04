from __future__ import annotations

import time
from types import SimpleNamespace
from uuid import uuid4

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import HTTPException
from jose import jwt

from app.core import security


def _generate_ec_keypair() -> tuple[str, str]:
    private_key = ec.generate_private_key(ec.SECP256R1())
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("utf-8")
    return private_pem, public_pem


@pytest.mark.asyncio
async def test_verify_supabase_token_valid_es256(monkeypatch: pytest.MonkeyPatch):
    private_pem, public_pem = _generate_ec_keypair()
    user_id = uuid4()
    issuer = "https://example.supabase.co/auth/v1"

    async def fake_get_signing_key(kid: str) -> str:
        assert kid == "test-kid"
        return public_pem

    monkeypatch.setattr(security._jwks_cache, "get_signing_key", fake_get_signing_key)
    monkeypatch.setattr(
        security,
        "get_settings",
        lambda: SimpleNamespace(supabase_issuer=issuer),
    )

    token = jwt.encode(
        {
            "sub": str(user_id),
            "email": "valid@example.com",
            "role": "member",
            "iss": issuer,
            "exp": int(time.time()) + 3600,
        },
        private_pem,
        algorithm="ES256",
        headers={"kid": "test-kid"},
    )

    principal = await security.verify_supabase_token(token)
    assert principal.user_id == user_id
    assert str(principal.email) == "valid@example.com"


@pytest.mark.asyncio
async def test_verify_supabase_token_malformed_returns_401():
    with pytest.raises(HTTPException) as exc:
        await security.verify_supabase_token("not-a-jwt")
    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid token"


@pytest.mark.asyncio
async def test_verify_supabase_token_expired_returns_401(monkeypatch: pytest.MonkeyPatch):
    private_pem, public_pem = _generate_ec_keypair()
    issuer = "https://example.supabase.co/auth/v1"

    async def fake_get_signing_key(_kid: str) -> str:
        return public_pem

    monkeypatch.setattr(security._jwks_cache, "get_signing_key", fake_get_signing_key)
    monkeypatch.setattr(
        security,
        "get_settings",
        lambda: SimpleNamespace(supabase_issuer=issuer),
    )

    expired_token = jwt.encode(
        {
            "sub": str(uuid4()),
            "email": "expired@example.com",
            "role": "member",
            "iss": issuer,
            "exp": int(time.time()) - 10,
        },
        private_pem,
        algorithm="ES256",
        headers={"kid": "expired-kid"},
    )

    with pytest.raises(HTTPException) as exc:
        await security.verify_supabase_token(expired_token)
    assert exc.value.status_code == 401
    assert exc.value.detail == "Invalid token"
