# Phase 1 — History Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Authenticated users get a 7-day history of their tool jobs with re-download via signed URLs, accessible at `/my-account/history`. Anonymous behavior is unchanged.

**Architecture:**
- New `tool_jobs` table records every authenticated job; output bytes are uploaded to a private Supabase Storage bucket and the DB row holds the storage path + expiry.
- Tool routes adopt an optional-auth dependency and a helper `record_and_respond(...)` that wraps the existing `file_response(...)` — for anonymous calls the helper is a no-op pass-through.
- A new `/me/jobs` REST surface (list, signed-download, delete) powers the `/my-account/history` page in the frontend.
- A scheduled cleanup task hard-deletes expired storage objects (Supabase Storage retention isn't tier-aware, so we drive expiry from our DB).

**Tech Stack:** FastAPI, SQLAlchemy 2.0 async (asyncpg), Alembic, Supabase Storage (REST via `httpx`), Next.js 15 + React 19 + Tailwind, next-intl, pytest + pytest-asyncio + httpx.AsyncClient, Jest + React Testing Library.

---

## Progress

| Task | Status | Commit |
|---|---|---|
| 1. `tool_jobs` model + migration | ✅ done | `f794e33` |
| 2. Storage service | ✅ done | `332235c` |
| 3. Optional-auth dependency | ✅ done | `77e1134` |
| 4. JobsService | ✅ done | `c5a7d90` |
| 5. `record_and_respond` helper + `trim-spaces` integration | ✅ done | `fe0cff6` |
| 6. `/me/jobs` API | ✅ done | `f879478` |
| 7. Cleanup CLI | ✅ done | `5521141` |
| 8. `client/lib/jobs.ts` | ✅ done | `6edb283` |
| 9. `/my-account/history` page | ✅ done | `2dfe187` |
| 10. Header + my-account link | ✅ done | `ebf84a2` |
| 11. i18n keys (en/es/fr/pt) | ✅ done | `db9dec3` |
| 12. Instrument remaining tools | 🔄 in progress (per-category batches) | see sub-table below |

### Task 12 sub-progress (rollout by category)

| Batch | Tools | Status | Commit |
|---|---|---|---|
| 1. `clean/` | find-replace, normalize-case, remove-duplicates, remove-empty-rows (trim-spaces already done in Task 5) | ✅ done | `a9716dc` |
| 2. `convert/` | csv-to-xlsx, xlsx-to-csv, xlsx-to-csv-zip, json-to-xlsx, xlsx-to-json, xml-to-xlsx, xlsx-to-xml, sql-to-xlsx, xlsx-to-sql, xlsx-to-pdf | ✅ done | `f33783c` |
| 3. `merge/` + `split/` | append-workbooks, merge-sheets, split-sheet, split-workbook | ✅ done | `e3738cb` |
| 4. `analyze/` + `format/` | compare-workbooks, scan-formula-errors, summary-stats, auto-size-columns, freeze-header | ✅ done | `3f06166` |
| 5. `data/` + `validate/` + `security/` | sort-rows, split-column, transpose-sheet, detect-blanks, validate-emails, password-protect, remove-password | ✅ done | _pending_ |
| 6. `inspect/` (special — returns JSON, not files) | `page_sheet` (GET), `preview` (POST) — both return JSON metadata, never call `file_response`, so **no wiring needed** in current shape. Revisit only if/when an `inspect/export-*` endpoint is added that returns a downloadable artifact. | ✅ n/a | — |

**Operator step:** `uv run alembic upgrade head` — applied to the dev database on 2026-04-17 (revision `20260417_0001`). Note: `alembic/env.py` was updated in the same batch to use `settings.async_database_pool_url` when present, because Supabase Free-tier direct hostnames (`db.<project>.supabase.co`) are IPv6-only and unreachable from IPv4-only networks. The running app already uses the pooler; alembic now follows suit and also passes `prepared_statement_cache_size=0` to match.

---

## Spec reference

Implements **Phase 1** of `docs/specs/2026-04-16-account-tiers-design.md`.

Phase 1 scope (from spec):
- New `tool_jobs` table; `user_id` nullable (we keep anon nullable for forward compatibility but only authenticated tool runs write rows in phase 1).
- Authenticated tool runs upload outputs to Supabase Storage with a 7-day signed URL.
- New page `/my-account/history`: list, re-download, hard-delete.
- Anonymous behavior unchanged: direct stream, no Storage write, no history list.
- No new file-size or daily-quota limits in this phase (those are phase 2).

---

## File structure

### Backend — new files

| Path | Responsibility |
|---|---|
| `server/app/db/models/jobs.py` | `ToolJob` ORM model |
| `server/alembic/versions/20260417_0001_tool_jobs.py` | Alembic migration: create `tool_jobs` |
| `server/app/services/storage_service.py` | Thin `httpx` wrapper around Supabase Storage REST (upload, signed URL, delete) |
| `server/app/services/jobs_service.py` | `JobsService` — business layer over `ToolJob` + `StorageService` |
| `server/app/schemas/jobs.py` | Pydantic schemas for the `/me/jobs` API |
| `server/app/routes/me.py` | `/api/v1/me/jobs` endpoints (list, download, delete) |
| `server/app/tools/_recording.py` | `record_and_respond()` helper + `optional_user` dependency |
| `server/app/cli/cleanup_expired_jobs.py` | One-shot script for cron / scheduled job |
| `server/tests/test_jobs_service.py` | Service unit tests |
| `server/tests/test_routes_me_jobs.py` | API integration tests |
| `server/tests/test_recording_helper.py` | Helper + optional-auth tests |

### Backend — modified files

| Path | Why |
|---|---|
| `server/app/db/models/__init__.py` | Export `ToolJob` |
| `server/app/db/models/users.py` | Add `tool_jobs` relationship |
| `server/app/core/config.py` | Add `supabase_storage_bucket` setting (defaults to `tool-outputs`) |
| `server/app/core/security.py` | Add `get_current_user_optional` dependency |
| `server/app/routes/__init__.py` | Register `me_router` |
| `server/app/tools/clean/trim_spaces.py` | First tool wired through `record_and_respond()` (proof of pattern) |
| `server/app/tools/__init__.py` | No change in phase 1 (tool registration unchanged) |
| `server/.env.example` (re-add) | Document `SUPABASE_STORAGE_BUCKET` |

### Frontend — new files

| Path | Responsibility |
|---|---|
| `client/lib/jobs.ts` | Types + `fetchJobs`, `deleteJob`, `getJobDownloadUrl` |
| `client/app/[locale]/my-account/history/page.tsx` | Server entry point — renders `<HistoryClient />` |
| `client/app/[locale]/my-account/history/HistoryClient.tsx` | Client list with search/filter, re-download, delete confirm |
| `client/lib/jobs.test.ts` | Client lib tests |
| `client/app/[locale]/my-account/history/HistoryClient.test.tsx` | RTL tests |

### Frontend — modified files

| Path | Why |
|---|---|
| `client/app/[locale]/my-account/page.tsx` | Add "View history →" link card |
| `client/components/layout/Header.tsx` | Add "History" link when signed in |
| `client/messages/en.json`, `es.json`, `fr.json`, `pt.json` | Add `account.history.*` keys |

### Out of scope for this plan
- Instrumenting the remaining 31 tools. Tracked as a follow-up in **Task 12** (deferred to its own PR per category).
- Limit enforcement (phase 2).
- Stripe / Pro features (phase 3).
- "Re-run with different settings" / input retention (phase 3 Pro feature).

---

## Operator setup (one-time, before Task 2 ships)

These are not code; they're Supabase project configuration the operator must do once. Document them in the Task 2 commit message.

1. In the Supabase project dashboard → **Storage** → **Create bucket**:
   - Name: `tool-outputs`
   - Public: **off** (private)
   - File size limit: 50 MB (Supabase Free tier cap; comfortably above our 20 MB input cap in `app/tools/_common.py`). If we ever raise the input cap or add a Pro benefit that exceeds ~40 MB outputs, we'll need to upgrade the Supabase plan first.
2. Add env vars (already present): `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (the `service_role` key — required for signed URL generation and uploads).
3. Add new env var: `SUPABASE_STORAGE_BUCKET=tool-outputs`.
4. Add to `client/.env.local` (no new client var needed — downloads go through the API).

**Status:** bucket `tool-outputs` created in Supabase (50 MB cap, private).

---

## Task 1: Database model and migration for `tool_jobs` — ✅ COMPLETED (commit `f794e33`)

> **Implementation note:** The existing test suite has no real test-DB fixtures. Rather than build that harness up-front, we adopted an inspection-based smoke test (no DB session) that matches the project's existing style. Schema correctness is validated by running `alembic upgrade head` against the dev database (see operator setup below). All subsequent DB-touching tasks will follow the same pattern until/unless we choose to add a fixture-based harness in a dedicated task.

**Files:**
- Create: `server/app/db/models/jobs.py`
- Create: `server/alembic/versions/20260417_0001_tool_jobs.py`
- Modify: `server/app/db/models/__init__.py`
- Modify: `server/app/db/models/users.py` (add relationship)
- Test: `server/tests/test_models_tool_jobs.py` (new file)

- [x] **Step 1: Write the failing model test** *(replaced with inspection-based smoke tests, 6 cases, no DB)*

Create `server/tests/test_models_tool_jobs.py`:

```python
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AppUser, ToolJob


@pytest.mark.asyncio
async def test_tool_job_persists_with_required_fields(db_session: AsyncSession) -> None:
    user = AppUser(
        id=uuid.uuid4(),
        email=f"{uuid.uuid4()}@example.com",
    )
    db_session.add(user)
    await db_session.flush()

    job = ToolJob(
        user_id=user.id,
        tool_slug="trim-spaces",
        tool_name="Trim Spaces",
        original_filename="input.xlsx",
        output_filename="trim-spaces.xlsx",
        storage_path=f"{user.id}/{uuid.uuid4()}.xlsx",
        mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        output_size_bytes=1024,
        success=True,
        duration_ms=42,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db_session.add(job)
    await db_session.flush()

    assert job.id is not None
    assert job.created_at is not None
    assert job.error_type is None
```

- [x] **Step 2: Run the test to verify it fails**

```bash
cd server && uv run pytest tests/test_models_tool_jobs.py -v
```

Expected: FAIL with `ImportError: cannot import name 'ToolJob'`.

- [x] **Step 3: Create the model**

Create `server/app/db/models/jobs.py`:

```python
from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models._mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.db.models.users import AppUser


class ToolJob(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "tool_jobs"

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    tool_slug: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    tool_name: Mapped[str] = mapped_column(String(180), nullable=False)
    original_filename: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_filename: Mapped[str] = mapped_column(Text, nullable=False)
    storage_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    mime_type: Mapped[str] = mapped_column(String(180), nullable=False)
    output_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    error_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    user: Mapped["AppUser | None"] = relationship(back_populates="tool_jobs")

    __table_args__ = (
        Index("ix_tool_jobs_user_created_at", "user_id", "created_at"),
    )
```

- [x] **Step 4: Wire up the model exports**

Edit `server/app/db/models/__init__.py`:

```python
from app.db.models.analytics import MetricDataPoint, MetricEvent, UserActivityDaily
from app.db.models.billing import BillingInvoice, SubscriptionPlan, UserSubscription
from app.db.models.jobs import ToolJob
from app.db.models.users import AppUser

__all__ = [
    "AppUser",
    "MetricEvent",
    "UserActivityDaily",
    "MetricDataPoint",
    "SubscriptionPlan",
    "UserSubscription",
    "BillingInvoice",
    "ToolJob",
]
```

Edit `server/app/db/models/users.py` — add a relationship next to the others (around line 71):

```python
    tool_jobs: Mapped[list["ToolJob"]] = relationship(back_populates="user")
```

…and add to the `TYPE_CHECKING` block:

```python
    from app.db.models.jobs import ToolJob
```

- [x] **Step 5: Write the migration**

Create `server/alembic/versions/20260417_0001_tool_jobs.py`:

```python
"""Add tool_jobs table for user job history."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260417_0001"
down_revision = "20260404_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tool_jobs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("tool_slug", sa.String(length=120), nullable=False),
        sa.Column("tool_name", sa.String(length=180), nullable=False),
        sa.Column("original_filename", sa.Text(), nullable=True),
        sa.Column("output_filename", sa.Text(), nullable=False),
        sa.Column("storage_path", sa.Text(), nullable=True),
        sa.Column("mime_type", sa.String(length=180), nullable=False),
        sa.Column("output_size_bytes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("success", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("error_type", sa.String(length=120), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
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
    )
    op.create_index("ix_tool_jobs_user_id", "tool_jobs", ["user_id"])
    op.create_index("ix_tool_jobs_tool_slug", "tool_jobs", ["tool_slug"])
    op.create_index("ix_tool_jobs_expires_at", "tool_jobs", ["expires_at"])
    op.create_index(
        "ix_tool_jobs_user_created_at", "tool_jobs", ["user_id", "created_at"]
    )

    op.execute(
        sa.text(
            """
            CREATE TRIGGER trg_set_updated_at_tool_jobs
            BEFORE UPDATE ON tool_jobs
            FOR EACH ROW
            EXECUTE FUNCTION public.set_updated_at();
            """
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text("DROP TRIGGER IF EXISTS trg_set_updated_at_tool_jobs ON tool_jobs;")
    )
    op.drop_index("ix_tool_jobs_user_created_at", table_name="tool_jobs")
    op.drop_index("ix_tool_jobs_expires_at", table_name="tool_jobs")
    op.drop_index("ix_tool_jobs_tool_slug", table_name="tool_jobs")
    op.drop_index("ix_tool_jobs_user_id", table_name="tool_jobs")
    op.drop_table("tool_jobs")
```

- [ ] **Step 6: Apply the migration on the dev database** *(deferred — operator to run)*

```bash
cd server && uv run alembic upgrade head
```

Expected: exits 0 and creates the `tool_jobs` table with its indexes and `updated_at` trigger. Re-run `pytest tests/test_models_tool_jobs.py -v` afterwards as a smoke check.

- [x] **Step 7: Commit** *(done: `f794e33 feat(jobs): tool_jobs model + migration`)*

---

## Task 2: Storage service (Supabase Storage REST) — ✅ COMPLETED (commit `332235c`)

> **Implementation note:** Tests use a `FakeAsyncClient` that replaces `httpx.AsyncClient` instead of the nested `AsyncMock(...)` pattern originally planned — clearer intent, fewer magic-method quirks. Shipped 7 tests (added a 404-tolerance case for idempotent cleanup) rather than the 4 originally planned.

**Files:**
- Create: `server/app/services/storage_service.py`
- Create: `server/tests/test_storage_service.py`
- Modify: `server/app/core/config.py`
- Modify: `server/.env.example` (re-create the file we deleted earlier; document the new var)

The storage service speaks to Supabase Storage via raw HTTP (matching the auth_service pattern, no extra dependency). All methods are async; all I/O goes through `httpx.AsyncClient`.

- [x] **Step 1: Add the bucket name setting**

Edit `server/app/core/config.py` — add a field next to the other Supabase fields:

```python
    supabase_storage_bucket: str = Field(default="tool-outputs", alias="SUPABASE_STORAGE_BUCKET")
```

…and a property near `supabase_jwks_url`:

```python
    @property
    def supabase_storage_url(self) -> str:
        if not self.supabase_url:
            raise RuntimeError("SUPABASE_URL is not configured")
        return self.supabase_url.rstrip("/") + "/storage/v1"
```

- [x] **Step 2: Re-create `.env.example`**

Create `server/.env.example` (overwrite if present). Use the contents from before plus the new var:

```dotenv
# --- Application ---
APP_ENV=development

# --- Database (Supabase Postgres) ---
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/xlsxworld
DATABASE_POOL_URL=postgresql://postgres:postgres@localhost:5432/xlsxworld

# --- Supabase Auth ---
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
SUPABASE_SECRET_KEY=your_service_role_key_here

# --- Supabase Storage (Phase 1: history) ---
SUPABASE_STORAGE_BUCKET=tool-outputs

# --- CORS ---
CORS_ORIGINS=http://localhost:3000
```

(If the previous `.env.example` had additional values that were intentionally removed, the operator should reconcile during review. Mention that in the commit message.)

- [x] **Step 3: Write the failing storage service test** *(replaced with FakeAsyncClient-based tests, 7 cases)*

Create `server/tests/test_storage_service.py`:

```python
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.services.storage_service import (
    StorageService,
    StorageServiceError,
)


@pytest.mark.asyncio
async def test_upload_returns_storage_path() -> None:
    service = StorageService()
    fake_response = AsyncMock(status_code=200)
    fake_response.raise_for_status = lambda: None
    fake_response.json = lambda: {"Key": "tool-outputs/abc/file.xlsx"}

    with patch("app.services.storage_service.httpx.AsyncClient") as client_cls:
        client = client_cls.return_value.__aenter__.return_value
        client.post = AsyncMock(return_value=fake_response)

        path = await service.upload(
            object_path="abc/file.xlsx",
            content=b"x",
            mime_type="application/octet-stream",
        )

    assert path == "abc/file.xlsx"


@pytest.mark.asyncio
async def test_upload_raises_on_non_2xx() -> None:
    service = StorageService()
    fake_response = AsyncMock(status_code=500, text="boom")

    def raise_for_status() -> None:
        import httpx

        raise httpx.HTTPStatusError("boom", request=None, response=None)

    fake_response.raise_for_status = raise_for_status

    with patch("app.services.storage_service.httpx.AsyncClient") as client_cls:
        client = client_cls.return_value.__aenter__.return_value
        client.post = AsyncMock(return_value=fake_response)

        with pytest.raises(StorageServiceError):
            await service.upload(
                object_path="x", content=b"x", mime_type="application/octet-stream"
            )


@pytest.mark.asyncio
async def test_create_signed_url_returns_full_url() -> None:
    service = StorageService()
    fake_response = AsyncMock(status_code=200)
    fake_response.raise_for_status = lambda: None
    fake_response.json = lambda: {"signedURL": "/storage/v1/object/sign/tool-outputs/abc?token=t"}

    with patch("app.services.storage_service.httpx.AsyncClient") as client_cls:
        client = client_cls.return_value.__aenter__.return_value
        client.post = AsyncMock(return_value=fake_response)

        url = await service.create_signed_url("abc", expires_in_seconds=60)

    assert url.endswith("/storage/v1/object/sign/tool-outputs/abc?token=t")


@pytest.mark.asyncio
async def test_delete_calls_remove_endpoint() -> None:
    service = StorageService()
    fake_response = AsyncMock(status_code=200)
    fake_response.raise_for_status = lambda: None

    with patch("app.services.storage_service.httpx.AsyncClient") as client_cls:
        client = client_cls.return_value.__aenter__.return_value
        client.request = AsyncMock(return_value=fake_response)

        await service.delete("abc/file.xlsx")

    client.request.assert_awaited_once()
    args, kwargs = client.request.call_args
    assert args[0] == "DELETE"
    assert "abc/file.xlsx" in str(args[1])
```

- [x] **Step 4: Run the failing tests**

```bash
cd server && uv run pytest tests/test_storage_service.py -v
```

Expected: FAIL with import error.

- [x] **Step 5: Implement the storage service**

Create `server/app/services/storage_service.py`:

```python
from __future__ import annotations

from typing import Any

import httpx

from app.core.config import get_settings


class StorageServiceError(RuntimeError):
    pass


class StorageService:
    """Thin async client for the Supabase Storage REST API.

    All methods require SUPABASE_SECRET_KEY (service-role) so they can write
    and create signed URLs against private buckets.
    """

    def __init__(self) -> None:
        settings = get_settings()
        if not settings.supabase_secret_key:
            raise StorageServiceError("SUPABASE_SECRET_KEY is not configured")
        self._base_url = settings.supabase_storage_url
        self._bucket = settings.supabase_storage_bucket
        self._headers = {
            "apikey": settings.supabase_secret_key,
            "authorization": f"Bearer {settings.supabase_secret_key}",
        }
        self._public_root = settings.supabase_url.rstrip("/")  # type: ignore[union-attr]

    async def upload(
        self,
        *,
        object_path: str,
        content: bytes,
        mime_type: str,
    ) -> str:
        """Upload bytes to `<bucket>/<object_path>`. Returns the object path on success."""

        url = f"{self._base_url}/object/{self._bucket}/{object_path}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                content=content,
                headers={
                    **self._headers,
                    "content-type": mime_type,
                    "x-upsert": "true",
                },
            )
            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise StorageServiceError(
                    f"Storage upload failed ({response.status_code}): {response.text[:200]}"
                ) from exc
        return object_path

    async def create_signed_url(self, object_path: str, *, expires_in_seconds: int) -> str:
        url = f"{self._base_url}/object/sign/{self._bucket}/{object_path}"
        payload = {"expiresIn": expires_in_seconds}
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, headers=self._headers, json=payload)
            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise StorageServiceError(
                    f"Signed URL creation failed ({response.status_code})"
                ) from exc
            data: dict[str, Any] = response.json()
        signed_path = data.get("signedURL") or data.get("signed_url")
        if not signed_path:
            raise StorageServiceError("Storage response missing signedURL")
        return f"{self._public_root}{signed_path}"

    async def delete(self, object_path: str) -> None:
        url = f"{self._base_url}/object/{self._bucket}/{object_path}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.request("DELETE", url, headers=self._headers)
            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise StorageServiceError(
                    f"Storage delete failed ({response.status_code})"
                ) from exc
```

- [x] **Step 6: Run the tests to verify they pass**

```bash
cd server && uv run pytest tests/test_storage_service.py -v
```

Expected: PASS (7 tests — shipped more than originally planned).

- [x] **Step 7: Commit** *(done: `332235c feat(storage): supabase storage service + bucket config`)*

---

## Task 3: Optional-auth dependency — ✅ COMPLETED (commit `77e1134`)

**Files:**
- Modify: `server/app/core/security.py`
- Test: `server/tests/test_security_optional_user.py` (new)

- [x] **Step 1: Write the failing test** *(5 cases: no header, wrong scheme, blank token, verification raises, valid token)*

Create `server/tests/test_security_optional_user.py`:

```python
from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.core.security import get_current_user_optional


@pytest.mark.asyncio
async def test_returns_none_when_no_authorization_header() -> None:
    result = await get_current_user_optional(authorization=None)
    assert result is None


@pytest.mark.asyncio
async def test_returns_none_when_token_invalid(monkeypatch) -> None:
    async def boom(_token: str):
        raise HTTPException(status_code=401, detail="bad")

    monkeypatch.setattr(
        "app.core.security.verify_supabase_token", boom
    )
    result = await get_current_user_optional(authorization="Bearer not-a-token")
    assert result is None
```

- [x] **Step 2: Run the failing test**

```bash
cd server && uv run pytest tests/test_security_optional_user.py -v
```

Expected: FAIL — `get_current_user_optional` does not exist.

- [x] **Step 3: Add the dependency**

Edit `server/app/core/security.py` — append:

```python
async def get_current_user_optional(
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
) -> AuthenticatedPrincipal | None:
    """Like get_current_user, but returns None for missing/invalid tokens."""

    if not authorization:
        return None

    prefix = "Bearer "
    if not authorization.startswith(prefix):
        return None

    token = authorization[len(prefix) :].strip()
    if not token:
        return None

    try:
        return await verify_supabase_token(token)
    except HTTPException:
        return None
```

- [x] **Step 4: Verify the test passes**

```bash
cd server && uv run pytest tests/test_security_optional_user.py -v
```

Expected: PASS (5 tests — slightly more than originally planned).

- [x] **Step 5: Commit** *(done: `77e1134 feat(security): add optional-auth dependency`)*

---

## Task 4: JobsService — ✅ COMPLETED (commit `c5a7d90`)

> **Implementation note:** Tests use a `RecordingSession` (mock-session pattern, matching the existing `DummyAsyncSession` in `test_database_layer.py`) instead of the real-DB fixture assumed in the original draft. For the filter-heavy query paths, tests compile the SQLAlchemy statement to a literal-binds SQL string and assert on its shape — imperfect but pragmatic until/unless we build a real test-DB harness. Live-DB coverage for these paths arrives with the `/me/jobs` API tests in Task 6.

**Files:**
- Create: `server/app/services/jobs_service.py`
- Create: `server/tests/test_jobs_service.py`

`JobsService` is the only place that knows how a job becomes a row + a storage object. It exposes:
- `record_authenticated_job(...)` — fire-and-forget upload + insert; **never** raises (failures are swallowed and logged so a recording bug can't break a working tool response).
- `list_for_user(user_id, limit, offset, search, success)`
- `get_for_user(user_id, job_id)`
- `delete_for_user(user_id, job_id)`
- `cleanup_expired(now)` — used by the cleanup cron.

- [x] **Step 1: Write the failing service tests** *(replaced with RecordingSession-based tests, 15 cases covering record success/failure, upload+insert ordering, orphan cleanup, list filter shape, get/delete ownership, cleanup storage+row prune, object-path extension handling)*

Create `server/tests/test_jobs_service.py`:

```python
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AppUser, ToolJob
from app.services.jobs_service import JobsService, RETENTION_DAYS_FREE


@pytest.fixture
async def user(db_session: AsyncSession) -> AppUser:
    u = AppUser(id=uuid.uuid4(), email=f"{uuid.uuid4()}@example.com")
    db_session.add(u)
    await db_session.flush()
    return u


@pytest.mark.asyncio
async def test_record_inserts_row_and_uploads(db_session: AsyncSession, user: AppUser) -> None:
    storage = AsyncMock()
    storage.upload = AsyncMock(return_value="placeholder")
    service = JobsService(db_session, storage)

    job_id = await service.record_authenticated_job(
        user_id=user.id,
        tool_slug="trim-spaces",
        tool_name="Trim Spaces",
        original_filename="input.xlsx",
        output_filename="trim-spaces.xlsx",
        output_bytes=b"hello",
        mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        success=True,
        error_type=None,
        duration_ms=42,
    )

    assert job_id is not None
    storage.upload.assert_awaited_once()

    rows = (await db_session.execute(select(ToolJob))).scalars().all()
    assert len(rows) == 1
    job = rows[0]
    assert job.user_id == user.id
    assert job.success is True
    assert job.output_size_bytes == len(b"hello")
    assert job.expires_at - job.created_at >= timedelta(days=RETENTION_DAYS_FREE - 1)


@pytest.mark.asyncio
async def test_record_swallows_storage_errors(
    db_session: AsyncSession, user: AppUser, caplog
) -> None:
    storage = AsyncMock()
    storage.upload = AsyncMock(side_effect=RuntimeError("storage exploded"))
    service = JobsService(db_session, storage)

    job_id = await service.record_authenticated_job(
        user_id=user.id,
        tool_slug="trim-spaces",
        tool_name="Trim Spaces",
        original_filename=None,
        output_filename="out.xlsx",
        output_bytes=b"x",
        mime_type="application/octet-stream",
        success=True,
        error_type=None,
        duration_ms=1,
    )

    assert job_id is None
    rows = (await db_session.execute(select(ToolJob))).scalars().all()
    assert rows == []  # no partial row when upload fails


@pytest.mark.asyncio
async def test_list_for_user_paginates_and_filters(
    db_session: AsyncSession, user: AppUser
) -> None:
    now = datetime.now(timezone.utc)
    for i in range(5):
        db_session.add(
            ToolJob(
                user_id=user.id,
                tool_slug="trim-spaces" if i % 2 == 0 else "remove-duplicates",
                tool_name="Tool",
                output_filename=f"out_{i}.xlsx",
                mime_type="application/octet-stream",
                output_size_bytes=10,
                success=(i != 3),
                expires_at=now + timedelta(days=7),
            )
        )
    await db_session.flush()

    service = JobsService(db_session, AsyncMock())
    page = await service.list_for_user(user.id, limit=10, offset=0, search=None, success=None)
    assert len(page) == 5

    successes = await service.list_for_user(
        user.id, limit=10, offset=0, search=None, success=True
    )
    assert all(j.success for j in successes)
    assert len(successes) == 4

    trim_only = await service.list_for_user(
        user.id, limit=10, offset=0, search="trim", success=None
    )
    assert all(j.tool_slug == "trim-spaces" for j in trim_only)


@pytest.mark.asyncio
async def test_delete_removes_storage_and_row(
    db_session: AsyncSession, user: AppUser
) -> None:
    storage = AsyncMock()
    storage.delete = AsyncMock()
    job = ToolJob(
        user_id=user.id,
        tool_slug="trim-spaces",
        tool_name="Tool",
        output_filename="out.xlsx",
        storage_path=f"{user.id}/job.xlsx",
        mime_type="application/octet-stream",
        output_size_bytes=10,
        success=True,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db_session.add(job)
    await db_session.flush()

    service = JobsService(db_session, storage)
    await service.delete_for_user(user.id, job.id)
    storage.delete.assert_awaited_once_with(f"{user.id}/job.xlsx")

    remaining = (await db_session.execute(select(ToolJob))).scalars().all()
    assert remaining == []


@pytest.mark.asyncio
async def test_delete_other_users_job_raises(
    db_session: AsyncSession, user: AppUser
) -> None:
    other = AppUser(id=uuid.uuid4(), email=f"{uuid.uuid4()}@example.com")
    db_session.add(other)
    await db_session.flush()

    job = ToolJob(
        user_id=other.id,
        tool_slug="x",
        tool_name="x",
        output_filename="x",
        mime_type="x",
        output_size_bytes=0,
        success=True,
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
    )
    db_session.add(job)
    await db_session.flush()

    service = JobsService(db_session, AsyncMock())
    from app.services.jobs_service import JobNotFoundError

    with pytest.raises(JobNotFoundError):
        await service.delete_for_user(user.id, job.id)
```

- [x] **Step 2: Run the failing tests**

```bash
cd server && uv run pytest tests/test_jobs_service.py -v
```

Expected: FAIL with import error.

- [x] **Step 3: Implement the service**

Create `server/app/services/jobs_service.py`:

```python
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import ToolJob
from app.services.storage_service import StorageService, StorageServiceError

log = logging.getLogger(__name__)

RETENTION_DAYS_FREE = 7


class JobsServiceError(RuntimeError):
    pass


class JobNotFoundError(JobsServiceError):
    pass


def _object_path(user_id: uuid.UUID, job_id: uuid.UUID, output_filename: str) -> str:
    suffix = output_filename.rsplit(".", 1)[-1] if "." in output_filename else "bin"
    return f"{user_id}/{job_id}.{suffix}"


class JobsService:
    def __init__(self, db: AsyncSession, storage: StorageService) -> None:
        self._db = db
        self._storage = storage

    async def record_authenticated_job(
        self,
        *,
        user_id: uuid.UUID,
        tool_slug: str,
        tool_name: str,
        original_filename: str | None,
        output_filename: str,
        output_bytes: bytes,
        mime_type: str,
        success: bool,
        error_type: str | None,
        duration_ms: int | None,
    ) -> uuid.UUID | None:
        """Upload + insert. Returns job id or None on failure (never raises)."""

        job_id = uuid.uuid4()
        path = _object_path(user_id, job_id, output_filename)
        try:
            await self._storage.upload(
                object_path=path, content=output_bytes, mime_type=mime_type
            )
        except (StorageServiceError, Exception) as exc:  # noqa: BLE001
            log.warning("jobs.record: storage upload failed: %s", exc)
            return None

        try:
            now = datetime.now(timezone.utc)
            job = ToolJob(
                id=job_id,
                user_id=user_id,
                tool_slug=tool_slug,
                tool_name=tool_name,
                original_filename=original_filename,
                output_filename=output_filename,
                storage_path=path,
                mime_type=mime_type,
                output_size_bytes=len(output_bytes),
                success=success,
                error_type=error_type,
                duration_ms=duration_ms,
                expires_at=now + timedelta(days=RETENTION_DAYS_FREE),
            )
            self._db.add(job)
            await self._db.flush()
        except Exception as exc:  # noqa: BLE001
            log.warning("jobs.record: db insert failed: %s", exc)
            # Best-effort cleanup of the orphaned object.
            try:
                await self._storage.delete(path)
            except Exception:  # noqa: BLE001
                pass
            return None

        return job_id

    async def list_for_user(
        self,
        user_id: uuid.UUID,
        *,
        limit: int,
        offset: int,
        search: str | None,
        success: bool | None,
    ) -> list[ToolJob]:
        stmt = (
            select(ToolJob)
            .where(ToolJob.user_id == user_id)
            .order_by(ToolJob.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        if search:
            needle = f"%{search.lower()}%"
            stmt = stmt.where(
                ToolJob.tool_slug.ilike(needle) | ToolJob.tool_name.ilike(needle)
            )
        if success is not None:
            stmt = stmt.where(ToolJob.success.is_(success))
        result = await self._db.execute(stmt)
        return list(result.scalars().all())

    async def get_for_user(
        self, user_id: uuid.UUID, job_id: uuid.UUID
    ) -> ToolJob:
        stmt = select(ToolJob).where(
            ToolJob.id == job_id, ToolJob.user_id == user_id
        )
        result = await self._db.execute(stmt)
        job = result.scalar_one_or_none()
        if job is None:
            raise JobNotFoundError("job not found")
        return job

    async def delete_for_user(
        self, user_id: uuid.UUID, job_id: uuid.UUID
    ) -> None:
        job = await self.get_for_user(user_id, job_id)
        if job.storage_path:
            try:
                await self._storage.delete(job.storage_path)
            except StorageServiceError as exc:
                log.warning("jobs.delete: storage delete failed (%s); deleting row anyway", exc)
        await self._db.delete(job)
        await self._db.flush()

    async def cleanup_expired(self, now: datetime) -> int:
        """Hard-delete expired storage objects. Keep rows for 90 days for analytics."""

        stmt = select(ToolJob).where(
            ToolJob.expires_at < now, ToolJob.storage_path.is_not(None)
        )
        result = await self._db.execute(stmt)
        expired = list(result.scalars().all())
        for job in expired:
            if not job.storage_path:
                continue
            try:
                await self._storage.delete(job.storage_path)
                job.storage_path = None
            except StorageServiceError as exc:
                log.warning("jobs.cleanup: failed to delete %s: %s", job.storage_path, exc)
        await self._db.flush()

        # Hard-delete rows older than 90 days.
        prune_before = now - timedelta(days=90)
        await self._db.execute(
            delete(ToolJob).where(ToolJob.created_at < prune_before)
        )
        await self._db.flush()

        return len(expired)
```

- [x] **Step 4: Verify the tests pass**

```bash
cd server && uv run pytest tests/test_jobs_service.py -v
```

Expected: PASS (15 tests — shipped more than originally planned).

- [x] **Step 5: Commit** *(done: `c5a7d90 feat(jobs): JobsService for record/list/get/delete/cleanup`)*

---

## Task 5: `record_and_respond` helper + integrate `trim-spaces` ✅

**Status:** ✅ done.

**Files (landed):**
- `server/app/tools/_recording.py` — helper + `jobs_service_dep`
- `server/app/tools/clean/trim_spaces.py` — wired through `record_and_respond`
- `server/tests/test_recording_helper.py` — 3 tests (anonymous passthrough, authenticated schedules recording, graceful fallback when the service factory yields `None`)
- `server/tests/test_tool_trim_spaces_recording.py` — 2 end-to-end tests via `AsyncClient`/`ASGITransport` with `dependency_overrides` for `get_current_user_optional` and `jobs_service_dep` (the project has no live-DB test harness, so integration is asserted against a mock `JobsService` rather than selecting from `ToolJob`)

**Adaptations from the original plan:**
- Added a third helper test (`test_authenticated_but_jobs_service_unavailable_falls_back`) to cover the `jobs_service is None` branch.
- The integration test uses dependency-override fixtures modelled on `tests/test_auth_endpoints.py` instead of hypothetical `client` / `db_session` / `fake_jwt_for` fixtures that do not exist in this repo.
- The helper does **not** currently set an `X-Job-Id` response header: the recording runs in a background task so no job id is known at response time. Emitting the header would require pre-generating the id client-side or in the helper; deferred to a follow-up if the frontend actually needs it.

**Files:**
- Create: `server/app/tools/_recording.py`
- Modify: `server/app/tools/clean/trim_spaces.py`
- Create: `server/tests/test_recording_helper.py`
- Create: `server/tests/test_tool_trim_spaces_recording.py`

The helper does three things:
1. Returns the same `Response` object today's `file_response()` returns (so anonymous behavior is byte-identical).
2. If a `principal` is present, schedules a fire-and-forget call into `JobsService.record_authenticated_job` using FastAPI's `BackgroundTasks`.
3. Adds `X-Job-Id: <uuid>` to the response header on success so the frontend's "result page" can immediately link to history.

Background tasks run after the response is sent — so a slow Storage upload never blocks the user's download.

- [ ] **Step 1: Write the failing helper test**

Create `server/tests/test_recording_helper.py`:

```python
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock

import pytest
from fastapi import BackgroundTasks

from app.core.security import AuthenticatedPrincipal
from app.tools._recording import record_and_respond


@pytest.mark.asyncio
async def test_anon_response_is_passthrough() -> None:
    bg = BackgroundTasks()
    response = await record_and_respond(
        principal=None,
        background_tasks=bg,
        jobs_service=AsyncMock(),
        tool_slug="trim-spaces",
        tool_name="Trim Spaces",
        original_filename="in.xlsx",
        output_bytes=b"hi",
        output_filename="out.xlsx",
        mime_type="application/octet-stream",
        success=True,
        error_type=None,
        duration_ms=10,
    )
    assert response.body == b"hi"
    assert "X-Job-Id" not in response.headers
    assert len(bg.tasks) == 0


@pytest.mark.asyncio
async def test_authenticated_response_schedules_recording() -> None:
    bg = BackgroundTasks()
    jobs = AsyncMock()
    jobs.record_authenticated_job = AsyncMock(return_value=uuid.uuid4())
    principal = AuthenticatedPrincipal(
        user_id=uuid.uuid4(), email="a@b.c", role=None, session_id=None, claims={}
    )

    response = await record_and_respond(
        principal=principal,
        background_tasks=bg,
        jobs_service=jobs,
        tool_slug="trim-spaces",
        tool_name="Trim Spaces",
        original_filename="in.xlsx",
        output_bytes=b"hi",
        output_filename="out.xlsx",
        mime_type="application/octet-stream",
        success=True,
        error_type=None,
        duration_ms=10,
    )
    assert response.body == b"hi"
    assert len(bg.tasks) == 1  # background recording scheduled
```

- [ ] **Step 2: Run the failing test**

```bash
cd server && uv run pytest tests/test_recording_helper.py -v
```

Expected: FAIL with import error.

- [ ] **Step 3: Implement the helper**

Create `server/app/tools/_recording.py`:

```python
from __future__ import annotations

from fastapi import BackgroundTasks, Depends, Response

from app.core.security import AuthenticatedPrincipal, get_current_user_optional
from app.db.session import get_db_session
from app.services.jobs_service import JobsService
from app.services.storage_service import StorageService
from app.tools._common import file_response


async def get_jobs_service() -> JobsService:
    """Factory for non-request-scoped storage. The DB session comes per-call."""

    raise NotImplementedError("Use record_and_respond which constructs the service")


async def record_and_respond(
    *,
    principal: AuthenticatedPrincipal | None,
    background_tasks: BackgroundTasks,
    jobs_service: JobsService | None,
    tool_slug: str,
    tool_name: str,
    original_filename: str | None,
    output_bytes: bytes,
    output_filename: str,
    mime_type: str,
    success: bool,
    error_type: str | None,
    duration_ms: int | None,
    visual_elements_removed: bool = False,
) -> Response:
    response = file_response(
        output_bytes,
        output_filename,
        mime_type,
        visual_elements_removed=visual_elements_removed,
    )
    if principal is None or jobs_service is None:
        return response

    async def _record() -> None:
        await jobs_service.record_authenticated_job(
            user_id=principal.user_id,
            tool_slug=tool_slug,
            tool_name=tool_name,
            original_filename=original_filename,
            output_filename=output_filename,
            output_bytes=output_bytes,
            mime_type=mime_type,
            success=success,
            error_type=error_type,
            duration_ms=duration_ms,
        )

    background_tasks.add_task(_record)
    return response


async def jobs_service_dep(
    db = Depends(get_db_session),
) -> JobsService:
    return JobsService(db, StorageService())


# Re-exported for convenience in tool modules.
__all__ = [
    "record_and_respond",
    "jobs_service_dep",
    "get_current_user_optional",
]
```

- [ ] **Step 4: Verify helper tests pass**

```bash
cd server && uv run pytest tests/test_recording_helper.py -v
```

Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing tool integration test**

Create `server/tests/test_tool_trim_spaces_recording.py`:

```python
from __future__ import annotations

import io
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock

import openpyxl
import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.db.models import AppUser, ToolJob


def _xlsx_bytes() -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Sheet1"
    ws.append(["name"])
    ws.append([" alice "])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


@pytest.mark.asyncio
async def test_trim_spaces_anonymous_does_not_create_job(
    client: AsyncClient, db_session
) -> None:
    files = {"file": ("input.xlsx", _xlsx_bytes(),
                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    data = {"sheet": "Sheet1", "all_sheets": "false"}
    response = await client.post("/trim-spaces", files=files, data=data)
    assert response.status_code == 200
    assert "X-Job-Id" not in response.headers

    rows = (await db_session.execute(select(ToolJob))).scalars().all()
    assert rows == []


@pytest.mark.asyncio
async def test_trim_spaces_authenticated_records_job(
    client: AsyncClient, db_session, monkeypatch
) -> None:
    user = AppUser(id=uuid.uuid4(), email=f"{uuid.uuid4()}@example.com")
    db_session.add(user)
    await db_session.flush()

    # Stub out storage so the test doesn't hit Supabase.
    from app.services import jobs_service as js_module

    fake_storage = AsyncMock()
    fake_storage.upload = AsyncMock(return_value="path")

    real_service_ctor = js_module.JobsService

    def factory(db, _storage):  # ignore the real storage
        return real_service_ctor(db, fake_storage)

    monkeypatch.setattr(js_module, "JobsService", factory)

    files = {"file": ("input.xlsx", _xlsx_bytes(),
                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    data = {"sheet": "Sheet1", "all_sheets": "false"}
    headers = {"Authorization": f"Bearer {fake_jwt_for(user.id)}"}  # see test fixture below

    response = await client.post(
        "/trim-spaces", files=files, data=data, headers=headers
    )
    assert response.status_code == 200

    # Background tasks have run by the time the response is consumed in tests.
    rows = (await db_session.execute(select(ToolJob))).scalars().all()
    assert len(rows) == 1
    assert rows[0].user_id == user.id
    assert rows[0].tool_slug == "trim-spaces"
    assert rows[0].success is True
```

> **Note:** `fake_jwt_for(...)` requires a test fixture that mints a token accepted by `verify_supabase_token`. The test suite already has `client`, `db_session`, and `monkeypatch` fixtures in `tests/conftest.py` — locate the existing JWT-stubbing pattern (look at `tests/test_auth_endpoints.py` for inspiration) and reuse it. If no helper exists, create one in `tests/conftest.py` that monkeypatches `verify_supabase_token` to return an `AuthenticatedPrincipal` with the requested user id.

- [ ] **Step 6: Modify `trim_spaces.py` to use the helper**

Edit `server/app/tools/clean/trim_spaces.py`:

Replace the imports block:

```python
from __future__ import annotations

import re
import time

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile

from app.core.security import AuthenticatedPrincipal
from app.services.excel_editor import supports_inplace_edit
from app.services.excel_reader import parse_excel_bytes
from app.services.jobs_service import JobsService
from app.tools._common import check_excel_file, has_visual_elements, read_with_limit
from app.tools._recording import (
    get_current_user_optional,
    jobs_service_dep,
    record_and_respond,
)
from app.tools.clean._utils import (
    apply_value_mutation_inplace,
    get_cell,
    parse_columns_arg,
    resolve_column_indexes,
    resolve_target_sheets,
    with_updated_cell,
    workbook_bytes_from_data,
)
```

Update the route signature and replace the two `file_response(...)` returns. The full new function body:

```python
@router.post(
    "/trim-spaces",
    summary="Trim Spaces",
    description="Trims leading and trailing spaces in selected text columns.",
)
async def trim_spaces(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Excel file"),
    sheet: str = Form("", description="Sheet name (required if all_sheets=false)"),
    all_sheets: bool = Form(False, description="Apply to all sheets"),
    columns: str = Form("", description="Comma-separated column names (empty=all columns)"),
    collapse_internal_spaces: bool = Form(False, description="Collapse internal whitespace sequences"),
    principal: AuthenticatedPrincipal | None = Depends(get_current_user_optional),
    jobs_service: JobsService = Depends(jobs_service_dep),
):
    started = time.perf_counter()
    check_excel_file(file)
    raw = await read_with_limit(file)
    selected_columns = parse_columns_arg(columns)

    def _trim(value):
        if not isinstance(value, str):
            return value
        cleaned = value.strip()
        if collapse_internal_spaces:
            cleaned = re.sub(r"\s+", " ", cleaned)
        return cleaned

    if supports_inplace_edit(file.filename):
        output_bytes, visual_lost = apply_value_mutation_inplace(
            raw,
            file.filename,
            sheet=sheet,
            all_sheets=all_sheets,
            selected_columns=selected_columns,
            mutate=_trim,
        )
        return await record_and_respond(
            principal=principal,
            background_tasks=background_tasks,
            jobs_service=jobs_service,
            tool_slug="trim-spaces",
            tool_name="Trim Spaces",
            original_filename=file.filename,
            output_bytes=output_bytes,
            output_filename="trim-spaces.xlsx",
            mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            success=True,
            error_type=None,
            duration_ms=int((time.perf_counter() - started) * 1000),
            visual_elements_removed=visual_lost or has_visual_elements(raw),
        )

    workbook_data = parse_excel_bytes(raw, file.filename)
    target_sheets = resolve_target_sheets(workbook_data, sheet, all_sheets)
    for sheet_name in target_sheets:
        rows = workbook_data[sheet_name]
        if len(rows) <= 1:
            continue
        header = rows[0]
        data_rows = rows[1:]
        column_indexes = resolve_column_indexes(
            header, selected_columns, allow_missing=all_sheets
        )
        cleaned_rows: list[list[object]] = []
        for row in data_rows:
            updated_row = list(row)
            for index in column_indexes:
                value = get_cell(updated_row, index)
                if not isinstance(value, str):
                    continue
                cleaned = value.strip()
                if collapse_internal_spaces:
                    cleaned = re.sub(r"\s+", " ", cleaned)
                updated_row = with_updated_cell(updated_row, index, cleaned)
            cleaned_rows.append(updated_row)
        workbook_data[sheet_name] = [header, *cleaned_rows]

    output_bytes = workbook_bytes_from_data(workbook_data)
    return await record_and_respond(
        principal=principal,
        background_tasks=background_tasks,
        jobs_service=jobs_service,
        tool_slug="trim-spaces",
        tool_name="Trim Spaces",
        original_filename=file.filename,
        output_bytes=output_bytes,
        output_filename="trim-spaces.xlsx",
        mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        success=True,
        error_type=None,
        duration_ms=int((time.perf_counter() - started) * 1000),
        visual_elements_removed=has_visual_elements(raw),
    )
```

- [ ] **Step 7: Run the integration test**

```bash
cd server && uv run pytest tests/test_tool_trim_spaces_recording.py -v
```

Expected: PASS (2 tests).

- [ ] **Step 8: Run the full backend suite to make sure nothing else regressed**

```bash
cd server && uv run pytest -q
```

Expected: all green.

- [ ] **Step 9: Commit**

```bash
git add server/app/tools/_recording.py \
        server/app/tools/clean/trim_spaces.py \
        server/tests/test_recording_helper.py \
        server/tests/test_tool_trim_spaces_recording.py
git commit -m "feat(jobs): record_and_respond helper, wire trim-spaces"
```

---

## Task 6: `/me/jobs` API endpoints ✅

**Status:** ✅ done.

**Files (landed):**
- `server/app/schemas/jobs.py` — `JobItem`, `JobsListResponse`, `JobDownloadResponse`.
- `server/app/routes/me.py` — `GET /api/v1/me/jobs`, `GET /api/v1/me/jobs/{job_id}/download`, `DELETE /api/v1/me/jobs/{job_id}`.
- `server/app/routes/__init__.py` — registers `me_router` in `platform_routers`.
- `server/tests/test_routes_me_jobs.py` — 9 tests (list paginates/search/success filter & 401 when unauthenticated; download returns signed URL, 410 for cleared-storage, 410 for past `expires_at`, 404 when missing; delete 204 and 404).

**Adaptations from the original plan:**
- Promoted the `JobsService` factory from `app/tools/_recording.py` to `app/services/jobs_service.py` as `get_jobs_service` so both tool routes and `/me/jobs` share one dependency (the tool helper keeps a `jobs_service_dep = get_jobs_service` alias for the old import path). Tests override a single symbol.
- Added `JobsService.create_download_url(...)` so the route doesn't reach into `service._storage`. Covered by a new test in `tests/test_jobs_service.py`.
- Download endpoint now treats `expires_at < now` as expired even when `storage_path` is still populated — a background cleanup race would otherwise let a user sign a URL that points at an object Storage is about to delete.
- All route tests are mock-based (`AsyncMock` + `dependency_overrides`), matching the rest of the project's test style. Ownership checks and SQL shaping are covered in the service-level tests.

**Files:**
- Create: `server/app/schemas/jobs.py`
- Create: `server/app/routes/me.py`
- Modify: `server/app/routes/__init__.py`
- Create: `server/tests/test_routes_me_jobs.py`

Three endpoints:
- `GET /api/v1/me/jobs?limit=&offset=&search=&success=` — list current user's jobs
- `GET /api/v1/me/jobs/{job_id}/download` — issue a fresh signed URL (15-minute expiry); 410 GONE if `storage_path` is null
- `DELETE /api/v1/me/jobs/{job_id}` — hard delete

- [ ] **Step 1: Define the schemas**

Create `server/app/schemas/jobs.py`:

```python
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class JobItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tool_slug: str
    tool_name: str
    original_filename: str | None
    output_filename: str
    mime_type: str
    output_size_bytes: int
    success: bool
    error_type: str | None
    duration_ms: int | None
    expires_at: datetime
    created_at: datetime
    expired: bool


class JobsListResponse(BaseModel):
    items: list[JobItem]


class JobDownloadResponse(BaseModel):
    url: str
    expires_in_seconds: int
```

- [ ] **Step 2: Write failing route tests**

Create `server/tests/test_routes_me_jobs.py`:

```python
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.db.models import AppUser, ToolJob


@pytest.mark.asyncio
async def test_list_returns_current_user_jobs_only(
    client: AsyncClient, db_session, auth_header_for
) -> None:
    user = AppUser(id=uuid.uuid4(), email=f"{uuid.uuid4()}@example.com")
    other = AppUser(id=uuid.uuid4(), email=f"{uuid.uuid4()}@example.com")
    db_session.add_all([user, other])
    await db_session.flush()

    db_session.add_all(
        [
            ToolJob(
                user_id=user.id, tool_slug="x", tool_name="X",
                output_filename="x", mime_type="x", output_size_bytes=0,
                success=True, expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            ),
            ToolJob(
                user_id=other.id, tool_slug="y", tool_name="Y",
                output_filename="y", mime_type="y", output_size_bytes=0,
                success=True, expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            ),
        ]
    )
    await db_session.flush()

    response = await client.get("/api/v1/me/jobs", headers=auth_header_for(user.id))
    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 1
    assert body["items"][0]["tool_slug"] == "x"


@pytest.mark.asyncio
async def test_download_returns_signed_url(
    client: AsyncClient, db_session, auth_header_for
) -> None:
    user = AppUser(id=uuid.uuid4(), email=f"{uuid.uuid4()}@example.com")
    db_session.add(user)
    await db_session.flush()
    job = ToolJob(
        user_id=user.id, tool_slug="x", tool_name="X",
        output_filename="x.xlsx", storage_path=f"{user.id}/job.xlsx",
        mime_type="x", output_size_bytes=0,
        success=True, expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db_session.add(job)
    await db_session.flush()

    with patch(
        "app.services.storage_service.StorageService.create_signed_url",
        new=AsyncMock(return_value="https://example.com/signed?token=t"),
    ):
        response = await client.get(
            f"/api/v1/me/jobs/{job.id}/download",
            headers=auth_header_for(user.id),
        )

    assert response.status_code == 200
    assert response.json()["url"].startswith("https://example.com/")


@pytest.mark.asyncio
async def test_download_returns_410_when_expired(
    client: AsyncClient, db_session, auth_header_for
) -> None:
    user = AppUser(id=uuid.uuid4(), email=f"{uuid.uuid4()}@example.com")
    db_session.add(user)
    await db_session.flush()
    job = ToolJob(
        user_id=user.id, tool_slug="x", tool_name="X",
        output_filename="x", storage_path=None,
        mime_type="x", output_size_bytes=0,
        success=True, expires_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    db_session.add(job)
    await db_session.flush()

    response = await client.get(
        f"/api/v1/me/jobs/{job.id}/download",
        headers=auth_header_for(user.id),
    )
    assert response.status_code == 410


@pytest.mark.asyncio
async def test_delete_removes_row(
    client: AsyncClient, db_session, auth_header_for
) -> None:
    user = AppUser(id=uuid.uuid4(), email=f"{uuid.uuid4()}@example.com")
    db_session.add(user)
    await db_session.flush()
    job = ToolJob(
        user_id=user.id, tool_slug="x", tool_name="X",
        output_filename="x", storage_path=None,
        mime_type="x", output_size_bytes=0,
        success=True, expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db_session.add(job)
    await db_session.flush()

    response = await client.delete(
        f"/api/v1/me/jobs/{job.id}", headers=auth_header_for(user.id)
    )
    assert response.status_code == 204

    rows = (await db_session.execute(select(ToolJob))).scalars().all()
    assert rows == []
```

> **Note:** `auth_header_for(user_id)` is the helper proposed in Task 5 step 5. Add it to `tests/conftest.py` if not yet present.

- [ ] **Step 3: Run the failing tests**

```bash
cd server && uv run pytest tests/test_routes_me_jobs.py -v
```

Expected: FAIL with 404s (route doesn't exist).

- [ ] **Step 4: Implement the routes**

Create `server/app/routes/me.py`:

```python
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.core.security import AuthenticatedPrincipal, get_current_user
from app.db.session import get_db_session
from app.schemas.jobs import JobDownloadResponse, JobItem, JobsListResponse
from app.services.jobs_service import JobNotFoundError, JobsService
from app.services.storage_service import StorageService

router = APIRouter(prefix="/api/v1/me", tags=["me"])

_DOWNLOAD_URL_TTL_SECONDS = 15 * 60


def _job_to_item(job) -> JobItem:
    return JobItem(
        id=job.id,
        tool_slug=job.tool_slug,
        tool_name=job.tool_name,
        original_filename=job.original_filename,
        output_filename=job.output_filename,
        mime_type=job.mime_type,
        output_size_bytes=job.output_size_bytes,
        success=job.success,
        error_type=job.error_type,
        duration_ms=job.duration_ms,
        expires_at=job.expires_at,
        created_at=job.created_at,
        expired=job.storage_path is None,
    )


@router.get("/jobs", response_model=JobsListResponse)
async def list_jobs(
    principal: AuthenticatedPrincipal = Depends(get_current_user),
    db = Depends(get_db_session),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    search: str | None = Query(default=None, max_length=120),
    success: bool | None = Query(default=None),
) -> JobsListResponse:
    service = JobsService(db, StorageService())
    rows = await service.list_for_user(
        principal.user_id,
        limit=limit, offset=offset,
        search=search, success=success,
    )
    return JobsListResponse(items=[_job_to_item(r) for r in rows])


@router.get("/jobs/{job_id}/download", response_model=JobDownloadResponse)
async def download_job(
    job_id: uuid.UUID,
    principal: AuthenticatedPrincipal = Depends(get_current_user),
    db = Depends(get_db_session),
) -> JobDownloadResponse:
    storage = StorageService()
    service = JobsService(db, storage)
    try:
        job = await service.get_for_user(principal.user_id, job_id)
    except JobNotFoundError:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.storage_path is None or job.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="This job has expired")
    url = await storage.create_signed_url(
        job.storage_path, expires_in_seconds=_DOWNLOAD_URL_TTL_SECONDS
    )
    return JobDownloadResponse(url=url, expires_in_seconds=_DOWNLOAD_URL_TTL_SECONDS)


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: uuid.UUID,
    principal: AuthenticatedPrincipal = Depends(get_current_user),
    db = Depends(get_db_session),
) -> Response:
    service = JobsService(db, StorageService())
    try:
        await service.delete_for_user(principal.user_id, job_id)
    except JobNotFoundError:
        raise HTTPException(status_code=404, detail="Job not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
```

- [ ] **Step 5: Register the router**

Edit `server/app/routes/__init__.py` — add `me_router` to the existing `platform_routers` list. Look at the file's existing pattern (it imports each router and bundles them). Add:

```python
from app.routes.me import router as me_router
```

…and include `me_router` in the `platform_routers` list.

- [ ] **Step 6: Verify route tests pass**

```bash
cd server && uv run pytest tests/test_routes_me_jobs.py -v
```

Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add server/app/schemas/jobs.py \
        server/app/routes/me.py \
        server/app/routes/__init__.py \
        server/tests/test_routes_me_jobs.py
git commit -m "feat(api): /me/jobs list, download, delete"
```

---

## Task 7: Cleanup script for expired jobs

**Files:**
- Create: `server/app/cli/__init__.py` (empty)
- Create: `server/app/cli/cleanup_expired_jobs.py`
- Create: `server/tests/test_cleanup_script.py`

This is a one-shot script intended to be run by Render's cron (daily). It uses `cleanup_expired` on the service.

- [ ] **Step 1: Failing test**

Create `server/tests/test_cleanup_script.py`:

```python
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock

import pytest

from app.db.models import AppUser, ToolJob
from app.services.jobs_service import JobsService


@pytest.mark.asyncio
async def test_cleanup_expires_storage_paths(db_session) -> None:
    user = AppUser(id=uuid.uuid4(), email=f"{uuid.uuid4()}@example.com")
    db_session.add(user)
    await db_session.flush()

    now = datetime.now(timezone.utc)
    expired = ToolJob(
        user_id=user.id, tool_slug="x", tool_name="X",
        output_filename="x", storage_path=f"{user.id}/expired.xlsx",
        mime_type="x", output_size_bytes=0,
        success=True, expires_at=now - timedelta(hours=1),
    )
    fresh = ToolJob(
        user_id=user.id, tool_slug="y", tool_name="Y",
        output_filename="y", storage_path=f"{user.id}/fresh.xlsx",
        mime_type="x", output_size_bytes=0,
        success=True, expires_at=now + timedelta(days=1),
    )
    db_session.add_all([expired, fresh])
    await db_session.flush()

    storage = AsyncMock()
    storage.delete = AsyncMock()
    service = JobsService(db_session, storage)
    deleted = await service.cleanup_expired(now)
    assert deleted == 1
    storage.delete.assert_awaited_once_with(f"{user.id}/expired.xlsx")

    await db_session.refresh(expired)
    await db_session.refresh(fresh)
    assert expired.storage_path is None
    assert fresh.storage_path == f"{user.id}/fresh.xlsx"
```

- [ ] **Step 2: Run it (passes if Task 4 was done correctly)**

```bash
cd server && uv run pytest tests/test_cleanup_script.py -v
```

Expected: PASS (1 test).

- [ ] **Step 3: Implement the CLI script**

Create `server/app/cli/__init__.py` (empty). Then create `server/app/cli/cleanup_expired_jobs.py`:

```python
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from app.db.session import async_session_factory
from app.services.jobs_service import JobsService
from app.services.storage_service import StorageService

log = logging.getLogger(__name__)


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    async with async_session_factory() as session:
        service = JobsService(session, StorageService())
        deleted = await service.cleanup_expired(datetime.now(timezone.utc))
        await session.commit()
        log.info("cleanup_expired_jobs: removed %d storage objects", deleted)


if __name__ == "__main__":
    asyncio.run(main())
```

> **Note:** Inspect `server/app/db/session.py` — if the factory is named differently than `async_session_factory`, use the actual name. Adjust the import.

- [ ] **Step 4: Manual smoke run**

```bash
cd server && uv run python -m app.cli.cleanup_expired_jobs
```

Expected: exits 0 with one log line; no rows in `tool_jobs` are touched if none are expired.

- [ ] **Step 5: Add to operational docs (server README)**

Append to `server/README.md` under a new "Scheduled tasks" section:

```markdown
### Scheduled tasks

| Task | Command | Cadence |
|---|---|---|
| Expire `tool_jobs` storage objects | `python -m app.cli.cleanup_expired_jobs` | Daily |
```

- [ ] **Step 6: Commit**

```bash
git add server/app/cli/__init__.py \
        server/app/cli/cleanup_expired_jobs.py \
        server/tests/test_cleanup_script.py \
        server/README.md
git commit -m "feat(jobs): cleanup script for expired storage objects"
```

---

## Task 8: Frontend — `lib/jobs.ts`

**Files:**
- Create: `client/lib/jobs.ts`
- Create: `client/lib/jobs.test.ts`

- [ ] **Step 1: Failing test**

Create `client/lib/jobs.test.ts`:

```typescript
import { fetchJobs, deleteJob, getJobDownloadUrl } from "./jobs";

jest.mock("@/lib/api", () => ({
  api: {
    auth: {
      get: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const { api } = jest.requireMock("@/lib/api") as {
  api: { auth: { get: jest.Mock; delete: jest.Mock } };
};

describe("jobs lib", () => {
  beforeEach(() => {
    api.auth.get.mockReset();
    api.auth.delete.mockReset();
  });

  it("fetchJobs forwards filters as query params", async () => {
    api.auth.get.mockResolvedValue({ items: [] });
    await fetchJobs({ limit: 25, offset: 50, search: "trim", success: true });
    expect(api.auth.get).toHaveBeenCalledWith(
      "/api/v1/me/jobs",
      { limit: 25, offset: 50, search: "trim", success: true },
    );
  });

  it("getJobDownloadUrl hits the per-job endpoint", async () => {
    api.auth.get.mockResolvedValue({
      url: "https://x", expires_in_seconds: 900,
    });
    const result = await getJobDownloadUrl("abc");
    expect(api.auth.get).toHaveBeenCalledWith(
      "/api/v1/me/jobs/abc/download",
    );
    expect(result.url).toBe("https://x");
  });

  it("deleteJob calls DELETE", async () => {
    api.auth.delete.mockResolvedValue(undefined);
    await deleteJob("abc");
    expect(api.auth.delete).toHaveBeenCalledWith("/api/v1/me/jobs/abc");
  });
});
```

- [ ] **Step 2: Run it (it fails — module missing)**

```bash
cd client && npm test -- jobs.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement the lib**

Create `client/lib/jobs.ts`:

```typescript
import { api } from "@/lib/api";

export interface JobItem {
  id: string;
  tool_slug: string;
  tool_name: string;
  original_filename: string | null;
  output_filename: string;
  mime_type: string;
  output_size_bytes: number;
  success: boolean;
  error_type: string | null;
  duration_ms: number | null;
  expires_at: string;
  created_at: string;
  expired: boolean;
}

export interface JobsListResponse {
  items: JobItem[];
}

export interface JobDownloadResponse {
  url: string;
  expires_in_seconds: number;
}

export interface JobsFilters {
  limit?: number;
  offset?: number;
  search?: string;
  success?: boolean;
}

export function fetchJobs(filters: JobsFilters = {}): Promise<JobsListResponse> {
  const qs: Record<string, string | number | boolean | undefined> = {};
  if (filters.limit != null) qs.limit = filters.limit;
  if (filters.offset != null) qs.offset = filters.offset;
  if (filters.search) qs.search = filters.search;
  if (filters.success != null) qs.success = filters.success;
  return api.auth.get<JobsListResponse>("/api/v1/me/jobs", qs);
}

export function getJobDownloadUrl(jobId: string): Promise<JobDownloadResponse> {
  return api.auth.get<JobDownloadResponse>(`/api/v1/me/jobs/${jobId}/download`);
}

export function deleteJob(jobId: string): Promise<void> {
  return api.auth.delete(`/api/v1/me/jobs/${jobId}`);
}
```

> **Note:** `api.auth.delete` may not exist yet — verify in `client/lib/api.ts`. If not, add a thin wrapper there matching the existing `get`/`post` pattern. Include that change in the same commit.

- [ ] **Step 4: Verify the test passes**

```bash
cd client && npm test -- jobs.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add client/lib/jobs.ts client/lib/jobs.test.ts client/lib/api.ts
git commit -m "feat(client): jobs lib (fetch/download/delete)"
```

---

## Task 9: Frontend — `/my-account/history` page

**Files:**
- Create: `client/app/[locale]/my-account/history/page.tsx`
- Create: `client/app/[locale]/my-account/history/HistoryClient.tsx`
- Create: `client/app/[locale]/my-account/history/HistoryClient.test.tsx`

The page is signed-in only (uses `useRequireAuth`). UI shape:

- Header with title, subtitle, refresh button.
- Search input + status filter (`all`, `success`, `error`).
- Mobile: stacked cards. ≥ sm: table.
- Each row: tool name + slug, original filename, size, when, status badge, "Download" button (calls `getJobDownloadUrl` → opens result in new tab) and "Delete" button (confirm modal).
- Empty state when 0 items: friendly message + link to `/tools`.
- Expired rows show "Expired" badge instead of Download.

- [ ] **Step 1: Server entry point**

Create `client/app/[locale]/my-account/history/page.tsx`:

```tsx
import { Suspense } from "react";
import HistoryClient from "./HistoryClient";

export default function HistoryPage() {
  return (
    <Suspense fallback={null}>
      <HistoryClient />
    </Suspense>
  );
}
```

- [ ] **Step 2: Failing client test**

Create `client/app/[locale]/my-account/history/HistoryClient.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import HistoryClient from "./HistoryClient";

jest.mock("@/components/auth/useRequireAuth", () => ({
  useRequireAuth: () => ({
    user: { id: "u1", email: "u@x.com" },
    isLoading: false,
    isAuthenticated: true,
  }),
}));

jest.mock("@/lib/jobs", () => ({
  fetchJobs: jest.fn(),
  deleteJob: jest.fn(),
  getJobDownloadUrl: jest.fn(),
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useFormatter: () => ({
    dateTime: (d: Date) => d.toISOString(),
    number: (n: number) => String(n),
  }),
}));

const { fetchJobs, deleteJob, getJobDownloadUrl } = jest.requireMock("@/lib/jobs");

describe("HistoryClient", () => {
  beforeEach(() => {
    fetchJobs.mockReset();
    deleteJob.mockReset();
    getJobDownloadUrl.mockReset();
  });

  it("renders empty state when there are no jobs", async () => {
    fetchJobs.mockResolvedValue({ items: [] });
    render(<HistoryClient />);
    await waitFor(() =>
      expect(screen.getByText(/empty/i)).toBeInTheDocument(),
    );
  });

  it("re-downloads via signed url", async () => {
    const user = userEvent.setup();
    fetchJobs.mockResolvedValue({
      items: [
        {
          id: "j1",
          tool_slug: "trim-spaces",
          tool_name: "Trim Spaces",
          original_filename: "in.xlsx",
          output_filename: "trim-spaces.xlsx",
          mime_type: "x",
          output_size_bytes: 100,
          success: true,
          error_type: null,
          duration_ms: 10,
          expires_at: new Date(Date.now() + 1e9).toISOString(),
          created_at: new Date().toISOString(),
          expired: false,
        },
      ],
    });
    getJobDownloadUrl.mockResolvedValue({ url: "https://x", expires_in_seconds: 900 });
    const open = jest.spyOn(window, "open").mockImplementation(() => null);

    render(<HistoryClient />);
    const button = await screen.findByRole("button", { name: /download/i });
    await user.click(button);

    expect(getJobDownloadUrl).toHaveBeenCalledWith("j1");
    expect(open).toHaveBeenCalledWith("https://x", "_blank", "noopener");
  });
});
```

- [ ] **Step 3: Run it (fails — component missing)**

```bash
cd client && npm test -- HistoryClient.test.tsx
```

Expected: FAIL.

- [ ] **Step 4: Implement the component**

Create `client/app/[locale]/my-account/history/HistoryClient.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RefreshCw, Download, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { useRequireAuth } from "@/components/auth/useRequireAuth";
import {
  deleteJob,
  fetchJobs,
  getJobDownloadUrl,
  type JobItem,
} from "@/lib/jobs";

type StatusFilter = "all" | "success" | "error";
const PAGE_SIZE = 50;

export default function HistoryClient() {
  const t = useTranslations("account.history");
  const format = useFormatter();
  const { isLoading: authLoading } = useRequireAuth();

  const [items, setItems] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(handle);
  }, [search]);

  const load = useCallback(
    async ({ background = false } = {}) => {
      if (background) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await fetchJobs({
          limit: PAGE_SIZE,
          offset: 0,
          search: debouncedSearch || undefined,
          success:
            status === "all" ? undefined : status === "success",
        });
        setItems(result.items);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedSearch, status],
  );

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  async function handleDownload(jobId: string) {
    setDownloadingId(jobId);
    try {
      const { url } = await getJobDownloadUrl(jobId);
      window.open(url, "_blank", "noopener");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete(jobId: string) {
    setPendingDeleteId(jobId);
    try {
      await deleteJob(jobId);
      setItems((prev) => prev.filter((i) => i.id !== jobId));
    } finally {
      setPendingDeleteId(null);
    }
  }

  const formattedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        sizeLabel: format.number(item.output_size_bytes),
        whenLabel: format.dateTime(new Date(item.created_at), {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      })),
    [items, format],
  );

  if (authLoading) return null;

  return (
    <main className="mx-auto max-w-5xl px-3 py-6 sm:px-6 sm:py-8">
      <div className="mb-4 flex items-start justify-between gap-3 sm:mb-6">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "var(--foreground)" }}>
            {t("title")}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-2)" }}>
            {t("subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => load({ background: true })}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:opacity-80 disabled:opacity-50 sm:px-3 sm:text-sm"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--foreground)",
          }}
          aria-label={t("refresh")}
        >
          {refreshing || loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">{t("refresh")}</span>
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="flex-1 rounded-md border px-3 py-2 text-sm"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--foreground)",
          }}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          aria-label={t("statusFilter")}
          className="rounded-md border px-3 py-2 text-sm sm:w-40"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
            color: "var(--foreground)",
          }}
        >
          <option value="all">{t("statusAll")}</option>
          <option value="success">{t("statusSuccess")}</option>
          <option value="error">{t("statusError")}</option>
        </select>
      </div>

      {loading ? (
        <p className="text-center text-sm" style={{ color: "var(--muted-2)" }}>
          <Loader2 className="mx-auto h-4 w-4 animate-spin" />
        </p>
      ) : error ? (
        <p className="rounded-md border p-4 text-center text-sm" style={{ color: "var(--muted-2)" }}>
          {error}
        </p>
      ) : formattedItems.length === 0 ? (
        <div className="rounded-lg border p-10 text-center" style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface)",
        }}>
          <p className="text-sm" style={{ color: "var(--muted-2)" }}>{t("empty")}</p>
        </div>
      ) : (
        <ul className="space-y-2" style={{ opacity: refreshing ? 0.6 : 1, transition: "opacity 150ms" }}>
          {formattedItems.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border p-3 sm:p-4"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface)",
                borderLeft: `4px solid ${item.success ? "#22c55e" : "#ef4444"}`,
              }}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    {item.tool_name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted-2)" }}>
                    {item.original_filename ?? "—"} · {item.sizeLabel} {t("bytes")} · {item.whenLabel}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {item.expired ? (
                    <span className="rounded-md border px-2 py-1 text-xs" style={{ borderColor: "var(--border)", color: "var(--muted-2)" }}>
                      {t("expired")}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDownload(item.id)}
                      disabled={downloadingId === item.id}
                      className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:opacity-80 disabled:opacity-50"
                      style={{
                        borderColor: "var(--border)",
                        backgroundColor: "var(--surface-2)",
                        color: "var(--foreground)",
                      }}
                    >
                      {downloadingId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      {t("download")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(t("confirmDelete"))) handleDelete(item.id);
                    }}
                    disabled={pendingDeleteId === item.id}
                    className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:opacity-80 disabled:opacity-50"
                    style={{
                      borderColor: "var(--border)",
                      backgroundColor: "var(--surface-2)",
                      color: "var(--foreground)",
                    }}
                    aria-label={t("delete")}
                  >
                    {pendingDeleteId === item.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

- [ ] **Step 5: Verify component test passes**

```bash
cd client && npm test -- HistoryClient.test.tsx
```

Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add client/app/[locale]/my-account/history
git commit -m "feat(client): /my-account/history list, download, delete"
```

---

## Task 10: Header link + my-account link card

**Files:**
- Modify: `client/app/[locale]/my-account/page.tsx`
- Modify: `client/components/layout/Header.tsx`

- [ ] **Step 1: Add "View history" card to my-account**

Edit `client/app/[locale]/my-account/page.tsx` — inside the existing `<section>`, after the `</form>`, append:

```tsx
        </section>

        <a
          href="/my-account/history"
          className="block rounded-2xl border p-6 shadow-sm transition hover:opacity-90"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface-2)",
          }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            {t("viewHistory")}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
            {t("viewHistorySubtitle")}
          </p>
        </a>
```

(Make sure to close the wrapper `</section>` correctly — the existing structure already has one.)

- [ ] **Step 2: Add "History" link to authenticated header**

Edit `client/components/layout/Header.tsx`. Locate the existing authenticated nav block (the area that renders "My account" / "Logout"). Add a link to history just before "My account":

```tsx
              <a
                href="/my-account/history"
                className="text-sm hover:underline"
                style={{ color: "var(--foreground)" }}
              >
                {t("nav.history")}
              </a>
```

…using the same `useTranslations` namespace already imported in that file (typically `"common"` or `"header"` — match the file's existing pattern).

- [ ] **Step 3: Manually verify in dev**

```bash
npm run dev
```

Open `http://localhost:3000/en/my-account` while signed in: confirm the "View history" card is visible and routes to `/en/my-account/history`. Header shows the new link.

- [ ] **Step 4: Commit**

```bash
git add client/app/[locale]/my-account/page.tsx \
        client/components/layout/Header.tsx
git commit -m "feat(client): link to history from header + my-account"
```

---

## Task 11: i18n keys (en, es, fr, pt)

**Files:**
- Modify: `client/messages/en.json`
- Modify: `client/messages/es.json`
- Modify: `client/messages/fr.json`
- Modify: `client/messages/pt.json`

Add the following keys. Place them under the existing `account` namespace and add a sibling `history` block. Also add a `history` key to whichever header namespace is in use.

For **en.json**:

```jsonc
"account": {
  // existing keys...
  "viewHistory": "View history",
  "viewHistorySubtitle": "See your last 7 days of jobs and re-download outputs.",
  "history": {
    "title": "Your history",
    "subtitle": "Tool jobs from the last 7 days. Outputs are kept for 7 days then expire.",
    "refresh": "Refresh",
    "searchPlaceholder": "Search by tool…",
    "statusFilter": "Status",
    "statusAll": "All",
    "statusSuccess": "Success",
    "statusError": "Error",
    "download": "Download",
    "delete": "Delete",
    "expired": "Expired",
    "confirmDelete": "Delete this job from your history? This cannot be undone.",
    "empty": "No jobs yet — try a tool and come back!",
    "bytes": "B"
  }
}
```

For **es.json** (use the same keys, translated):

```jsonc
"viewHistory": "Ver historial",
"viewHistorySubtitle": "Consulta tus trabajos de los últimos 7 días y vuelve a descargar los resultados.",
"history": {
  "title": "Tu historial",
  "subtitle": "Trabajos de los últimos 7 días. Los resultados se conservan 7 días y luego caducan.",
  "refresh": "Actualizar",
  "searchPlaceholder": "Buscar por herramienta…",
  "statusFilter": "Estado",
  "statusAll": "Todos",
  "statusSuccess": "Éxito",
  "statusError": "Error",
  "download": "Descargar",
  "delete": "Eliminar",
  "expired": "Caducado",
  "confirmDelete": "¿Eliminar este trabajo del historial? No se puede deshacer.",
  "empty": "Aún no hay trabajos — prueba una herramienta y vuelve.",
  "bytes": "B"
}
```

For **fr.json**:

```jsonc
"viewHistory": "Voir l'historique",
"viewHistorySubtitle": "Consultez vos jobs des 7 derniers jours et retéléchargez les résultats.",
"history": {
  "title": "Votre historique",
  "subtitle": "Jobs des 7 derniers jours. Les résultats sont conservés 7 jours puis expirent.",
  "refresh": "Actualiser",
  "searchPlaceholder": "Rechercher un outil…",
  "statusFilter": "Statut",
  "statusAll": "Tous",
  "statusSuccess": "Succès",
  "statusError": "Erreur",
  "download": "Télécharger",
  "delete": "Supprimer",
  "expired": "Expiré",
  "confirmDelete": "Supprimer ce job de votre historique ? Cette action est irréversible.",
  "empty": "Pas encore de jobs — essayez un outil puis revenez !",
  "bytes": "o"
}
```

For **pt.json**:

```jsonc
"viewHistory": "Ver histórico",
"viewHistorySubtitle": "Veja seus trabalhos dos últimos 7 dias e baixe os resultados novamente.",
"history": {
  "title": "Seu histórico",
  "subtitle": "Trabalhos dos últimos 7 dias. Os resultados são mantidos por 7 dias e depois expiram.",
  "refresh": "Atualizar",
  "searchPlaceholder": "Buscar por ferramenta…",
  "statusFilter": "Status",
  "statusAll": "Todos",
  "statusSuccess": "Sucesso",
  "statusError": "Erro",
  "download": "Baixar",
  "delete": "Excluir",
  "expired": "Expirado",
  "confirmDelete": "Excluir este trabalho do histórico? Esta ação não pode ser desfeita.",
  "empty": "Nenhum trabalho ainda — experimente uma ferramenta e volte!",
  "bytes": "B"
}
```

Also add `nav.history` to whichever header namespace the existing "My account" link uses (e.g. inside `common` or `header`):

```jsonc
"nav": {
  // existing nav keys...
  "history": "History"     // en
  // "history": "Historial"  // es
  // "history": "Historique" // fr
  // "history": "Histórico"  // pt
}
```

- [ ] **Step 1: Verify JSON validity**

```bash
cd client && node -e "['en','es','fr','pt'].forEach(l => { JSON.parse(require('fs').readFileSync('messages/'+l+'.json','utf8')); console.log(l+' ok'); })"
```

Expected: four "ok" lines.

- [ ] **Step 2: Verify the build still passes**

```bash
cd client && npm run type-check && npm run lint && npm run build
```

Expected: all green.

- [ ] **Step 3: Commit**

```bash
git add client/messages
git commit -m "i18n(account): history page keys for en/es/fr/pt"
```

---

## Task 12: Roll out the helper to remaining tools (follow-up plan)

**This is a separate PR, optionally split per category to stay reviewable.**

The mechanical refactor for each tool route:

1. Add to the function signature (after the existing `Form`/`File` parameters):
   ```python
   principal: AuthenticatedPrincipal | None = Depends(get_current_user_optional),
   jobs_service: JobsService = Depends(jobs_service_dep),
   background_tasks: BackgroundTasks,  # add as the first non-default parameter
   ```
2. Wrap the function with `started = time.perf_counter()` near the top.
3. Replace each `return file_response(...)` with `return await record_and_respond(principal=principal, background_tasks=background_tasks, jobs_service=jobs_service, tool_slug="...", tool_name="...", original_filename=file.filename, output_bytes=..., output_filename=..., mime_type=..., success=True, error_type=None, duration_ms=int((time.perf_counter() - started) * 1000), visual_elements_removed=...)`.

Suggested order (one PR per category):

1. `clean/` — find_replace, normalize_case, remove_duplicates, remove_empty_rows (trim_spaces is done)
2. `convert/` — all 10 endpoints
3. `merge/`, `split/`
4. `analyze/`, `format/`
5. `data/`, `validate/`, `security/`
6. `inspect/` — special case (returns JSON, not files; record only when an export happens)

Each PR should:
- Add a parametrized integration test that hits the endpoint with and without auth and asserts the same `tool_jobs` outcomes as the trim-spaces test in Task 5.
- Run `pytest -q` and the client `npm run verify:ci` before pushing.

---

## Self-review

- **Spec coverage:**
  - "New `tool_jobs` table; `user_id` nullable" → Task 1 ✓
  - "Authenticated tool runs upload outputs to Supabase Storage with a 7-day signed URL" → Tasks 2, 4, 5, 6 ✓
  - "New page `/my-account/history`: list, re-download, hard-delete" → Tasks 8, 9 ✓
  - "Anonymous behavior unchanged" → Task 3 (optional auth), Task 5 helper passthrough, Task 5 anonymous test ✓
  - "No new limits in this phase" → confirmed: no quota or size code added ✓
  - "Hard-delete file, keep row 90 days" (open question 2 in spec, recommended) → Task 4 `cleanup_expired` implements this; cron in Task 7 ✓
  - "i18n at PR time" → Task 11 ✓

- **Placeholder scan:** No "TBD"/"TODO" left in code blocks. Two `> Note:` callouts where the engineer must reuse an existing fixture (`auth_header_for`, `async_session_factory`) — those reference real existing patterns and explicitly tell the engineer how to find them.

- **Type consistency:** `JobsService` constructor takes `(db, storage)` consistently in Tasks 4, 5, 6, 7. `record_authenticated_job(...)` arguments match between Tasks 4 (definition), 5 (helper call), and 5 (tool call). `JobItem` Pydantic model in Task 6 mirrors the TypeScript `JobItem` in Task 8 1:1. `_object_path(user_id, job_id, output_filename)` is used consistently. `RETENTION_DAYS_FREE` is the only retention magic number and lives in `jobs_service.py`.

- **One follow-up gap noted:** the plan integrates one tool (trim-spaces) end-to-end in Task 5, with the remaining 31 tools tracked in Task 12 as a follow-up. This is intentional per the spec ("ship Free first, measure, then Pro"); shipping one wired tool proves the mechanism while keeping phase 1 reviewable.
