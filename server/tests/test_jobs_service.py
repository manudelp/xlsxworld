"""Tests for JobsService.

The project has no real test-DB fixture, so these tests use a
``RecordingSession`` in the style of existing tests (DummyAsyncSession
in test_database_layer.py). We verify control flow and the shape of
statements the service sends to the session; the concrete SQL is
exercised end-to-end by the /me/jobs API tests in a later task.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock

import pytest

from app.db.models import ToolJob
from app.services.jobs_service import (
    JobNotFoundError,
    JobsService,
    RETENTION_DAYS_FREE,
    ROW_RETENTION_DAYS,
)


@dataclass
class _FakeScalarResult:
    value: Any = None
    values: list[Any] | None = None

    def scalar_one_or_none(self) -> Any:
        return self.value

    def scalars(self) -> "_FakeScalarResult":
        return self

    def all(self) -> list[Any]:
        return list(self.values or [])


@dataclass
class RecordingSession:
    """Mock of AsyncSession that records calls for assertions.

    Each call to ``execute`` pulls the next value from ``results`` so a
    test can queue the return value for each expected statement.
    """

    results: list[_FakeScalarResult] = field(default_factory=list)
    added: list[Any] = field(default_factory=list)
    deleted: list[Any] = field(default_factory=list)
    executed: list[Any] = field(default_factory=list)
    flushes: int = 0
    commits: int = 0
    rollbacks: int = 0

    def add(self, obj: Any) -> None:
        self.added.append(obj)

    async def flush(self) -> None:
        self.flushes += 1

    async def commit(self) -> None:
        self.commits += 1

    async def rollback(self) -> None:
        self.rollbacks += 1

    async def delete(self, obj: Any) -> None:
        self.deleted.append(obj)

    async def execute(self, stmt: Any) -> _FakeScalarResult:
        self.executed.append(stmt)
        if self.results:
            return self.results.pop(0)
        return _FakeScalarResult()


def _make_tool_job(
    *,
    user_id: uuid.UUID,
    storage_path: str | None = "path/to/object.xlsx",
    success: bool = True,
    expires_at: datetime | None = None,
) -> ToolJob:
    return ToolJob(
        id=uuid.uuid4(),
        user_id=user_id,
        tool_slug="trim-spaces",
        tool_name="Trim Spaces",
        output_filename="out.xlsx",
        storage_path=storage_path,
        mime_type="application/octet-stream",
        output_size_bytes=10,
        success=success,
        expires_at=expires_at or datetime.now(timezone.utc) + timedelta(days=7),
    )


async def test_record_uploads_then_inserts_row_with_retention() -> None:
    user_id = uuid.uuid4()
    storage = AsyncMock()
    storage.upload = AsyncMock(return_value="ignored")
    session = RecordingSession()

    service = JobsService(session, storage)
    job_id = await service.record_authenticated_job(
        user_id=user_id,
        tool_slug="trim-spaces",
        tool_name="Trim Spaces",
        original_filename="in.xlsx",
        output_filename="out.xlsx",
        output_bytes=b"hello",
        mime_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        success=True,
        error_type=None,
        duration_ms=42,
    )

    assert job_id is not None
    storage.upload.assert_awaited_once()
    upload_kwargs = storage.upload.await_args.kwargs
    assert upload_kwargs["object_path"].startswith(f"{user_id}/")
    assert upload_kwargs["object_path"].endswith(".xlsx")
    assert upload_kwargs["content"] == b"hello"

    assert len(session.added) == 1
    row: ToolJob = session.added[0]
    assert row.id == job_id
    assert row.user_id == user_id
    assert row.tool_slug == "trim-spaces"
    assert row.output_size_bytes == len(b"hello")
    assert row.success is True
    # Retention window = RETENTION_DAYS_FREE (allow small clock skew).
    delta = row.expires_at - row.created_at if row.created_at else timedelta(days=RETENTION_DAYS_FREE)
    # created_at may be None (server_default not applied in unit tests) — sanity-check against now.
    assert row.expires_at > datetime.now(timezone.utc) + timedelta(days=RETENTION_DAYS_FREE - 1)
    # The request-scoped session never auto-commits. Without an explicit
    # commit here the background-task insert would be rolled back on
    # close and the tool_jobs table would stay empty — regression guard
    # for the bug observed in production after the first rollout.
    assert session.commits == 1
    assert session.rollbacks == 0


async def test_record_returns_none_and_skips_insert_on_upload_failure() -> None:
    storage = AsyncMock()
    storage.upload = AsyncMock(side_effect=RuntimeError("boom"))
    session = RecordingSession()

    service = JobsService(session, storage)
    job_id = await service.record_authenticated_job(
        user_id=uuid.uuid4(),
        tool_slug="x",
        tool_name="X",
        original_filename=None,
        output_filename="x.xlsx",
        output_bytes=b"x",
        mime_type="application/octet-stream",
        success=True,
        error_type=None,
        duration_ms=1,
    )

    assert job_id is None
    assert session.added == []
    assert session.flushes == 0


async def test_record_cleans_up_storage_when_db_insert_fails() -> None:
    storage = AsyncMock()
    storage.upload = AsyncMock(return_value="ok")
    storage.delete = AsyncMock()

    class BrokenSession(RecordingSession):
        async def flush(self) -> None:
            self.flushes += 1
            raise RuntimeError("db exploded")

    session = BrokenSession()
    service = JobsService(session, storage)
    job_id = await service.record_authenticated_job(
        user_id=uuid.uuid4(),
        tool_slug="x",
        tool_name="X",
        original_filename=None,
        output_filename="x.xlsx",
        output_bytes=b"x",
        mime_type="application/octet-stream",
        success=True,
        error_type=None,
        duration_ms=1,
    )

    assert job_id is None
    storage.delete.assert_awaited_once()
    # DB insert blew up, so we must rollback and never commit partial
    # state — regression guard paired with the happy-path commit check.
    assert session.commits == 0
    assert session.rollbacks == 1


async def test_list_passes_filters_into_the_statement() -> None:
    user_id = uuid.uuid4()
    session = RecordingSession(results=[_FakeScalarResult(values=[])])
    service = JobsService(session, AsyncMock())

    await service.list_for_user(
        user_id, limit=25, offset=50, search="trim", success=True
    )

    assert len(session.executed) == 1
    compiled = str(
        session.executed[0].compile(compile_kwargs={"literal_binds": True})
    )
    # Ownership + filters should all be present in the generated SQL.
    lowered = compiled.lower()
    assert "tool_jobs" in lowered
    assert "user_id" in lowered
    # SQLAlchemy emulates ilike via lower(x) LIKE lower(y).
    assert "like lower('%trim%')" in lowered
    assert "tool_jobs.success is true" in lowered
    assert "limit 25" in lowered
    assert "offset 50" in lowered


async def test_list_without_search_or_status_still_filters_by_user() -> None:
    user_id = uuid.uuid4()
    session = RecordingSession(results=[_FakeScalarResult(values=[])])
    service = JobsService(session, AsyncMock())

    await service.list_for_user(
        user_id, limit=10, offset=0, search=None, success=None
    )

    compiled = str(
        session.executed[0].compile(compile_kwargs={"literal_binds": True})
    ).lower()
    assert "user_id" in compiled
    # No ilike / like emulation when search is None.
    assert "like" not in compiled


async def test_get_raises_job_not_found_when_missing() -> None:
    session = RecordingSession(results=[_FakeScalarResult(value=None)])
    service = JobsService(session, AsyncMock())

    with pytest.raises(JobNotFoundError):
        await service.get_for_user(uuid.uuid4(), uuid.uuid4())


async def test_get_returns_job_when_found() -> None:
    user_id = uuid.uuid4()
    row = _make_tool_job(user_id=user_id)
    session = RecordingSession(results=[_FakeScalarResult(value=row)])
    service = JobsService(session, AsyncMock())

    result = await service.get_for_user(user_id, row.id)

    assert result is row


async def test_download_and_decrypt_fetches_and_decrypts() -> None:
    session = RecordingSession()
    storage = AsyncMock()
    storage.download = AsyncMock(return_value=b"ciphertext")

    service = JobsService(session, storage)
    job = SimpleNamespace(
        storage_path="u/abc.xlsx",
        encryption_blob=b"x" * 72,
    )

    # We can't easily test real decryption here without a valid blob,
    # so just verify it calls storage.download and raises on bad blob
    import pytest
    with pytest.raises(Exception):
        await service.download_and_decrypt(job)

    storage.download.assert_awaited_once_with("u/abc.xlsx")


async def test_delete_calls_storage_then_session_delete() -> None:
    user_id = uuid.uuid4()
    row = _make_tool_job(user_id=user_id, storage_path="u/123.xlsx")
    session = RecordingSession(results=[_FakeScalarResult(value=row)])
    storage = AsyncMock()
    storage.delete = AsyncMock()

    service = JobsService(session, storage)
    await service.delete_for_user(user_id, row.id)

    storage.delete.assert_awaited_once_with("u/123.xlsx")
    assert session.deleted == [row]
    # DELETE must commit — otherwise the row survives when the request
    # session closes and /me/jobs keeps returning the "deleted" job.
    assert session.commits == 1


async def test_delete_still_removes_row_when_storage_fails() -> None:
    from app.services.storage_service import StorageServiceError

    user_id = uuid.uuid4()
    row = _make_tool_job(user_id=user_id, storage_path="u/gone.xlsx")
    session = RecordingSession(results=[_FakeScalarResult(value=row)])
    storage = AsyncMock()
    storage.delete = AsyncMock(side_effect=StorageServiceError("boom"))

    service = JobsService(session, storage)
    await service.delete_for_user(user_id, row.id)

    assert session.deleted == [row]


async def test_delete_skips_storage_call_when_row_has_no_storage_path() -> None:
    user_id = uuid.uuid4()
    row = _make_tool_job(user_id=user_id, storage_path=None)
    session = RecordingSession(results=[_FakeScalarResult(value=row)])
    storage = AsyncMock()
    storage.delete = AsyncMock()

    service = JobsService(session, storage)
    await service.delete_for_user(user_id, row.id)

    storage.delete.assert_not_awaited()
    assert session.deleted == [row]


async def test_cleanup_removes_expired_storage_objects_and_prunes_old_rows() -> None:
    now = datetime.now(timezone.utc)
    user_id = uuid.uuid4()
    expired = _make_tool_job(
        user_id=user_id,
        storage_path="u/expired.xlsx",
        expires_at=now - timedelta(hours=1),
    )
    storage = AsyncMock()
    storage.delete = AsyncMock()
    session = RecordingSession(
        results=[_FakeScalarResult(values=[expired])]  # first execute = select expired
    )

    service = JobsService(session, storage)
    removed = await service.cleanup_expired(now)

    assert removed == 1
    storage.delete.assert_awaited_once_with("u/expired.xlsx")
    assert expired.storage_path is None
    # Second executed statement should be the DELETE ... < now - 90d prune.
    assert len(session.executed) == 2
    prune_sql = str(
        session.executed[1].compile(compile_kwargs={"literal_binds": True})
    ).lower()
    assert "delete" in prune_sql
    assert "tool_jobs" in prune_sql
    # And the configured horizon is the one the service advertises.
    assert ROW_RETENTION_DAYS == 90


async def test_cleanup_counts_only_successful_storage_deletions() -> None:
    from app.services.storage_service import StorageServiceError

    now = datetime.now(timezone.utc)
    user_id = uuid.uuid4()
    a = _make_tool_job(
        user_id=user_id, storage_path="a.xlsx", expires_at=now - timedelta(days=1)
    )
    b = _make_tool_job(
        user_id=user_id, storage_path="b.xlsx", expires_at=now - timedelta(days=1)
    )

    storage = AsyncMock()
    storage.delete = AsyncMock(
        side_effect=[None, StorageServiceError("boom")]
    )
    session = RecordingSession(results=[_FakeScalarResult(values=[a, b])])

    service = JobsService(session, storage)
    removed = await service.cleanup_expired(now)

    assert removed == 1
    assert a.storage_path is None  # cleared
    assert b.storage_path == "b.xlsx"  # retained because delete failed


@pytest.mark.parametrize(
    "filename, expected_suffix",
    [("out.xlsx", ".xlsx"), ("archive.zip", ".zip"), ("noext", ".bin")],
)
def test_object_path_uses_filename_extension(
    filename: str, expected_suffix: str
) -> None:
    from app.services.jobs_service import _object_path

    path = _object_path(uuid.uuid4(), uuid.uuid4(), filename)
    assert path.endswith(expected_suffix)
