# Phase 2 — Limits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce per-tier daily-job and file-size limits (anon 10 MB · 20/day/IP; Free 25 MB · 200/day), show the authenticated user their usage on `/my-account` with a near-limit pill in the header, and open an upgrade modal when an anonymous user hits a limit.

**Architecture:**
- A single `effective_limits(principal)` resolver returns a `Limits` dataclass for the caller's tier. Today it resolves `anon` vs `free`; Phase 3 will extend it with `pro` without touching any call-site.
- Daily quotas are enforced through a tiny new `tool_request_counters` table (one row per `(key, day_utc)`) so the same pre-check works for anonymous (key = IP) and authenticated (key = user-id) callers, survives restarts, and is shared across workers. The same rows feed the `/api/v1/me/usage` endpoint the UI uses for display.
- File-size caps are enforced where bytes are already read — a new `read_upload_for_principal(file, principal)` wrapper around the existing `read_with_limit` picks the right cap per tier. Every tool route swaps one import and one line.
- Quota pre-check is attached **once** via `app.include_router(router, dependencies=[Depends(enforce_quota)])` in `app_factory.py` instead of 31 per-route edits.
- Anonymous limit hits return a structured `429 ANON_DAILY_QUOTA` / `413 ANON_FILE_TOO_LARGE`. The existing client `ApiRequestError` already carries `errorCode`; `api.ts` fires a window event when it sees one of those codes and a root-mounted `<UpgradeModal />` listens.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 async (asyncpg), Alembic, Next.js 15 + React 19 + Tailwind, next-intl, pytest + pytest-asyncio + httpx.AsyncClient, Jest + React Testing Library.

---

## Progress

| Task | Status | Commit |
|---|---|---|
| 1. `effective_limits` resolver + tier constants | ⏳ pending | — |
| 2. `tool_request_counters` model + migration | ⏳ pending | — |
| 3. `QuotaService` (increment + read-today) | ⏳ pending | — |
| 4. `enforce_quota` dependency + global wiring | ⏳ pending | — |
| 5. Tier-aware `read_upload_for_principal` helper | ⏳ pending | — |
| 6. Roll out helper to all tool routes | ⏳ pending | — |
| 7. `GET /api/v1/me/usage` endpoint | ⏳ pending | — |
| 8. `client/lib/usage.ts` | ⏳ pending | — |
| 9. `/my-account` quota card | ⏳ pending | — |
| 10. Header near-limit pill | ⏳ pending | — |
| 11. `UpgradeModal` + event bus + `api.ts` hook | ⏳ pending | — |
| 12. i18n keys (en/es/fr/pt) | ⏳ pending | — |

---

## Spec reference

Implements **Phase 2** of `docs/specs/2026-04-16-account-tiers-design.md`.

Phase 2 scope (from parent spec):
- Enforce file-size and daily-quota tiers.
- Show "Sign up free, keep your work, raise the limit" modal when an anonymous user hits a limit.
- Show quota usage on `/my-account` and on the header for signed-in users at > 80% use.
- Tune the placeholder numbers based on what real usage looks like after Phase 1.

**Numeric values (authoritative source: `docs/specs/2026-04-17-pricing-and-billing-design.md` §"Final tier ladder"):**

|  | Anonymous | Free | Pro (Phase 3, deferred) |
|---|---|---|---|
| File-size cap | **10 MB** | **25 MB** | 100 MB |
| Daily jobs | **20 / day / IP** | **200 / day** | 2,000 / day (soft) |

Pro numbers are encoded in `Limits` constants so Phase 3 only needs to flip the resolver.

---

## File structure

### Backend — new files

| Path | Responsibility |
|---|---|
| `server/app/core/limits.py` | `Limits` dataclass, tier constants, `effective_limits(principal)` resolver |
| `server/app/db/models/quota.py` | `ToolRequestCounter` ORM model |
| `server/alembic/versions/20260417_0002_tool_request_counters.py` | Alembic migration for the counter table |
| `server/app/services/quota_service.py` | `QuotaService` — atomic `increment_and_check` + `read_today` |
| `server/app/core/quota_guard.py` | `enforce_quota` FastAPI dependency |
| `server/app/schemas/usage.py` | Pydantic schemas for `/api/v1/me/usage` |
| `server/tests/test_limits.py` | Resolver unit tests |
| `server/tests/test_models_tool_request_counters.py` | Model smoke tests |
| `server/tests/test_quota_service.py` | Service unit tests |
| `server/tests/test_quota_guard.py` | Guard dependency tests |
| `server/tests/test_read_upload_for_principal.py` | Tier-aware upload helper tests |
| `server/tests/test_routes_me_usage.py` | `/api/v1/me/usage` integration tests |

### Backend — modified files

| Path | Why |
|---|---|
| `server/app/db/models/__init__.py` | Export `ToolRequestCounter` |
| `server/app/tools/_common.py` | Add `read_upload_for_principal`; keep `read_with_limit` for backwards-compat |
| `server/app/tools/**/*.py` (31 tool files) | One-line swap: `read_with_limit(file)` → `read_upload_for_principal(file, principal)` |
| `server/app/core/app_factory.py` | Apply `enforce_quota` globally via `dependencies=` on tool routers |
| `server/app/routes/me.py` | Add `GET /jobs/../../usage` → `GET /usage` under `/api/v1/me` |
| `server/app/routes/__init__.py` | (no change — `me_router` already registered) |

### Frontend — new files

| Path | Responsibility |
|---|---|
| `client/lib/usage.ts` | Types + `fetchUsage` |
| `client/lib/usage.test.ts` | Jest test |
| `client/components/upgrade/UpgradeModal.tsx` | Modal component |
| `client/components/upgrade/UpgradeModal.test.tsx` | RTL test |
| `client/components/upgrade/useUpgradeModal.ts` | Event bus hook (`dispatchUpgradeRequest`, `useUpgradeModal`) |
| `client/components/account/QuotaCard.tsx` | Quota card rendered on `/my-account` |
| `client/components/account/QuotaCard.test.tsx` | RTL test |
| `client/components/layout/QuotaPill.tsx` | Near-limit pill rendered in `Header` |
| `client/components/layout/QuotaPill.test.tsx` | RTL test |

### Frontend — modified files

| Path | Why |
|---|---|
| `client/lib/api.ts` | Dispatch `xlsxworld:upgrade-requested` event on known anon limit error codes |
| `client/app/[locale]/my-account/page.tsx` | Render `<QuotaCard />` above the profile form |
| `client/components/layout/Header.tsx` | Render `<QuotaPill />` when signed-in + > 80% |
| `client/app/[locale]/layout.tsx` | Mount `<UpgradeModal />` at the root so any page can trigger it |
| `client/messages/en.json`, `es.json`, `fr.json`, `pt.json` | `usage.*`, `quotaPill.*`, `upgradeModal.*` keys |

### Out of scope

- Pro tier enforcement — encoded as constants, but `effective_limits` still resolves any Pro-flagged user to `free` until Phase 3 wires the entitlement resolver.
- Stripe / billing / pricing page — Phase 3.
- Per-minute rate limits (the dead `TOOL_RATE_LIMIT = "30/minute"` constant in `rate_limit.py`) — out of scope for Phase 2; a clean-up follow-up.
- Input-size streaming beyond what `read_with_limit` already does — tool files still buffer into memory; no infra change.
- Per-tool / per-category limits — one limit per tier applies to every tool.

---

## Task 1: `effective_limits` resolver + tier constants

**Files:**
- Create: `server/app/core/limits.py`
- Create: `server/tests/test_limits.py`

The resolver is the only place that knows the numbers. Everywhere else imports `effective_limits(principal)` and reads the dataclass fields.

- [ ] **Step 1: Write the failing resolver test**

Create `server/tests/test_limits.py`:

