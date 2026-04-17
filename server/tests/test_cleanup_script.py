"""Tests for the ``cleanup_expired_jobs`` CLI wrapper.

The underlying ``JobsService.cleanup_expired`` logic is covered in
``test_jobs_service.py``; this module just verifies the thin CLI layer
(build a session, call the service, commit, log) behaves correctly.
"""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest

from app.cli import cleanup_expired_jobs as cli


class FakeSession:
    """Minimal ``AsyncSession`` stand-in that records ``commit`` calls."""

    def __init__(self) -> None:
        self.commits = 0

    async def commit(self) -> None:
        self.commits += 1


@pytest.mark.asyncio
async def test_run_cleanup_commits_and_returns_service_result(monkeypatch) -> None:
    session = FakeSession()
    fake_service = AsyncMock()
    fake_service.cleanup_expired = AsyncMock(return_value=3)

    # Intercept JobsService construction so we can assert on what gets
    # called and avoid building a real StorageService.
    captured: dict[str, object] = {}

    def fake_ctor(db, storage):
        captured["db"] = db
        captured["storage"] = storage
        return fake_service

    monkeypatch.setattr(cli, "JobsService", fake_ctor)
    # Avoid building a real httpx-backed StorageService during unit tests.
    monkeypatch.setattr(cli, "StorageService", lambda: "fake-storage")

    now = datetime(2026, 4, 17, tzinfo=timezone.utc)
    result = await cli.run_cleanup(session, now=now)

    assert result == 3
    assert session.commits == 1
    assert captured["db"] is session
    assert captured["storage"] == "fake-storage"
    fake_service.cleanup_expired.assert_awaited_once_with(now)


@pytest.mark.asyncio
async def test_run_cleanup_defaults_now_to_current_utc(monkeypatch) -> None:
    session = FakeSession()
    fake_service = AsyncMock()
    fake_service.cleanup_expired = AsyncMock(return_value=0)

    monkeypatch.setattr(cli, "JobsService", lambda db, storage: fake_service)
    monkeypatch.setattr(cli, "StorageService", lambda: object())

    before = datetime.now(timezone.utc)
    await cli.run_cleanup(session)
    after = datetime.now(timezone.utc)

    fake_service.cleanup_expired.assert_awaited_once()
    (passed_now,) = fake_service.cleanup_expired.call_args.args
    assert before <= passed_now <= after
    assert passed_now.tzinfo is not None


@pytest.mark.asyncio
async def test_main_opens_session_runs_cleanup_and_logs(monkeypatch, caplog) -> None:
    session = FakeSession()

    class FakeFactoryCtx:
        async def __aenter__(self) -> FakeSession:
            return session

        async def __aexit__(self, *exc_info) -> None:
            return None

    monkeypatch.setattr(cli, "AsyncSessionFactory", lambda: FakeFactoryCtx())

    async def fake_run_cleanup(passed_session, **_kwargs) -> int:
        assert passed_session is session
        return 5

    monkeypatch.setattr(cli, "run_cleanup", fake_run_cleanup)

    caplog.set_level("INFO", logger=cli.log.name)
    returned = await cli.main()

    assert returned == 5
    assert any(
        "removed 5 storage objects" in rec.getMessage() for rec in caplog.records
    )
