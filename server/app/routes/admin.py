from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, cast, func, outerjoin, select, text, Float, Integer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import AuthenticatedPrincipal, get_current_user
from app.core.quota_guard import quota_service_dep
from app.db.models.analytics import MetricEvent, UserActivityDaily
from app.db.models.users import AppUser, UserRole
from app.db.session import get_db_session
from app.services.quota_service import QuotaService, today_utc

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


async def require_admin(
    principal: AuthenticatedPrincipal = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
) -> AuthenticatedPrincipal:
    result = await db.execute(
        select(AppUser.role).where(AppUser.id == principal.user_id)
    )
    role = result.scalar_one_or_none()
    if role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return principal


@router.get("/overview")
async def overview(
    _: AuthenticatedPrincipal = Depends(require_admin),
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    # User counts
    user_q = await db.execute(
        select(
            func.count().label("total"),
            func.count().filter(AppUser.created_at >= today_start).label("today"),
            func.count().filter(AppUser.created_at >= week_ago).label("week"),
            func.count().filter(AppUser.created_at >= month_ago).label("month"),
        ).select_from(AppUser)
    )
    u = user_q.one()

    # Tool usage counts from metric_events
    col_success = MetricEvent.properties_json["success"].as_string()
    col_duration = cast(MetricEvent.properties_json["duration_ms"].as_string(), Float)

    tool_q = await db.execute(
        select(
            func.count().label("total"),
            func.count().filter(MetricEvent.occurred_at >= today_start).label("today"),
            func.count().filter(MetricEvent.occurred_at >= week_ago).label("week"),
            func.count().filter(MetricEvent.occurred_at >= month_ago).label("month"),
            func.avg(
                case(
                    (col_success == "true", 1.0),
                    else_=0.0,
                )
            ).label("success_rate"),
            func.avg(col_duration).label("avg_duration"),
        ).where(MetricEvent.event_name == "tool_usage")
    )
    t = tool_q.one()

    # Error count (failed tool uses)
    error_q = await db.execute(
        select(func.count())
        .where(MetricEvent.event_name == "tool_usage")
        .where(col_success != "true")
    )
    total_errors = error_q.scalar_one()

    errors_today_q = await db.execute(
        select(func.count())
        .where(MetricEvent.event_name == "tool_usage")
        .where(col_success != "true")
        .where(MetricEvent.occurred_at >= today_start)
    )
    errors_today = errors_today_q.scalar_one()

    # File uploads
    upload_q = await db.execute(
        select(
            func.count().label("total"),
            func.count().filter(MetricEvent.occurred_at >= today_start).label("today"),
            func.count().filter(MetricEvent.occurred_at >= week_ago).label("week"),
        ).where(MetricEvent.event_name == "file_upload")
    )
    fu = upload_q.one()

    return {
        "total_users": u.total,
        "new_users_today": u.today,
        "new_users_this_week": u.week,
        "new_users_this_month": u.month,
        "total_tool_uses": t.total,
        "tool_uses_today": t.today,
        "tool_uses_this_week": t.week,
        "tool_uses_this_month": t.month,
        "overall_success_rate": round((t.success_rate or 0) * 100, 1),
        "avg_response_time_ms": round(t.avg_duration or 0, 1),
        "total_errors": total_errors,
        "errors_today": errors_today,
        "total_file_uploads": fu.total,
        "file_uploads_today": fu.today,
        "file_uploads_this_week": fu.week,
    }


@router.get("/overview/trend")
async def overview_trend(
    _: AuthenticatedPrincipal = Depends(require_admin),
    db: AsyncSession = Depends(get_db_session),
) -> list[dict]:
    month_ago = datetime.now(timezone.utc) - timedelta(days=30)
    day_col = func.date_trunc("day", MetricEvent.occurred_at)

    result = await db.execute(
        select(
            day_col.label("day"),
            func.count().label("count"),
        )
        .where(MetricEvent.event_name == "tool_usage")
        .where(MetricEvent.occurred_at >= month_ago)
        .group_by(day_col)
        .order_by(day_col)
    )
    return [
        {"date": row.day.strftime("%Y-%m-%d"), "count": row.count}
        for row in result.all()
    ]


@router.get("/overview/kpi-trends")
async def overview_kpi_trends(
    _: AuthenticatedPrincipal = Depends(require_admin),
    db: AsyncSession = Depends(get_db_session),
    days: int = Query(default=30, ge=1, le=365),
) -> dict:
    """Daily breakdowns for each overview KPI over the requested window."""
    window_start = datetime.now(timezone.utc) - timedelta(days=days)
    day_col = func.date_trunc("day", MetricEvent.occurred_at)

    col_success = MetricEvent.properties_json["success"].as_string()
    col_duration = cast(MetricEvent.properties_json["duration_ms"].as_string(), Float)

    # Tool usage per day: count, success rate, avg duration
    tool_q = await db.execute(
        select(
            day_col.label("day"),
            func.count().label("tool_uses"),
            func.avg(
                case((col_success == "true", 1.0), else_=0.0)
            ).label("success_rate"),
            func.avg(col_duration).label("avg_duration"),
        )
        .where(MetricEvent.event_name == "tool_usage")
        .where(MetricEvent.occurred_at >= window_start)
        .group_by(day_col)
        .order_by(day_col)
    )
    tool_rows = {r.day.strftime("%Y-%m-%d"): r for r in tool_q.all()}

    # New users per day
    user_q = await db.execute(
        select(
            func.date_trunc("day", AppUser.created_at).label("day"),
            func.count().label("new_users"),
        )
        .where(AppUser.created_at >= window_start)
        .group_by(text("1"))
        .order_by(text("1"))
    )
    user_rows = {r.day.strftime("%Y-%m-%d"): r.new_users for r in user_q.all()}

    # Error count per day
    col_success = MetricEvent.properties_json["success"].as_string()
    error_q = await db.execute(
        select(
            day_col.label("day"),
            func.count().label("error_count"),
        )
        .where(MetricEvent.event_name == "tool_usage")
        .where(col_success != "true")
        .where(MetricEvent.occurred_at >= window_start)
        .group_by(day_col)
        .order_by(day_col)
    )
    error_rows = {r.day.strftime("%Y-%m-%d"): r.error_count for r in error_q.all()}

    # File uploads per day
    upload_q = await db.execute(
        select(
            day_col.label("day"),
            func.count().label("upload_count"),
        )
        .where(MetricEvent.event_name == "file_upload")
        .where(MetricEvent.occurred_at >= window_start)
        .group_by(day_col)
        .order_by(day_col)
    )
    upload_rows = {r.day.strftime("%Y-%m-%d"): r.upload_count for r in upload_q.all()}

    # Build unified daily series
    all_dates = sorted(set(
        list(tool_rows.keys()) + list(user_rows.keys())
        + list(error_rows.keys()) + list(upload_rows.keys())
    ))
    series: list[dict] = []
    for d in all_dates:
        tr = tool_rows.get(d)
        series.append({
            "date": d,
            "new_users": user_rows.get(d, 0),
            "tool_uses": tr.tool_uses if tr else 0,
            "success_rate": round((tr.success_rate or 0) * 100, 1) if tr else None,
            "avg_duration_ms": round(tr.avg_duration or 0, 1) if tr else None,
            "error_count": error_rows.get(d, 0),
            "file_uploads": upload_rows.get(d, 0),
        })

    return {"series": series}


@router.get("/tools")
async def tools(
    _: AuthenticatedPrincipal = Depends(require_admin),
    db: AsyncSession = Depends(get_db_session),
) -> list[dict]:
    col_slug = MetricEvent.properties_json["tool_slug"].as_string()
    col_name = MetricEvent.properties_json["tool_name"].as_string()
    col_success = MetricEvent.properties_json["success"].as_string()
    col_duration = cast(MetricEvent.properties_json["duration_ms"].as_string(), Float)

    result = await db.execute(
        select(
            col_slug.label("tool_slug"),
            col_name.label("tool_name"),
            func.count().label("total_uses"),
            func.avg(
                case(
                    (col_success == "true", 1.0),
                    else_=0.0,
                )
            ).label("success_rate"),
            func.avg(col_duration).label("avg_duration_ms"),
            func.max(MetricEvent.occurred_at).label("last_used_at"),
        )
        .where(MetricEvent.event_name == "tool_usage")
        .group_by(col_slug, col_name)
        .order_by(func.count().desc())
    )
    rows = result.all()
    return [
        {
            "tool_slug": r.tool_slug,
            "tool_name": r.tool_name,
            "total_uses": r.total_uses,
            "success_rate": round((r.success_rate or 0) * 100, 1),
            "avg_duration_ms": round(r.avg_duration_ms or 0, 1),
            "last_used_at": r.last_used_at.isoformat() if r.last_used_at else None,
        }
        for r in rows
    ]


@router.get("/users")
async def users(
    _: AuthenticatedPrincipal = Depends(require_admin),
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    now = datetime.now(timezone.utc)
    month_ago = now - timedelta(days=30)

    # Total users
    total_q = await db.execute(select(func.count()).select_from(AppUser))
    total_users = total_q.scalar_one()

    # Signups per day (last 30 days)
    signups_q = await db.execute(
        select(
            func.date_trunc("day", AppUser.created_at).label("day"),
            func.count().label("count"),
        )
        .where(AppUser.created_at >= month_ago)
        .group_by(text("1"))
        .order_by(text("1"))
    )
    signups_per_day = [
        {"date": row.day.strftime("%Y-%m-%d"), "count": row.count}
        for row in signups_q.all()
    ]

    # DAU per day (last 30 days)
    dau_q = await db.execute(
        select(
            UserActivityDaily.activity_date.label("day"),
            func.count(func.distinct(UserActivityDaily.user_id)).label("count"),
        )
        .where(UserActivityDaily.activity_date >= month_ago.date())
        .group_by(UserActivityDaily.activity_date)
        .order_by(UserActivityDaily.activity_date)
    )
    dau_per_day = [
        {"date": row.day.strftime("%Y-%m-%d"), "count": row.count}
        for row in dau_q.all()
    ]

    return {
        "total_users": total_users,
        "signups_per_day": signups_per_day,
        "dau_per_day": dau_per_day,
    }


@router.get("/users/list")
async def users_list(
    _: AuthenticatedPrincipal = Depends(require_admin),
    db: AsyncSession = Depends(get_db_session),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=200),
    role: str | None = Query(default=None, max_length=50),
    status_filter: str | None = Query(default=None, alias="status", max_length=50),
) -> dict:
    # Subquery: tool uses per user
    tool_counts = (
        select(
            MetricEvent.user_id.label("uid"),
            func.count().label("tool_uses"),
        )
        .where(MetricEvent.event_name == "tool_usage")
        .group_by(MetricEvent.user_id)
        .subquery()
    )

    filters = []
    if search:
        needle = f"%{search.strip().lower()}%"
        if needle.strip("%"):
            filters.append(func.lower(AppUser.email).like(needle))
    if role:
        filters.append(AppUser.role == role)
    if status_filter:
        filters.append(AppUser.status == status_filter)

    total_stmt = select(func.count()).select_from(AppUser)
    for f in filters:
        total_stmt = total_stmt.where(f)
    total_q = await db.execute(total_stmt)
    total = total_q.scalar_one()

    rows_stmt = (
        select(
            AppUser.id,
            AppUser.email,
            AppUser.display_name,
            AppUser.role,
            AppUser.status,
            AppUser.created_at,
            AppUser.last_seen_at,
            func.coalesce(tool_counts.c.tool_uses, 0).label("total_tool_uses"),
        )
        .outerjoin(tool_counts, AppUser.id == tool_counts.c.uid)
        .order_by(AppUser.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    for f in filters:
        rows_stmt = rows_stmt.where(f)
    rows_q = await db.execute(rows_stmt)
    rows = rows_q.all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "users": [
            {
                "id": str(r.id),
                "email": r.email,
                "display_name": r.display_name,
                "role": r.role.value if hasattr(r.role, "value") else r.role,
                "status": r.status.value if hasattr(r.status, "value") else r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "last_seen_at": r.last_seen_at.isoformat() if r.last_seen_at else None,
                "total_tool_uses": r.total_tool_uses,
            }
            for r in rows
        ],
    }


@router.get("/activity")
async def activity(
    _: AuthenticatedPrincipal = Depends(require_admin),
    db: AsyncSession = Depends(get_db_session),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    success: bool | None = Query(default=None),
    tool_slug: str | None = Query(default=None, max_length=100),
) -> list[dict]:
    col_slug = MetricEvent.properties_json["tool_slug"].as_string()
    col_name = MetricEvent.properties_json["tool_name"].as_string()
    col_duration = MetricEvent.properties_json["duration_ms"].as_string()
    col_success = MetricEvent.properties_json["success"].as_string()
    col_error = MetricEvent.properties_json["error_type"].as_string()

    stmt = (
        select(
            MetricEvent.occurred_at,
            MetricEvent.user_id,
            col_slug.label("tool_slug"),
            col_name.label("tool_name"),
            col_duration.label("duration_ms"),
            col_success.label("success"),
            col_error.label("error_type"),
            AppUser.email.label("user_email"),
        )
        .outerjoin(AppUser, MetricEvent.user_id == AppUser.id)
        .where(MetricEvent.event_name == "tool_usage")
        .order_by(MetricEvent.occurred_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if success is True:
        stmt = stmt.where(col_success == "true")
    elif success is False:
        stmt = stmt.where(col_success != "true")
    if tool_slug:
        stmt = stmt.where(col_slug == tool_slug)

    result = await db.execute(stmt)
    rows = result.all()

    def _as_float(value):
        if value is None:
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    return [
        {
            "occurred_at": r.occurred_at.isoformat() if r.occurred_at else None,
            "user_id": str(r.user_id) if r.user_id else None,
            "tool_slug": r.tool_slug,
            "tool_name": r.tool_name,
            "duration_ms": _as_float(r.duration_ms),
            "success": r.success == "true" if r.success else False,
            "error_type": r.error_type if r.error_type and r.error_type != "null" else None,
            "user_email": r.user_email,
        }
        for r in rows
    ]


@router.get("/performance")
async def performance(
    _: AuthenticatedPrincipal = Depends(require_admin),
    db: AsyncSession = Depends(get_db_session),
) -> list[dict]:
    now = datetime.now(timezone.utc)
    last_24h = now - timedelta(hours=24)

    col_path = MetricEvent.properties_json["path"].as_string()
    col_method = MetricEvent.properties_json["method"].as_string()
    col_success = MetricEvent.properties_json["success"].as_string()
    col_duration = cast(MetricEvent.properties_json["duration_ms"].as_string(), Float)

    result = await db.execute(
        select(
            col_path.label("path"),
            col_method.label("method"),
            func.count().label("total_requests"),
            func.avg(col_duration).label("avg_response_time_ms"),
            func.percentile_cont(0.95).within_group(col_duration).label("p95_response_time_ms"),
            func.avg(
                case(
                    (col_success == "true", 0.0),
                    else_=1.0,
                )
            ).label("error_rate"),
            func.count().filter(MetricEvent.occurred_at >= last_24h).label("requests_last_24h"),
        )
        .where(MetricEvent.event_name == "endpoint_performance")
        .group_by(col_path, col_method)
        .order_by(func.count().desc())
    )
    rows = result.all()
    return [
        {
            "path": r.path,
            "method": r.method,
            "total_requests": r.total_requests,
            "avg_response_time_ms": round(r.avg_response_time_ms or 0, 1),
            "p95_response_time_ms": round(r.p95_response_time_ms or 0, 1),
            "error_rate": round((r.error_rate or 0) * 100, 1),
            "requests_last_24h": r.requests_last_24h,
        }
        for r in rows
    ]


@router.post(
    "/quota/reset",
    summary="Reset daily quota for a user or IP",
    description=(
        "Sets today's job counter to zero for the given key. "
        "Key format: ``user:<uuid>`` or ``ip:<address>``."
    ),
)
async def reset_quota(
    admin: AuthenticatedPrincipal = Depends(require_admin),
    quota_service: QuotaService = Depends(quota_service_dep),
    key: str | None = Query(
        default=None,
        description='Quota key, e.g. "user:<uuid>" or "ip:<addr>". '
        "Omit to reset your own quota.",
    ),
) -> dict:
    target = key or f"user:{admin.user_id}"
    day = today_utc()
    prev = await quota_service.read_today(key=target, day=day)
    await quota_service.reset(key=target, day=day)
    return {"key": target, "day": str(day), "previous_count": prev, "new_count": 0}
