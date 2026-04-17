from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.core.quota_guard import _key_for_request, enforce_quota
from app.core.security import AuthenticatedPrincipal


class _FakeRequest:
    def __init__(self, client_host: str = "1.2.3.4") -> None:
        self.client = type("C", (), {"host": client_host})()
        self.headers = {}


def _principal() -> AuthenticatedPrincipal:
    return AuthenticatedPrincipal(
        user_id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
        email="a@b.c",
        role=None,
        session_id=None,
        claims={},
    )


def test_key_for_authenticated_principal_uses_user_prefix() -> None:
    assert (
        _key_for_request(_FakeRequest(), _principal())
        == "user:11111111-1111-1111-1111-111111111111"
    )


def test_key_for_anonymous_uses_ip_prefix() -> None:
    assert _key_for_request(_FakeRequest("9.9.9.9"), None) == "ip:9.9.9.9"


def test_key_for_anonymous_respects_x_forwarded_for() -> None:
    req = _FakeRequest()
    req.headers = {"x-forwarded-for": "5.5.5.5, 10.0.0.1"}
    assert _key_for_request(req, None) == "ip:5.5.5.5"


@pytest.mark.asyncio
async def test_enforce_quota_anon_under_limit_passes() -> None:
    service = MagicMock()
    service.increment_and_check = AsyncMock(return_value=5)

    await enforce_quota(
        request=_FakeRequest(),
        principal=None,
        quota_service=service,
    )
    service.increment_and_check.assert_awaited_once()
    kwargs = service.increment_and_check.call_args.kwargs
    assert kwargs["key"] == "ip:1.2.3.4"
    assert kwargs["limit"] == 20


@pytest.mark.asyncio
async def test_enforce_quota_free_under_limit_passes() -> None:
    service = MagicMock()
    service.increment_and_check = AsyncMock(return_value=17)

    await enforce_quota(
        request=_FakeRequest(),
        principal=_principal(),
        quota_service=service,
    )
    kwargs = service.increment_and_check.call_args.kwargs
    assert kwargs["key"].startswith("user:")
    assert kwargs["limit"] == 200


@pytest.mark.asyncio
async def test_enforce_quota_anon_over_limit_raises_429_with_code() -> None:
    from app.services.quota_service import QuotaExceededError

    service = MagicMock()
    service.increment_and_check = AsyncMock(
        side_effect=QuotaExceededError(
            key="ip:1.2.3.4",
            day=__import__("datetime").date(2026, 4, 17),
            count=21,
            limit=20,
        )
    )

    with pytest.raises(HTTPException) as excinfo:
        await enforce_quota(
            request=_FakeRequest(),
            principal=None,
            quota_service=service,
        )
    assert excinfo.value.status_code == 429
    assert isinstance(excinfo.value.detail, dict)
    assert excinfo.value.detail["error_code"] == "ANON_DAILY_QUOTA"


@pytest.mark.asyncio
async def test_enforce_quota_free_over_limit_raises_with_free_code() -> None:
    from app.services.quota_service import QuotaExceededError

    service = MagicMock()
    service.increment_and_check = AsyncMock(
        side_effect=QuotaExceededError(
            key="user:x", day=__import__("datetime").date(2026, 4, 17),
            count=201, limit=200,
        )
    )

    with pytest.raises(HTTPException) as excinfo:
        await enforce_quota(
            request=_FakeRequest(),
            principal=_principal(),
            quota_service=service,
        )
    assert excinfo.value.status_code == 429
    assert excinfo.value.detail["error_code"] == "FREE_DAILY_QUOTA"