```python
from __future__ import annotations

import uuid

import pytest

from app.core.limits import (
    FREE_DAILY_JOBS,
    FREE_MAX_UPLOAD_BYTES,
    ANON_DAILY_JOBS,
    ANON_MAX_UPLOAD_BYTES,
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
    with pytest.raises(Exception):
        limits.tier = Tier.FREE  # type: ignore[misc]


def test_constants_match_phase_3_spec() -> None:
    # Source of truth: docs/specs/2026-04-17-pricing-and-billing-design.md §"Final tier ladder".
    assert ANON_MAX_UPLOAD_BYTES == 10 * 1024 * 1024
    assert ANON_DAILY_JOBS == 20
    assert FREE_MAX_UPLOAD_BYTES == 25 * 1024 * 1024
    assert FREE_DAILY_JOBS == 200
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd server && uv run pytest tests/test_limits.py -v
```

Expected: FAIL with `ImportError: cannot import name 'effective_limits'`.

- [ ] **Step 3: Implement `app/core/limits.py`**

Create `server/app/core/limits.py`:

```python
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
```

- [ ] **Step 4: Verify the tests pass**

```bash
cd server && uv run pytest tests/test_limits.py -v
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add server/app/core/limits.py server/tests/test_limits.py
git commit -m "feat(limits): tier resolver + numeric tier constants"
```

---

## Task 2: `tool_request_counters` model + migration

**Files:**
- Create: `server/app/db/models/quota.py`
- Modify: `server/app/db/models/__init__.py`
- Create: `server/alembic/versions/20260417_0002_tool_request_counters.py`
- Create: `server/tests/test_models_tool_request_counters.py`

One row per `(key, day_utc)` — e.g. `("user:<uuid>", 2026-04-17)` or `("ip:1.2.3.4", 2026-04-17)`.

- [ ] **Step 1: Write the failing smoke test**

Create `server/tests/test_models_tool_request_counters.py`:

```python
"""Inspection-based smoke tests for ``ToolRequestCounter``.

Matches the ``test_models_tool_jobs.py`` pattern: no DB session, just
verifies the mapped class has the columns, types, and constraints the
rest of the codebase will rely on.
"""

from __future__ import annotations

from sqlalchemy import inspect

from app.db.models import ToolRequestCounter


def test_table_name() -> None:
    assert ToolRequestCounter.__tablename__ == "tool_request_counters"


def test_has_required_columns() -> None:
    cols = {c.name for c in inspect(ToolRequestCounter).columns}
    assert {"id", "key", "day_utc", "count", "created_at", "updated_at"} <= cols


def test_key_is_indexed_with_day() -> None:
    indexes = {idx.name for idx in inspect(ToolRequestCounter).tables[0].indexes}
    assert "ix_tool_request_counters_key_day" in indexes


def test_key_day_unique_constraint_exists() -> None:
    constraint_names = {
        c.name
        for c in inspect(ToolRequestCounter).tables[0].constraints
    }
    assert "uq_tool_request_counters_key_day" in constraint_names
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd server && uv run pytest tests/test_models_tool_request_counters.py -v
```

Expected: FAIL with `ImportError: cannot import name 'ToolRequestCounter'`.

- [ ] **Step 3: Create the model**

Create `server/app/db/models/quota.py`:

```python
from __future__ import annotations

from datetime import date

from sqlalchemy import Date, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models._mixins import TimestampMixin, UUIDPrimaryKeyMixin


class ToolRequestCounter(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Per-day counter of tool requests per key.

    ``key`` is a tier-prefixed identifier: ``user:<uuid>`` for
    authenticated callers, ``ip:<address>`` for anonymous ones. Using a
    single column (instead of a ``user_id`` FK + a nullable ``ip``)
    keeps the increment query tier-agnostic and the unique index
    minimal.
    """

    __tablename__ = "tool_request_counters"

    key: Mapped[str] = mapped_column(String(180), nullable=False)
    day_utc: Mapped[date] = mapped_column(Date, nullable=False)
    count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint("key", "day_utc", name="uq_tool_request_counters_key_day"),
        Index("ix_tool_request_counters_key_day", "key", "day_utc"),
    )
```

- [ ] **Step 4: Wire up the model export**

Edit `server/app/db/models/__init__.py` — add the import and `__all__` entry next to the `ToolJob` line:

```python
from app.db.models.quota import ToolRequestCounter
```

…and add `"ToolRequestCounter"` to the `__all__` list.

- [ ] **Step 5: Write the migration**

Create `server/alembic/versions/20260417_0002_tool_request_counters.py`:

```python
"""Add tool_request_counters for daily quota enforcement."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260417_0002"
down_revision = "20260417_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tool_request_counters",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("key", sa.String(length=180), nullable=False),
        sa.Column("day_utc", sa.Date(), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint(
            "key", "day_utc", name="uq_tool_request_counters_key_day"
        ),
    )
    op.create_index(
        "ix_tool_request_counters_key_day",
        "tool_request_counters",
        ["key", "day_utc"],
    )
    op.execute(
        sa.text(
            """
            CREATE TRIGGER trg_set_updated_at_tool_request_counters
            BEFORE UPDATE ON tool_request_counters
            FOR EACH ROW
            EXECUTE FUNCTION public.set_updated_at();
            """
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            "DROP TRIGGER IF EXISTS "
            "trg_set_updated_at_tool_request_counters "
            "ON tool_request_counters;"
        )
    )
    op.drop_index(
        "ix_tool_request_counters_key_day",
        table_name="tool_request_counters",
    )
    op.drop_table("tool_request_counters")
```

- [ ] **Step 6: Verify the smoke test passes**

```bash
cd server && uv run pytest tests/test_models_tool_request_counters.py -v
```

Expected: PASS (4 tests).

- [ ] **Step 7: Operator step — apply the migration to the dev database**

```bash
cd server && uv run alembic upgrade head
```

Expected: exits 0 and creates `tool_request_counters` with the unique index and the shared `set_updated_at` trigger.

- [ ] **Step 8: Commit**

```bash
git add server/app/db/models/quota.py \
        server/app/db/models/__init__.py \
        server/alembic/versions/20260417_0002_tool_request_counters.py \
        server/tests/test_models_tool_request_counters.py
git commit -m "feat(limits): tool_request_counters model + migration"
```

---

## Task 3: `QuotaService`

**Files:**
- Create: `server/app/services/quota_service.py`
- Create: `server/tests/test_quota_service.py`

The service exposes two methods:
- `increment_and_check(key, day, limit)` — atomic UPSERT that returns the post-increment count. Raises `QuotaExceededError` when the post-increment count exceeds `limit`.
- `read_today(key, day)` — returns the current count for display (no increment).

The increment uses PostgreSQL `INSERT ... ON CONFLICT (key, day_utc) DO UPDATE SET count = tool_request_counters.count + 1 RETURNING count`. This is a single round-trip and races are fine — two concurrent requests both see `count` post-increment, whoever lands the higher number gets blocked.

- [ ] **Step 1: Write the failing service test**

Create `server/tests/test_quota_service.py`:

