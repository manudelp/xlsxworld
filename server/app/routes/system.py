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
    ordered: list[str] = []
    for row in result.all():
        if not row.tool_slug:
            continue
        slug = row.tool_slug.rsplit("/", 1)[-1]
        if slug not in seen:
            seen.add(slug)
            ordered.append(slug)

    return ordered[:limit]
