from __future__ import annotations

import uuid
from dataclasses import FrozenInstanceError

import pytest

from app.core.limits import (
    FREE_DAILY_JOBS,
    FREE_MAX_UPLOAD_BYTES,
    ANON_DAILY_JOBS,
    ANON_MAX_UPLOAD_BYTES,
    PRO_DAILY_JOBS,
    PRO_MAX_UPLOAD_BYTES,
    Limits,
    Tier,
    effective_limits,
)
from app.core.security import AuthenticatedPrincipal


def _principal() -> AuthenticatedPrincipal:
    return AuthenticatedPrincipal(
        user_id=uuid.uuid4(),
        email="a@b.c",
        role=None,
        session_id=None,
        claims={},
    )


def test_effective_limits_for_none_principal_returns_anon_tier() -> None:
    limits = effective_limits(None)
    assert limits.tier is Tier.ANON
    assert limits.max_upload_bytes == ANON_MAX_UPLOAD_BYTES
    assert limits.daily_jobs == ANON_DAILY_JOBS


def test_effective_limits_for_authenticated_returns_free_tier() -> None:
    limits = effective_limits(_principal())
    assert limits.tier is Tier.FREE
    assert limits.max_upload_bytes == FREE_MAX_UPLOAD_BYTES
    assert limits.daily_jobs == FREE_DAILY_JOBS


def test_limits_dataclass_is_frozen() -> None:
    limits = Limits(tier=Tier.ANON, max_upload_bytes=1, daily_jobs=1)
    with pytest.raises(FrozenInstanceError):
        limits.tier = Tier.FREE  # type: ignore[misc]


def test_constants_match_phase_3_spec() -> None:
    # Source of truth: docs/specs/2026-04-17-pricing-and-billing-design.md §"Final tier ladder".
    assert ANON_MAX_UPLOAD_BYTES == 10 * 1024 * 1024
    assert ANON_DAILY_JOBS == 20
    assert FREE_MAX_UPLOAD_BYTES == 25 * 1024 * 1024
    assert FREE_DAILY_JOBS == 200
    assert PRO_MAX_UPLOAD_BYTES == 100 * 1024 * 1024
    assert PRO_DAILY_JOBS == 2_000