```python
from __future__ import annotations

from datetime import date, datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.quota_service import QuotaExceededError, QuotaService


class _FakeResult:
    def __init__(self, scalar_value: int) -> None:
        self._value = scalar_value

    def scalar_one(self) -> int:
        return self._value

    def scalar_one_or_none(self) -> int | None:
        return self._value


def _db_returning(values: list[int]) -> MagicMock:
    """Async session whose ``execute`` returns the next value each call."""

    db = MagicMock()
    async def execute(_stmt, _params=None):
        return _FakeResult(values.pop(0))

    db.execute = AsyncMock(side_effect=execute)
    db.flush = AsyncMock()
    return db


@pytest.mark.asyncio
async def test_increment_and_check_allows_under_the_limit() -> None:
    db = _db_returning([5])
    service = QuotaService(db)

    count = await service.increment_and_check(
        key="user:abc", day=date(2026, 4, 17), limit=200
    )
    assert count == 5
    db.execute.assert_awaited_once()


@pytest.mark.asyncio
async def test_increment_and_check_raises_at_the_limit() -> None:
    db = _db_returning([201])
    service = QuotaService(db)

    with pytest.raises(QuotaExceededError) as excinfo:
        await service.increment_and_check(
            key="user:abc", day=date(2026, 4, 17), limit=200
        )
    assert excinfo.value.count == 201
    assert excinfo.value.limit == 200


@pytest.mark.asyncio
async def test_read_today_returns_zero_when_row_missing() -> None:
    db = MagicMock()
    async def execute(_stmt):
        return _FakeResult(None)

    db.execute = AsyncMock(side_effect=execute)
    service = QuotaService(db)

    count = await service.read_today(key="user:abc", day=date(2026, 4, 17))
    assert count == 0


@pytest.mark.asyncio
async def test_read_today_returns_stored_count() -> None:
    db = MagicMock()
    async def execute(_stmt):
        return _FakeResult(42)

    db.execute = AsyncMock(side_effect=execute)
    service = QuotaService(db)

    count = await service.read_today(key="user:abc", day=date(2026, 4, 17))
    assert count == 42


def test_today_utc_returns_date_in_utc() -> None:
    # Pins the helper to UTC regardless of the host timezone.
    from app.services.quota_service import today_utc

    assert isinstance(today_utc(), date)
    # Smoke: two calls inside the same second return the same date.
    assert today_utc() == datetime.now(timezone.utc).date()
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd server && uv run pytest tests/test_quota_service.py -v
```

Expected: FAIL with import error.

- [ ] **Step 3: Implement the service**

Create `server/app/services/quota_service.py`:

```python
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Final

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ToolRequestCounter


class QuotaServiceError(RuntimeError):
    pass


class QuotaExceededError(QuotaServiceError):
    def __init__(self, *, key: str, day: date, count: int, limit: int) -> None:
        super().__init__(
            f"quota exceeded: key={key} day={day} count={count} limit={limit}"
        )
        self.key: Final = key
        self.day: Final = day
        self.count: Final = count
        self.limit: Final = limit


def today_utc() -> date:
    """UTC date, pinned so tests (and logs) never drift with host tz."""

    return datetime.now(timezone.utc).date()


class QuotaService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def increment_and_check(
        self, *, key: str, day: date, limit: int
    ) -> int:
        """Atomically +1 the ``(key, day)`` counter and return the new count.

        Raises :class:`QuotaExceededError` when the *post-increment*
        count exceeds ``limit``. The increment is never rolled back on
        over-limit — the next request still correctly sees it above the
        ceiling. This is intentional: it keeps the happy path to a
        single round-trip and makes races self-healing.
        """

        stmt = (
            pg_insert(ToolRequestCounter)
            .values(key=key, day_utc=day, count=1)
            .on_conflict_do_update(
                constraint="uq_tool_request_counters_key_day",
                set_={"count": ToolRequestCounter.count + 1},
            )
            .returning(ToolRequestCounter.count)
        )
        result = await self._db.execute(stmt)
        count = int(result.scalar_one())
        await self._db.flush()

        if count > limit:
            raise QuotaExceededError(
                key=key, day=day, count=count, limit=limit
            )
        return count

    async def read_today(self, *, key: str, day: date) -> int:
        stmt = select(ToolRequestCounter.count).where(
            ToolRequestCounter.key == key,
            ToolRequestCounter.day_utc == day,
        )
        result = await self._db.execute(stmt)
        value = result.scalar_one_or_none()
        return int(value) if value is not None else 0


__all__ = [
    "QuotaExceededError",
    "QuotaService",
    "QuotaServiceError",
    "today_utc",
]
```

- [ ] **Step 4: Verify the tests pass**

```bash
cd server && uv run pytest tests/test_quota_service.py -v
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add server/app/services/quota_service.py server/tests/test_quota_service.py
git commit -m "feat(limits): QuotaService for atomic per-day counters"
```

---

## Task 4: `enforce_quota` dependency + global wiring

**Files:**
- Create: `server/app/core/quota_guard.py`
- Modify: `server/app/core/app_factory.py`
- Create: `server/tests/test_quota_guard.py`

One dependency, applied once at router-registration time. Resolves the right key (`user:<uuid>` when authenticated, `ip:<remote>` when anonymous), looks up the tier's `daily_jobs`, and calls `QuotaService.increment_and_check`.

On overflow it raises `HTTPException(status_code=429, detail={"detail": "...", "error_code": "ANON_DAILY_QUOTA"})` or `"FREE_DAILY_QUOTA"` — the existing `_http_exception_handler` in `app_factory.py` forwards the `error_code` to the client, so the frontend already has the structured error it needs.

- [ ] **Step 1: Write the failing guard test**

Create `server/tests/test_quota_guard.py`:

```python
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
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd server && uv run pytest tests/test_quota_guard.py -v
```

Expected: FAIL with import error.

- [ ] **Step 3: Implement the guard**

Create `server/app/core/quota_guard.py`:

```python
from __future__ import annotations

from fastapi import Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.limits import Tier, effective_limits
from app.core.security import AuthenticatedPrincipal, get_current_user_optional
from app.db.session import get_db_session
from app.services.quota_service import (
    QuotaExceededError,
    QuotaService,
    today_utc,
)


def _key_for_request(
    request: Request,
    principal: AuthenticatedPrincipal | None,
) -> str:
    if principal is not None:
        return f"user:{principal.user_id}"
    # Trust ``X-Forwarded-For`` first because every deploy target we
    # care about (Render, Vercel, Cloudflare) sits behind a proxy. We
    # take the left-most entry, which is the original client. Spoofable
    # — and per parent spec, anonymous quotas are "best-effort".
    forwarded = request.headers.get("x-forwarded-for") if hasattr(request, "headers") else None
    if forwarded:
        ip = forwarded.split(",", 1)[0].strip()
        if ip:
            return f"ip:{ip}"
    client = getattr(request, "client", None)
    host = getattr(client, "host", None) or "unknown"
    return f"ip:{host}"


async def quota_service_dep(
    db: AsyncSession = Depends(get_db_session),
) -> QuotaService:
    return QuotaService(db)


async def enforce_quota(
    request: Request,
    principal: AuthenticatedPrincipal | None = Depends(get_current_user_optional),
    quota_service: QuotaService = Depends(quota_service_dep),
) -> None:
    """Pre-check + increment the daily quota for the caller's tier.

    Attached globally on the tool routers in ``app_factory.py``; not
    intended to be used per-route.
    """

    limits = effective_limits(principal)
    key = _key_for_request(request, principal)

    try:
        await quota_service.increment_and_check(
            key=key, day=today_utc(), limit=limits.daily_jobs,
        )
    except QuotaExceededError:
        error_code = (
            "ANON_DAILY_QUOTA" if limits.tier is Tier.ANON else "FREE_DAILY_QUOTA"
        )
        message = (
            "Daily free limit reached. Sign up to raise the limit."
            if limits.tier is Tier.ANON
            else "You've reached today's Free-tier job limit."
        )
        raise HTTPException(
            status_code=429,
            detail={"detail": message, "error_code": error_code},
            headers={"Retry-After": "3600"},
        )


__all__ = ["enforce_quota", "quota_service_dep", "_key_for_request"]
```

- [ ] **Step 4: Verify the guard tests pass**

```bash
cd server && uv run pytest tests/test_quota_guard.py -v
```

Expected: PASS (7 tests).

- [ ] **Step 5: Wire the guard onto every tool router globally**

Edit `server/app/core/app_factory.py` — change the tool-router include loop. Before:

```python
    for router in tool_routers:
        app.include_router(router)
```

After:

```python
    from fastapi import Depends

    from app.core.quota_guard import enforce_quota

    for router in tool_routers:
        app.include_router(router, dependencies=[Depends(enforce_quota)])
```

