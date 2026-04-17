"""Shared helper for tool routes that records per-user job history.

The helper wraps :func:`app.tools._common.file_response` so anonymous
behavior stays byte-identical to today. For authenticated callers it
schedules a fire-and-forget :class:`JobsService.record_authenticated_job`
call via FastAPI's ``BackgroundTasks`` — background tasks run after the
response is sent so a slow Storage upload never blocks the user's
download.
"""

from __future__ import annotations

from fastapi import BackgroundTasks, Response

from app.core.security import AuthenticatedPrincipal, get_current_user_optional
from app.services.jobs_service import JobsService, get_jobs_service
from app.tools._common import file_response


jobs_service_dep = get_jobs_service
"""Backwards-compatible alias for :func:`get_jobs_service`.

Tool routes imported this symbol from ``app.tools._recording`` before
the factory was promoted to the services layer. Keeping the alias lets
existing imports continue to work.
"""


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
    """Build the download response and (if signed-in) schedule recording.

    Anonymous callers get the exact same ``Response`` ``file_response``
    has always returned. Authenticated callers additionally have a
    background task scheduled that uploads ``output_bytes`` to Storage
    and inserts a ``tool_jobs`` row.
    """

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


__all__ = [
    "jobs_service_dep",
    "record_and_respond",
    "get_current_user_optional",
]
