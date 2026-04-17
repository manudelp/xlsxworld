"""Tier resolver + numeric limits.

The resolver is the single place the rest of the code asks "how much
can this caller do?". Phase 2 resolves anon vs free; Phase 3 extends
this to pro without touching any call-site.

Source of truth for the numbers:
``docs/specs/2026-04-17-pricing-and-billing-design.md`` §"Final tier
ladder".
"""

from __future__ import annotations

import enum
from dataclasses import dataclass

from app.core.security import AuthenticatedPrincipal

ANON_MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ANON_DAILY_JOBS = 20

FREE_MAX_UPLOAD_BYTES = 25 * 1024 * 1024
FREE_DAILY_JOBS = 200

# Phase 3 will flip the resolver to return these when the user is Pro.
# They are defined here so the number lives in exactly one place.
PRO_MAX_UPLOAD_BYTES = 100 * 1024 * 1024
PRO_DAILY_JOBS = 2_000


class Tier(str, enum.Enum):
    ANON = "anon"
    FREE = "free"
    PRO = "pro"


@dataclass(frozen=True)
class Limits:
    tier: Tier
    max_upload_bytes: int
    daily_jobs: int


_ANON_LIMITS = Limits(
    tier=Tier.ANON,
    max_upload_bytes=ANON_MAX_UPLOAD_BYTES,
    daily_jobs=ANON_DAILY_JOBS,
)
_FREE_LIMITS = Limits(
    tier=Tier.FREE,
    max_upload_bytes=FREE_MAX_UPLOAD_BYTES,
    daily_jobs=FREE_DAILY_JOBS,
)
_PRO_LIMITS = Limits(
    tier=Tier.PRO,
    max_upload_bytes=PRO_MAX_UPLOAD_BYTES,
    daily_jobs=PRO_DAILY_JOBS,
)


def effective_limits(principal: AuthenticatedPrincipal | None) -> Limits:
    """Return the limits that apply to ``principal``.

    Phase 2 only knows anon vs free. Phase 3 will read a Pro entitlement
    off ``principal`` (or a companion object) and return ``_PRO_LIMITS``
    where appropriate. The call-sites don't care; they read ``.tier``,
    ``.max_upload_bytes`` and ``.daily_jobs`` off the returned
    dataclass.
    """

    if principal is None:
        return _ANON_LIMITS
    # TODO(phase-3): return _PRO_LIMITS when principal resolves as Pro.
    return _FREE_LIMITS


__all__ = [
    "ANON_DAILY_JOBS",
    "ANON_MAX_UPLOAD_BYTES",
    "FREE_DAILY_JOBS",
    "FREE_MAX_UPLOAD_BYTES",
    "PRO_DAILY_JOBS",
    "PRO_MAX_UPLOAD_BYTES",
    "Limits",
    "Tier",
    "effective_limits",
]
