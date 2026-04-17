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