(Add the imports at the top of the file with the other imports, not inside `create_app()` — the inline form above is only to keep the diff obvious. The real edit puts the two imports next to the existing `from app.core.rate_limit import ...` line, and the `dependencies=` parameter stays in-place.)

- [ ] **Step 6: Run the full backend suite to confirm nothing regressed**

```bash
cd server && uv run pytest -q
```

Expected: PASS (all pre-existing tests plus Task 1–4). No new failures. If a pre-existing tool test now tries to hit a route many times without a DB migration applied, either run `alembic upgrade head` against the test database or accept failures tied to the new dependency's DB dep; track any follow-ups in the plan before committing.

- [ ] **Step 7: Commit**

```bash
git add server/app/core/quota_guard.py \
        server/app/core/app_factory.py \
        server/tests/test_quota_guard.py
git commit -m "feat(limits): enforce_quota dependency + global tool-router wiring"
```

---

## Task 5: Tier-aware `read_upload_for_principal` helper

**Files:**
- Modify: `server/app/tools/_common.py`
- Create: `server/tests/test_read_upload_for_principal.py`

`read_with_limit(file)` today reads a hard-coded 20 MB cap. We don't remove it — callers outside of tool routes (tests, future scripts) may still want the simple form. We add a thin wrapper that picks the cap off `effective_limits(principal)` and raises a structured 413 when the upload is too big.

- [ ] **Step 1: Write the failing helper test**

Create `server/tests/test_read_upload_for_principal.py`:

```python
from __future__ import annotations

import io
import uuid

import pytest
from fastapi import HTTPException
from fastapi import UploadFile

from app.core.limits import ANON_MAX_UPLOAD_BYTES, FREE_MAX_UPLOAD_BYTES
from app.core.security import AuthenticatedPrincipal
from app.tools._common import read_upload_for_principal


def _upload(content: bytes) -> UploadFile:
    return UploadFile(filename="input.xlsx", file=io.BytesIO(content))


def _principal() -> AuthenticatedPrincipal:
    return AuthenticatedPrincipal(
        user_id=uuid.uuid4(), email="a@b.c", role=None, session_id=None, claims={},
    )


@pytest.mark.asyncio
async def test_anon_under_anon_cap_passes() -> None:
    data = b"x" * (ANON_MAX_UPLOAD_BYTES - 1)
    out = await read_upload_for_principal(_upload(data), principal=None)
    assert out == data


@pytest.mark.asyncio
async def test_anon_over_anon_cap_raises_413_with_anon_code() -> None:
    data = b"x" * (ANON_MAX_UPLOAD_BYTES + 1)
    with pytest.raises(HTTPException) as excinfo:
        await read_upload_for_principal(_upload(data), principal=None)
    assert excinfo.value.status_code == 413
    assert isinstance(excinfo.value.detail, dict)
    assert excinfo.value.detail["error_code"] == "ANON_FILE_TOO_LARGE"


@pytest.mark.asyncio
async def test_free_under_free_cap_passes() -> None:
    data = b"x" * (ANON_MAX_UPLOAD_BYTES + 1)  # beyond anon, under free
    out = await read_upload_for_principal(_upload(data), principal=_principal())
    assert out == data


@pytest.mark.asyncio
async def test_free_over_free_cap_raises_413_with_free_code() -> None:
    # Reading a FREE_MAX_UPLOAD_BYTES + 1 payload in-memory would allocate
    # 25 MB in this test. That's acceptable but feel free to switch to
    # chunked reads if perf ever matters — the cap check happens on the
    # accumulator, so a partial tail chunk still trips the limit.
    data = b"x" * (FREE_MAX_UPLOAD_BYTES + 1)
    with pytest.raises(HTTPException) as excinfo:
        await read_upload_for_principal(_upload(data), principal=_principal())
    assert excinfo.value.status_code == 413
    assert excinfo.value.detail["error_code"] == "FREE_FILE_TOO_LARGE"
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd server && uv run pytest tests/test_read_upload_for_principal.py -v
```

Expected: FAIL — `read_upload_for_principal` does not exist.

- [ ] **Step 3: Implement the helper**

Edit `server/app/tools/_common.py` — add imports near the top and append the function. Add these imports (next to the existing `from fastapi import HTTPException, Response, UploadFile`):

```python
from app.core.limits import Tier, effective_limits
from app.core.security import AuthenticatedPrincipal
```

Then, at the end of the file (after `file_response`), append:

```python
async def read_upload_for_principal(
    file: UploadFile,
    *,
    principal: AuthenticatedPrincipal | None,
) -> bytes:
    """Tier-aware version of :func:`read_with_limit`.

    Uses the caller's per-tier file-size cap and raises a structured
    ``413`` with ``error_code = 'ANON_FILE_TOO_LARGE'`` or
    ``'FREE_FILE_TOO_LARGE'`` so the client can open the upgrade modal
    (anon) or show the upgrade nudge (free).
    """

    limits = effective_limits(principal)
    try:
        return await read_with_limit(file, max_bytes=limits.max_upload_bytes)
    except HTTPException as exc:
        # ``read_with_limit`` raises ``HTTPException(status_code=400,
        # detail="File too large")`` — remap to 413 with a tier code so
        # the client can react specifically.
        if exc.status_code != 400:
            raise
        error_code = (
            "ANON_FILE_TOO_LARGE"
            if limits.tier is Tier.ANON
            else "FREE_FILE_TOO_LARGE"
        )
        raise HTTPException(
            status_code=413,
            detail={
                "detail": "File too large for your tier.",
                "error_code": error_code,
            },
        ) from exc
```

- [ ] **Step 4: Verify the tests pass**

```bash
cd server && uv run pytest tests/test_read_upload_for_principal.py -v
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add server/app/tools/_common.py \
        server/tests/test_read_upload_for_principal.py
git commit -m "feat(limits): tier-aware read_upload_for_principal helper"
```

---

## Task 6: Roll out the tier-aware helper to all tool routes

**Files touched (31):** one-line swap in every file under `server/app/tools/` that calls `read_with_limit(file)`. Reference list (same grep Task 5 validated against):

- `clean/find_replace.py`, `clean/normalize_case.py`, `clean/remove_duplicates.py`, `clean/remove_empty_rows.py`, `clean/trim_spaces.py`
- `convert/csv_to_xlsx.py`, `convert/xlsx_to_csv.py`, `convert/xlsx_to_csv_zip.py`, `convert/json_to_xlsx.py`, `convert/xlsx_to_json.py`, `convert/xml_to_xlsx.py`, `convert/xlsx_to_xml.py`, `convert/sql_to_xlsx.py`, `convert/xlsx_to_sql.py`, `convert/xlsx_to_pdf.py`
- `merge/append_workbooks.py`, `merge/merge_sheets.py`, `split/split_sheet.py`, `split/split_workbook.py`
- `analyze/compare_workbooks.py`, `analyze/scan_formula_errors.py`, `analyze/summary_stats.py`
- `format/auto_size_columns.py`, `format/freeze_header.py`
- `data/sort_rows.py`, `data/split_column.py`, `data/transpose_sheet.py`
- `validate/detect_blanks.py`, `validate/validate_emails.py`
- `security/password_protect.py`, `security/remove_password.py`
- `inspect/preview.py`

All of these already accept `principal: AuthenticatedPrincipal | None = Depends(get_current_user_optional)` (Phase 1). The edit is mechanical.

- [ ] **Step 1: Write a parametrized regression test exercising the swap**

Create `server/tests/test_tool_upload_limits_parametrized.py`:

