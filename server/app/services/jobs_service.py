"""Business layer for the tool-history feature.

This is the single place that knows how a completed tool run becomes a
``tool_jobs`` row plus a Supabase Storage object. It intentionally
isolates two responsibilities:

* ``record_authenticated_job`` is fire-and-forget from the tool's
  perspective. It uploads to Storage and inserts a row; failures are
  swallowed and logged so a broken recording pipeline can never break a
  working tool response.
* ``list_for_user``, ``get_for_user`` and ``delete_for_user`` are the
  queries that power the ``/me/jobs`` API.
* ``cleanup_expired`` is used by the scheduled job that frees Storage
  for jobs whose retention window has elapsed.
"""

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
ROW_RETENTION_DAYS = 90


class JobsServiceError(RuntimeError):
    """Base class for jobs-service failures."""


class JobNotFoundError(JobsServiceError):
    """Raised when a job is missing or not owned by the caller."""


def _object_path(user_id: uuid.UUID, job_id: uuid.UUID, output_filename: str) -> str:
    suffix = (
        output_filename.rsplit(".", 1)[-1] if "." in output_filename else "bin"
    )
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
        """Upload the output and insert a history row.

        Never raises — returns ``None`` on any failure so the caller can
        always proceed to hand bytes back to the user.
        """

        job_id = uuid.uuid4()
        path = _object_path(user_id, job_id, output_filename)

        try:
            await self._storage.upload(
                object_path=path, content=output_bytes, mime_type=mime_type
            )
        except Exception as exc:  # noqa: BLE001 — recording must never raise
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
                log.warning(
                    "jobs.delete: storage delete failed (%s); deleting row anyway",
                    exc,
                )
        await self._db.delete(job)
        await self._db.flush()

    async def cleanup_expired(self, now: datetime) -> int:
        """Drop Storage objects for expired rows and prune ancient rows.

        Returns the number of Storage objects removed.
        """

        stmt = select(ToolJob).where(
            ToolJob.expires_at < now, ToolJob.storage_path.is_not(None)
        )
        result = await self._db.execute(stmt)
        expired = list(result.scalars().all())
        removed = 0
        for job in expired:
            if not job.storage_path:
                continue
            try:
                await self._storage.delete(job.storage_path)
                job.storage_path = None
                removed += 1
            except StorageServiceError as exc:
                log.warning(
                    "jobs.cleanup: failed to delete %s: %s", job.storage_path, exc
                )
        await self._db.flush()

        prune_before = now - timedelta(days=ROW_RETENTION_DAYS)
        await self._db.execute(
            delete(ToolJob).where(ToolJob.created_at < prune_before)
        )
        await self._db.flush()

        return removed
