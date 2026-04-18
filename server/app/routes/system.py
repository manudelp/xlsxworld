from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import cast, func, select, Float
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.analytics import MetricEvent
from app.db.session import get_db_session

router = APIRouter(tags=["meta"])


@router.get(
    "/",
    tags=["root"],
    summary="API Status",
    description="Returns a short status message confirming the XLSX World backend is running.",
)
def read_root():
    return {"message": "XLSX World backend running"}


@router.get(
    "/health",
    summary="Health Check",
    description="Returns a simple health signal for uptime checks and monitoring.",
)
def health():
    return {"status": "ok"}


# Map analytics tool_slug values to the client-side toolsData slugs.
_SLUG_ALIASES: dict[str, str] = {
    "inspect/sheet": "inspect-sheets",
    "inspect/preview": "inspect-sheets",
}


def _normalise_slug(raw: str) -> str:
    if raw in _SLUG_ALIASES:
        return _SLUG_ALIASES[raw]
    # "format/freeze-header" → "freeze-header"
    return raw.rsplit("/", 1)[-1]


@router.get(
    "/api/v1/tools/popular",
    summary="Popular Tools",
    description="Returns tool slugs ordered by total usage count.",
)
async def popular_tools(
    limit: int = Query(default=15, ge=1, le=50),
    db: AsyncSession = Depends(get_db_session),
) -> list[str]:
    col_slug = MetricEvent.properties_json["tool_slug"].as_string()
    col_success = MetricEvent.properties_json["success"].as_string()

    result = await db.execute(
        select(col_slug.label("tool_slug"), func.count().label("cnt"))
        .where(MetricEvent.event_name == "tool_usage")
        .where(col_success == "true")
        .group_by(col_slug)
        .order_by(func.count().desc())
    )

    seen: set[str] = set()
    ordered: list[tuple[str, int]] = []
    for row in result.all():
        if not row.tool_slug:
            continue
        slug = _normalise_slug(row.tool_slug)
        if slug in seen:
            # Merge counts for aliases (e.g. inspect/sheet + inspect/preview)
            for i, (s, c) in enumerate(ordered):
                if s == slug:
                    ordered[i] = (s, c + row.cnt)
                    break
        else:
            seen.add(slug)
            ordered.append((slug, row.cnt))

    ordered.sort(key=lambda x: x[1], reverse=True)
    return [slug for slug, _ in ordered[:limit]]