```python
"""Parametrized integration coverage for Phase 2 file-size limits.

One minimal happy-path test per tool is already covered elsewhere
(Phase 1 recording tests). This suite only asserts the tier-aware
size cap actually rejects over-limit anonymous uploads with the
structured 413 the client expects. We don't exhaustively exercise
every tool — a representative sample from each folder is enough to
catch "someone forgot to swap the helper" regressions.
"""

from __future__ import annotations

import io
from dataclasses import dataclass

import openpyxl
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.app_factory import create_app
from app.core.limits import ANON_MAX_UPLOAD_BYTES


def _oversize_xlsx_bytes() -> bytes:
    # Simplest way to land above the anon cap: wrap garbage in a file
    # roughly ANON_MAX_UPLOAD_BYTES + 1 KB large. The endpoint should
    # reject on size before ever parsing the content.
    return b"x" * (ANON_MAX_UPLOAD_BYTES + 1024)


@dataclass(frozen=True)
class _Endpoint:
    path: str
    extra_data: dict[str, str]


# Cheap sample — one from each category.
_CASES = [
    _Endpoint("/trim-spaces", {"all_sheets": "true"}),
    _Endpoint("/csv-to-xlsx", {}),
    _Endpoint("/append-workbooks", {}),
    _Endpoint("/compare-workbooks", {}),
    _Endpoint("/freeze-header", {"rows": "1"}),
    _Endpoint("/sort-rows", {"sheet": "Sheet1", "columns": "A"}),
    _Endpoint("/detect-blanks", {}),
    _Endpoint("/password-protect", {"password": "hunter2"}),
]


@pytest.mark.asyncio
@pytest.mark.parametrize("case", _CASES, ids=lambda c: c.path)
async def test_anon_over_size_cap_returns_413_with_anon_code(case) -> None:
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("big.xlsx", _oversize_xlsx_bytes(),
                          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        response = await client.post(case.path, files=files, data=case.extra_data)
    assert response.status_code == 413
    body = response.json()
    assert body["error_code"] == "ANON_FILE_TOO_LARGE"
```

- [ ] **Step 2: Run the parametrized test — expect failures across the board**

```bash
cd server && uv run pytest tests/test_tool_upload_limits_parametrized.py -v
```

Expected: every case FAILs with 400 "File too large" (the old path) until Step 3–5 complete the rollout.

- [ ] **Step 3: Apply the mechanical swap to each file**

For every file listed above:

1. Remove `read_with_limit` from the `from app.tools._common import (...)` block.
2. Add `read_upload_for_principal` to the same block.
3. Change the one call-site from `raw = await read_with_limit(file)` to `raw = await read_upload_for_principal(file, principal=principal)`.

**Representative diff** (`server/app/tools/clean/trim_spaces.py`):

Before:

```python
from app.tools._common import check_excel_file, has_visual_elements, read_with_limit
...
    raw = await read_with_limit(file)
```

After:

```python
from app.tools._common import (
    check_excel_file,
    has_visual_elements,
    read_upload_for_principal,
)
...
    raw = await read_upload_for_principal(file, principal=principal)
```

Two files need extra care because they read multiple uploads or use a non-standard call:

- **`merge/append_workbooks.py`** — reads `files: list[UploadFile]` with a per-file loop. Swap each `read_with_limit(f)` call to `read_upload_for_principal(f, principal=principal)`. The cap is per-file, not aggregate, matching Phase 1 behavior.
- **`analyze/compare_workbooks.py`** — reads two uploads (`file_a` and `file_b`) back-to-back. Swap both.

Sanity check with ripgrep after the batch:

```bash
rg "read_with_limit\(" server/app/tools/ -n
```

Expected: zero results (only the definition in `server/app/tools/_common.py` should remain, which is fine).

- [ ] **Step 4: Verify the parametrized test passes**

```bash
cd server && uv run pytest tests/test_tool_upload_limits_parametrized.py -v
```

Expected: PASS (8 cases).

- [ ] **Step 5: Run the full backend suite to catch unintended blast radius**

```bash
cd server && uv run pytest -q
```

Expected: PASS (all pre-existing tests still green; no new failures).

- [ ] **Step 6: Commit**

```bash
git add server/app/tools/ server/tests/test_tool_upload_limits_parametrized.py
git commit -m "feat(limits): tier-aware upload caps across all tool routes"
```

---

## Task 7: `GET /api/v1/me/usage` endpoint

**Files:**
- Create: `server/app/schemas/usage.py`
- Modify: `server/app/routes/me.py`
- Create: `server/tests/test_routes_me_usage.py`

Read-only endpoint for the `/my-account` UI and the header pill. Returns today's count, the tier's `daily_jobs` cap, the file-size cap, and a plan label.

- [ ] **Step 1: Define the schemas**

Create `server/app/schemas/usage.py`:

```python
from __future__ import annotations

from pydantic import BaseModel


class UsageResponse(BaseModel):
    plan: str  # 'anon' | 'free' | 'pro'  (anon will never hit this endpoint in practice)
    jobs_today: int
    jobs_today_limit: int
    jobs_percent: float  # 0..100, for progress bars
    max_upload_bytes: int
```

- [ ] **Step 2: Write failing route tests**

Create `server/tests/test_routes_me_usage.py`:

```python
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.app_factory import create_app
from app.core.limits import FREE_DAILY_JOBS, FREE_MAX_UPLOAD_BYTES
from app.core.quota_guard import quota_service_dep
from app.core.security import (
    AuthenticatedPrincipal,
    get_current_user,
    get_current_user_optional,
)


def _principal() -> AuthenticatedPrincipal:
    return AuthenticatedPrincipal(
        user_id=uuid.uuid4(), email="a@b.c", role=None, session_id=None, claims={},
    )


@pytest.mark.asyncio
async def test_usage_returns_current_tier_numbers() -> None:
    app = create_app()
    principal = _principal()

    async def fake_optional() -> AuthenticatedPrincipal:
        return principal

    async def fake_required() -> AuthenticatedPrincipal:
        return principal

    fake_service = AsyncMock()
    fake_service.read_today = AsyncMock(return_value=42)
    # The counter is also incremented by ``enforce_quota`` on every
    # tool call — but this endpoint is NOT a tool route, so the guard
    # isn't invoked here. We still override the factory just in case a
    # future test mounts the guard on ``/me`` too.

    app.dependency_overrides[get_current_user] = fake_required
    app.dependency_overrides[get_current_user_optional] = fake_optional
    app.dependency_overrides[quota_service_dep] = lambda: fake_service

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/me/usage")

    assert response.status_code == 200
    body = response.json()
    assert body["plan"] == "free"
    assert body["jobs_today"] == 42
    assert body["jobs_today_limit"] == FREE_DAILY_JOBS
    assert body["max_upload_bytes"] == FREE_MAX_UPLOAD_BYTES
    # jobs_percent rounded to one decimal, within [0, 100].
    assert 0 <= body["jobs_percent"] <= 100


@pytest.mark.asyncio
async def test_usage_requires_authentication() -> None:
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/me/usage")
    assert response.status_code == 401
```

- [ ] **Step 3: Run the failing tests**

```bash
cd server && uv run pytest tests/test_routes_me_usage.py -v
```

Expected: FAIL — route not mounted yet.

- [ ] **Step 4: Implement the route**

Edit `server/app/routes/me.py`. Add imports near the top (alongside existing imports):

```python
from app.core.limits import effective_limits
from app.core.quota_guard import quota_service_dep
from app.schemas.usage import UsageResponse
from app.services.quota_service import QuotaService, today_utc
```

Append the route at the bottom of the file (after the existing handlers):

```python
@router.get("/usage", response_model=UsageResponse)
async def get_usage(
    principal: AuthenticatedPrincipal = Depends(get_current_user),
    quota_service: QuotaService = Depends(quota_service_dep),
) -> UsageResponse:
    limits = effective_limits(principal)
    count = await quota_service.read_today(
        key=f"user:{principal.user_id}", day=today_utc()
    )
    percent = (
        round((count / limits.daily_jobs) * 100, 1)
        if limits.daily_jobs
        else 0.0
    )
    return UsageResponse(
        plan=limits.tier.value,
        jobs_today=count,
        jobs_today_limit=limits.daily_jobs,
        jobs_percent=min(percent, 100.0),
        max_upload_bytes=limits.max_upload_bytes,
    )
```

