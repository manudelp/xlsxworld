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
