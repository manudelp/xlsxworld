"""One-shot CLI that drops Supabase Storage objects for expired jobs.

Intended to be invoked by a scheduled job (Render cron, GitHub Actions,
etc.) once a day. All the actual logic lives in
:meth:`JobsService.cleanup_expired`; this module is the thin wrapper
that wires up a session, a :class:`StorageService`, runs the service
call, commits, and logs. Keeping the wrapper small keeps it easy to
unit-test without a live database.

Usage::

    python -m app.cli.cleanup_expired_jobs
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionFactory
from app.services.jobs_service import JobsService
from app.services.storage_service import StorageService

log = logging.getLogger(__name__)


async def run_cleanup(session: AsyncSession, *, now: datetime | None = None) -> int:
    """Run a single cleanup pass against the given session.

    Extracted so unit tests can drive the wrapper without having to
    monkeypatch the session factory. Returns the number of Storage
    objects removed — the same value :meth:`JobsService.cleanup_expired`
    returns.
    """

    effective_now = now if now is not None else datetime.now(timezone.utc)
    service = JobsService(session, StorageService())
    deleted = await service.cleanup_expired(effective_now)
    await session.commit()
    return deleted


async def main() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    async with AsyncSessionFactory() as session:
        deleted = await run_cleanup(session)
    log.info("cleanup_expired_jobs: removed %d storage objects", deleted)
    return deleted


if __name__ == "__main__":
    asyncio.run(main())