- [ ] **Step 5: Verify the route tests pass**

```bash
cd server && uv run pytest tests/test_routes_me_usage.py -v
```

Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add server/app/schemas/usage.py \
        server/app/routes/me.py \
        server/tests/test_routes_me_usage.py
git commit -m "feat(limits): GET /api/v1/me/usage"
```

---

## Task 8: Frontend — `client/lib/usage.ts`

**Files:**
- Create: `client/lib/usage.ts`
- Create: `client/lib/usage.test.ts`

- [ ] **Step 1: Failing test**

Create `client/lib/usage.test.ts`:

```typescript
import { fetchUsage } from "./usage";

jest.mock("@/lib/api", () => ({
  api: {
    auth: {
      get: jest.fn(),
    },
  },
}));

const { api } = jest.requireMock("@/lib/api") as {
  api: { auth: { get: jest.Mock } };
};

describe("usage lib", () => {
  beforeEach(() => {
    api.auth.get.mockReset();
  });

  it("fetchUsage hits /api/v1/me/usage and returns the payload", async () => {
    api.auth.get.mockResolvedValue({
      plan: "free",
      jobs_today: 17,
      jobs_today_limit: 200,
      jobs_percent: 8.5,
      max_upload_bytes: 26214400,
    });

    const usage = await fetchUsage();

    expect(api.auth.get).toHaveBeenCalledWith("/api/v1/me/usage");
    expect(usage.plan).toBe("free");
    expect(usage.jobs_today).toBe(17);
    expect(usage.max_upload_bytes).toBe(26214400);
  });
});
```

- [ ] **Step 2: Run it (it fails — module missing)**

```bash
cd client && npm test -- usage.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `client/lib/usage.ts`**

```typescript
import { api } from "@/lib/api";

export interface Usage {
  plan: "anon" | "free" | "pro";
  jobs_today: number;
  jobs_today_limit: number;
  jobs_percent: number;
  max_upload_bytes: number;
}

export function fetchUsage(): Promise<Usage> {
  return api.auth.get<Usage>("/api/v1/me/usage");
}
```

- [ ] **Step 4: Verify the test passes**

```bash
cd client && npm test -- usage.test.ts
```

Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add client/lib/usage.ts client/lib/usage.test.ts
git commit -m "feat(client): usage lib (fetch + types)"
```

---

## Task 9: Frontend — `/my-account` quota card

**Files:**
- Create: `client/components/account/QuotaCard.tsx`
- Create: `client/components/account/QuotaCard.test.tsx`
- Modify: `client/app/[locale]/my-account/page.tsx`

Small card with a progress bar and `{jobs_today} / {jobs_today_limit}` jobs today, rendered above the profile form.

- [ ] **Step 1: Failing component test**

Create `client/components/account/QuotaCard.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";

import QuotaCard from "./QuotaCard";

