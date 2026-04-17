"""User-scoped endpoints served under ``/api/v1/me``.

Phase-1 scope: tool-run history. Every endpoint requires a signed-in
caller; anonymous visitors never reach this router.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.core.security import AuthenticatedPrincipal, get_current_user
from app.db.models import ToolJob
from app.schemas.jobs import JobDownloadResponse, JobItem, JobsListResponse
from app.services.jobs_service import (
    JobNotFoundError,
    JobsService,
    get_jobs_service,
)

router = APIRouter(prefix="/api/v1/me", tags=["me"])

DOWNLOAD_URL_TTL_SECONDS = 15 * 60


def _to_item(job: ToolJob, *, now: datetime) -> JobItem:
    expired = job.storage_path is None or job.expires_at < now
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
        expired=expired,
    )


@router.get("/jobs", response_model=JobsListResponse)
async def list_jobs(
    principal: AuthenticatedPrincipal = Depends(get_current_user),
    service: JobsService = Depends(get_jobs_service),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    search: str | None = Query(default=None, max_length=120),
    success: bool | None = Query(default=None),
) -> JobsListResponse:
    rows = await service.list_for_user(
        principal.user_id,
        limit=limit,
        offset=offset,
        search=search,
        success=success,
    )
    now = datetime.now(timezone.utc)
    return JobsListResponse(items=[_to_item(r, now=now) for r in rows])


@router.get("/jobs/{job_id}/download", response_model=JobDownloadResponse)
async def download_job(
    job_id: uuid.UUID,
    principal: AuthenticatedPrincipal = Depends(get_current_user),
    service: JobsService = Depends(get_jobs_service),
) -> JobDownloadResponse:
    try:
        job = await service.get_for_user(principal.user_id, job_id)
    except JobNotFoundError:
        raise HTTPException(status_code=404, detail="Job not found") from None

    now = datetime.now(timezone.utc)
    if job.storage_path is None or job.expires_at < now:
        raise HTTPException(status_code=410, detail="This job has expired")

    url = await service.create_download_url(
        job.storage_path, expires_in_seconds=DOWNLOAD_URL_TTL_SECONDS
    )
    return JobDownloadResponse(
        url=url, expires_in_seconds=DOWNLOAD_URL_TTL_SECONDS
    )


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: uuid.UUID,
    principal: AuthenticatedPrincipal = Depends(get_current_user),
    service: JobsService = Depends(get_jobs_service),
) -> Response:
    try:
        await service.delete_for_user(principal.user_id, job_id)
    except JobNotFoundError:
        raise HTTPException(status_code=404, detail="Job not found") from None
    return Response(status_code=status.HTTP_204_NO_CONTENT)