jest.mock("@/lib/usage", () => ({
  fetchUsage: jest.fn(),
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const { fetchUsage } = jest.requireMock("@/lib/usage");

describe("QuotaCard", () => {
  beforeEach(() => {
    fetchUsage.mockReset();
  });

  it("renders count and limit from the server", async () => {
    fetchUsage.mockResolvedValue({
      plan: "free",
      jobs_today: 17,
      jobs_today_limit: 200,
      jobs_percent: 8.5,
      max_upload_bytes: 26214400,
    });

    render(<QuotaCard />);

    await waitFor(() => {
      expect(screen.getByText(/17/)).toBeInTheDocument();
      expect(screen.getByText(/200/)).toBeInTheDocument();
    });
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "8.5");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("renders nothing when the fetch fails (silently)", async () => {
    fetchUsage.mockRejectedValue(new Error("boom"));
    const { container } = render(<QuotaCard />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
cd client && npm test -- QuotaCard.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement the component**

Create `client/components/account/QuotaCard.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { fetchUsage, type Usage } from "@/lib/usage";

export default function QuotaCard() {
  const t = useTranslations("account.usage");
  const [usage, setUsage] = useState<Usage | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchUsage()
      .then((u) => {
        if (!cancelled) setUsage(u);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed || !usage) return null;

  return (
    <section
      className="rounded-2xl border p-6 shadow-sm"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface-2)",
      }}
    >
      <div className="flex items-baseline justify-between">
        <div
          className="text-xs uppercase tracking-[0.16em]"
          style={{ color: "var(--muted)" }}
        >
          {t("title")}
        </div>
        <div
          className="text-xs"
          style={{ color: "var(--muted)" }}
        >
          {t("planLabel", { plan: usage.plan })}
        </div>
      </div>

      <div
        className="mt-2 text-2xl font-semibold"
        style={{ color: "var(--foreground)" }}
      >
        {usage.jobs_today}
        <span
          className="ml-1 text-base font-normal"
          style={{ color: "var(--muted)" }}
        >
          / {usage.jobs_today_limit} {t("jobsToday")}
        </span>
      </div>

      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--surface)" }}
      >
        <div
          role="progressbar"
          aria-valuenow={usage.jobs_percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("progressLabel")}
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(usage.jobs_percent, 100)}%`,
            backgroundColor:
              usage.jobs_percent >= 80
                ? "var(--danger)"
                : "var(--primary)",
          }}
        />
      </div>

      <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
        {t("sizeCap", {
          mb: Math.round(usage.max_upload_bytes / (1024 * 1024)),
        })}
      </p>
    </section>
  );
}
```

- [ ] **Step 4: Mount the card on `/my-account`**

Edit `client/app/[locale]/my-account/page.tsx` — import `QuotaCard` near the other imports:

```tsx
import QuotaCard from "@/components/account/QuotaCard";
```

…then render it inside the `<div className="space-y-6">` wrapper, immediately **after** the title block and **before** the existing `<section>` with the profile form:

```tsx
        <QuotaCard />

        <section
          className="rounded-2xl border p-6 shadow-sm"
```

- [ ] **Step 5: Verify the component test passes**

```bash
cd client && npm test -- QuotaCard.test.tsx
```

Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add client/components/account/QuotaCard.tsx \
        client/components/account/QuotaCard.test.tsx \
        client/app/[locale]/my-account/page.tsx
git commit -m "feat(client): /my-account quota card"
```

---

## Task 10: Frontend — header near-limit pill

**Files:**
- Create: `client/components/layout/QuotaPill.tsx`
- Create: `client/components/layout/QuotaPill.test.tsx`
- Modify: `client/components/layout/Header.tsx`

Pill only renders when the signed-in user is > 80% through the daily quota. Tooltip says "{n}/{limit} jobs today" and links to `/my-account`.

- [ ] **Step 1: Failing component test**

Create `client/components/layout/QuotaPill.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";

import QuotaPill from "./QuotaPill";

jest.mock("@/lib/usage", () => ({
  fetchUsage: jest.fn(),
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values
      ? `${key}:${JSON.stringify(values)}`
      : key,
}));

const { fetchUsage } = jest.requireMock("@/lib/usage");

describe("QuotaPill", () => {
  beforeEach(() => {
    fetchUsage.mockReset();
  });

  it("renders nothing under 80%", async () => {
    fetchUsage.mockResolvedValue({
      plan: "free",
      jobs_today: 100,
      jobs_today_limit: 200,
      jobs_percent: 50,
      max_upload_bytes: 26214400,
    });
    const { container } = render(<QuotaPill />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("renders the pill at or above 80%", async () => {
    fetchUsage.mockResolvedValue({
      plan: "free",
      jobs_today: 180,
      jobs_today_limit: 200,
      jobs_percent: 90,
      max_upload_bytes: 26214400,
    });
    render(<QuotaPill />);
    await waitFor(() => {
      expect(screen.getByRole("link")).toBeInTheDocument();
    });
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/my-account",
    );
  });

  it("renders nothing on fetch failure", async () => {
    fetchUsage.mockRejectedValue(new Error("boom"));
    const { container } = render(<QuotaPill />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
cd client && npm test -- QuotaPill.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement the pill**

Create `client/components/layout/QuotaPill.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { fetchUsage, type Usage } from "@/lib/usage";

const NEAR_LIMIT_THRESHOLD = 80;

export default function QuotaPill() {
  const t = useTranslations("quotaPill");
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchUsage()
      .then((u) => {
        if (!cancelled) setUsage(u);
      })
      .catch(() => {
        // Silent: pill is purely advisory.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!usage || usage.jobs_percent < NEAR_LIMIT_THRESHOLD) return null;

  return (
    <a
      href="/my-account"
      title={t("tooltip", {
        n: usage.jobs_today,
        limit: usage.jobs_today_limit,
      })}
      className="rounded-full border px-2.5 py-1 text-xs font-medium"
      style={{
        borderColor: "var(--danger)",
        color: "var(--danger)",
        backgroundColor: "var(--surface-2)",
      }}
    >
      {t("label", {
        n: usage.jobs_today,
        limit: usage.jobs_today_limit,
      })}
    </a>
  );
}
```

- [ ] **Step 4: Mount the pill in the header**

Edit `client/components/layout/Header.tsx` — import `QuotaPill` at the top:

```tsx
import QuotaPill from "@/components/layout/QuotaPill";
```

…then render `<QuotaPill />` inside the authenticated nav block, immediately **before** the "History" link (Phase 1 added it there). The conditional auth check the header already has (rendering when signed in) keeps this cheap: `QuotaPill` only fetches when it's actually mounted.

- [ ] **Step 5: Verify the pill test passes**

```bash
cd client && npm test -- QuotaPill.test.tsx
```

Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add client/components/layout/QuotaPill.tsx \
        client/components/layout/QuotaPill.test.tsx \
        client/components/layout/Header.tsx
git commit -m "feat(client): header near-limit quota pill"
```

---

## Task 11: Upgrade modal + event bus + `api.ts` hook

**Files:**
- Create: `client/components/upgrade/useUpgradeModal.ts`
- Create: `client/components/upgrade/UpgradeModal.tsx`
- Create: `client/components/upgrade/UpgradeModal.test.tsx`
- Modify: `client/lib/api.ts`
- Modify: `client/app/[locale]/layout.tsx`

Approach: `api.ts` inspects every `ApiRequestError` it's about to throw. When `errorCode` is one of `ANON_DAILY_QUOTA | ANON_FILE_TOO_LARGE`, it `dispatchEvent`s a `xlsxworld:upgrade-requested` CustomEvent. A single root-mounted `<UpgradeModal />` listens and opens. This avoids touching the 30+ tool pages.

- [ ] **Step 1: Implement the event bus + hook (no tests yet)**

Create `client/components/upgrade/useUpgradeModal.ts`:

```typescript
"use client";

import { useEffect, useState } from "react";

export type UpgradeReason =
  | "ANON_DAILY_QUOTA"
  | "ANON_FILE_TOO_LARGE";

const EVENT_NAME = "xlsxworld:upgrade-requested";

export interface UpgradeRequestDetail {
  reason: UpgradeReason;
  message?: string;
}

export function dispatchUpgradeRequest(detail: UpgradeRequestDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<UpgradeRequestDetail>(EVENT_NAME, { detail }));
}

export function useUpgradeModal() {
  const [request, setRequest] = useState<UpgradeRequestDetail | null>(null);

  useEffect(() => {
    function onRequest(event: Event) {
      const detail = (event as CustomEvent<UpgradeRequestDetail>).detail;
      if (detail && detail.reason) {
        setRequest(detail);
      }
    }
    window.addEventListener(EVENT_NAME, onRequest);
    return () => window.removeEventListener(EVENT_NAME, onRequest);
  }, []);

  return {
    request,
    close: () => setRequest(null),
  };
}

export const UPGRADE_REQUEST_EVENT = EVENT_NAME;
```

- [ ] **Step 2: Failing modal test**

Create `client/components/upgrade/UpgradeModal.test.tsx`:

```tsx
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import UpgradeModal from "./UpgradeModal";
import { dispatchUpgradeRequest } from "./useUpgradeModal";

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("UpgradeModal", () => {
  it("opens when an upgrade-requested event fires", () => {
    render(<UpgradeModal />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    act(() => {
      dispatchUpgradeRequest({ reason: "ANON_DAILY_QUOTA" });
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("title")).toBeInTheDocument();
  });

  it("closes when the close button is clicked", async () => {
    const user = userEvent.setup();
    render(<UpgradeModal />);
    act(() => {
      dispatchUpgradeRequest({ reason: "ANON_FILE_TOO_LARGE" });
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run it (fails — component missing)**

```bash
cd client && npm test -- UpgradeModal.test.tsx
```

Expected: FAIL.

- [ ] **Step 4: Implement the modal**

Create `client/components/upgrade/UpgradeModal.tsx`:

```tsx
"use client";

import { useTranslations } from "next-intl";

import { useUpgradeModal } from "./useUpgradeModal";

export default function UpgradeModal() {
  const t = useTranslations("upgradeModal");
  const { request, close } = useUpgradeModal();

  if (!request) return null;

  const titleKey =
    request.reason === "ANON_FILE_TOO_LARGE" ? "sizeTitle" : "title";
  const bodyKey =
    request.reason === "ANON_FILE_TOO_LARGE" ? "sizeBody" : "body";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div
        className="w-full max-w-md rounded-2xl border p-6 shadow-lg"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface)",
        }}
      >
        <h2
          id="upgrade-modal-title"
          className="text-lg font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          {t(titleKey)}
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          {t(bodyKey)}
        </p>
        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={close}
            aria-label={t("dismiss")}
            className="rounded-md border px-3 py-1.5 text-sm font-medium hover:opacity-80"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--surface-2)",
              color: "var(--foreground)",
            }}
          >
            {t("dismiss")}
          </button>
          <a
            href="/signup"
            onClick={close}
            className="rounded-md px-3 py-1.5 text-sm font-semibold"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            {t("signUp")}
          </a>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Wire the event dispatch into `api.ts`**

Edit `client/lib/api.ts`. Near the top of the file (just after the imports / before `ApiRequestError`), add:

```typescript
const ANON_LIMIT_ERROR_CODES = new Set([
  "ANON_DAILY_QUOTA",
  "ANON_FILE_TOO_LARGE",
]);

function maybeDispatchUpgrade(errorCode: string | undefined, message: string): void {
  if (typeof window === "undefined") return;
  if (!errorCode || !ANON_LIMIT_ERROR_CODES.has(errorCode)) return;
  window.dispatchEvent(
    new CustomEvent("xlsxworld:upgrade-requested", {
      detail: { reason: errorCode, message },
    }),
  );
}
```

…then edit the two error-throwing sites to dispatch the event immediately before throwing. Locate both `throw new ApiRequestError(detail, res.status, errorCode);` in the file (one inside `handle<T>` and one inside `postFormForFile`) and prepend a call:

```typescript
  if (!res.ok) {
    const { detail, errorCode } = await extractError(res);
    maybeDispatchUpgrade(errorCode, detail);
    throw new ApiRequestError(detail, res.status, errorCode);
  }
```

Do this exactly twice — once in `handle<T>` and once in `postFormForFile`. No other call-sites throw `ApiRequestError`.

- [ ] **Step 6: Mount the modal globally**

Edit `client/app/[locale]/layout.tsx`. Import the modal near the top:

```tsx
import UpgradeModal from "@/components/upgrade/UpgradeModal";
```

…then render `<UpgradeModal />` as a sibling of the page content, inside the top-level wrapper returned by the layout (after `{children}` is fine — it's fixed-position so source order doesn't affect layout).

- [ ] **Step 7: Verify the modal test passes**

```bash
cd client && npm test -- UpgradeModal.test.tsx
```

Expected: PASS (2 tests).

- [ ] **Step 8: Run the full client test suite to catch collateral damage from the `api.ts` edit**

```bash
cd client && npm test
```

Expected: all green.

- [ ] **Step 9: Commit**

```bash
git add client/components/upgrade \
        client/lib/api.ts \
        client/app/[locale]/layout.tsx
git commit -m "feat(client): upgrade modal + event-bus hook on anon limit errors"
```

---

## Task 12: i18n keys (en/es/fr/pt)

**Files:**
- Modify: `client/messages/en.json`, `es.json`, `fr.json`, `pt.json`

Three new blocks, consistent across locales: `account.usage.*`, `quotaPill.*`, `upgradeModal.*`.

- [ ] **Step 1: Add keys to `client/messages/en.json`**

Add inside the `account` block, alongside the existing `history` sub-block:

```jsonc
"usage": {
  "title": "Today's usage",
  "planLabel": "{plan} plan",
  "jobsToday": "jobs today",
  "progressLabel": "Daily job usage",
  "sizeCap": "Max file size: {mb} MB"
}
```

Add at the top level of the file:

```jsonc
"quotaPill": {
  "label": "{n}/{limit} today",
  "tooltip": "You've used {n} of your {limit} daily jobs"
},
"upgradeModal": {
  "title": "Daily limit reached",
  "body": "You've hit today's free anonymous limit. Sign up free to keep your work and raise the limit.",
  "sizeTitle": "File too large",
  "sizeBody": "This file exceeds the anonymous size limit. Sign up free to process larger files.",
  "signUp": "Sign up free",
  "dismiss": "Dismiss"
}
```

- [ ] **Step 2: Add the same keys to `es.json`**

```jsonc
"usage": {
  "title": "Uso de hoy",
  "planLabel": "Plan {plan}",
  "jobsToday": "trabajos hoy",
  "progressLabel": "Uso diario de trabajos",
  "sizeCap": "Tamaño máx. de archivo: {mb} MB"
}
```

```jsonc
"quotaPill": {
  "label": "{n}/{limit} hoy",
  "tooltip": "Has usado {n} de tus {limit} trabajos diarios"
},
"upgradeModal": {
  "title": "Límite diario alcanzado",
  "body": "Alcanzaste el límite anónimo gratuito de hoy. Regístrate gratis para conservar tu trabajo y aumentar el límite.",
  "sizeTitle": "Archivo demasiado grande",
  "sizeBody": "Este archivo supera el límite anónimo. Regístrate gratis para procesar archivos más grandes.",
  "signUp": "Registrarse gratis",
  "dismiss": "Cerrar"
}
```

- [ ] **Step 3: Add the same keys to `fr.json`**

```jsonc
"usage": {
  "title": "Utilisation du jour",
  "planLabel": "Plan {plan}",
  "jobsToday": "jobs aujourd'hui",
  "progressLabel": "Utilisation quotidienne",
  "sizeCap": "Taille max. du fichier : {mb} Mo"
}
```

```jsonc
"quotaPill": {
  "label": "{n}/{limit} aujourd'hui",
  "tooltip": "Vous avez utilisé {n} de vos {limit} jobs quotidiens"
},
"upgradeModal": {
  "title": "Limite quotidienne atteinte",
  "body": "Vous avez atteint la limite anonyme gratuite du jour. Inscrivez-vous gratuitement pour garder votre travail et augmenter la limite.",
  "sizeTitle": "Fichier trop volumineux",
  "sizeBody": "Ce fichier dépasse la limite anonyme. Inscrivez-vous gratuitement pour traiter des fichiers plus volumineux.",
  "signUp": "Inscription gratuite",
  "dismiss": "Fermer"
}
```

- [ ] **Step 4: Add the same keys to `pt.json`**

```jsonc
"usage": {
  "title": "Uso de hoje",
  "planLabel": "Plano {plan}",
  "jobsToday": "trabalhos hoje",
  "progressLabel": "Uso diário de trabalhos",
  "sizeCap": "Tamanho máx. do arquivo: {mb} MB"
}
```

```jsonc
"quotaPill": {
  "label": "{n}/{limit} hoje",
  "tooltip": "Você usou {n} dos seus {limit} trabalhos diários"
},
"upgradeModal": {
  "title": "Limite diário atingido",
  "body": "Você atingiu o limite anônimo gratuito de hoje. Cadastre-se grátis para manter seu trabalho e aumentar o limite.",
  "sizeTitle": "Arquivo muito grande",
  "sizeBody": "Este arquivo excede o limite anônimo. Cadastre-se grátis para processar arquivos maiores.",
  "signUp": "Cadastre-se grátis",
  "dismiss": "Fechar"
}
```

- [ ] **Step 5: Verify JSON validity + client build**

```bash
cd client && node -e "['en','es','fr','pt'].forEach(l => { JSON.parse(require('fs').readFileSync('messages/'+l+'.json','utf8')); console.log(l+' ok'); })"
cd client && npm run type-check && npm run lint && npm run build
```

Expected: four "ok" lines; type-check / lint / build all pass.

- [ ] **Step 6: Commit**

```bash
git add client/messages
git commit -m "i18n(limits): usage + quota pill + upgrade modal (en/es/fr/pt)"
```

---

## Operator step (after Task 2 and Task 4 ship)

```bash
cd server && uv run alembic upgrade head
```

Applies the `20260417_0002_tool_request_counters` migration to whichever database your `DATABASE_URL` points at. Document the target (dev vs prod) in the commit message, matching the Phase 1 convention.

---

## Self-review

- **Spec coverage:**
  - "Enforce file-size and daily-quota tiers" → Tasks 1 (numbers), 3 (counter service), 4 (quota guard), 5–6 (file-size enforcement rollout) ✓
  - "Sign up free, keep your work, raise the limit" modal on anon limit hits → Task 11 ✓
  - "Show quota usage on `/my-account`" → Task 9 (card) ✓
  - "Show quota usage on the global header for signed-in users when they're > 80% used" → Task 10 (pill, hidden below 80%) ✓
  - "Tune placeholder numbers" → numbers live in one file (`app/core/limits.py`); changing them is a one-line edit ✓
  - i18n → Task 12 covers all new strings in en/es/fr/pt ✓

- **Placeholder scan:** no "TBD"/"TODO"/"implement later" in any task body. Only one `TODO(phase-3)` comment in Task 1's code block — it documents the extension point for the future Pro branch of `effective_limits`, not a skipped step in this plan.

- **Type consistency:** `Limits` (Task 1) has three fields — `tier`, `max_upload_bytes`, `daily_jobs` — and every later task reads them unchanged. `QuotaService.increment_and_check(key, day, limit)` (Task 3) matches the `enforce_quota` call (Task 4) one-to-one. `ToolRequestCounter` has columns `key`, `day_utc`, `count`, `created_at`, `updated_at`; the service, the guard, and `/me/usage` use only these. `UsageResponse` (Task 7) has five fields; `client/lib/usage.ts` (Task 8) mirrors all five with matching types. The event `xlsxworld:upgrade-requested` and its `detail: { reason, message }` shape match between Tasks 11 step 1 and Task 11 step 5's `api.ts` dispatch.

- **Numbers are the Phase 3 spec's numbers**, not the parent spec's placeholders. Task 1's `test_constants_match_phase_3_spec` makes this check explicit so any future edit that drifts is caught by `pytest`.

- **One intentional limitation:** the Free daily quota counter is a monotonically incrementing per-day row. A Free user who hits 200 job attempts (including failures) is blocked for the rest of the day. This is consistent with anonymous semantics and cheap to reason about; if we later decide failures shouldn't count, the fix is a one-liner in `enforce_quota` (skip the increment on failure) but is deliberately not in this plan's scope.
