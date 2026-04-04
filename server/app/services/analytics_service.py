from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from time import perf_counter
from typing import Any, AsyncIterator
from uuid import UUID

from fastapi import Depends, Request
from sqlalchemy import case, func, insert, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.config import get_settings
from app.core.security import AuthenticatedPrincipal
from app.db.models.analytics import MetricDataPoint, MetricEvent, UserActivityDaily
from app.db.models.users import AppUser
from app.schemas.analytics import EndpointPerformanceEvent, FileUploadEvent, ToolUsageEvent, UserActivityEvent

logger = logging.getLogger(__name__)


def _build_analytics_session_factory() -> async_sessionmaker[AsyncSession]:
    settings = get_settings()
    engine = create_async_engine(
        settings.async_database_pool_url,
        echo=settings.db_echo_sql,
        connect_args={"prepared_statement_cache_size": 0},
        pool_pre_ping=True,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_timeout=settings.db_pool_timeout,
        pool_recycle=settings.db_pool_recycle,
    )
    return async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


AnalyticsSessionFactory = _build_analytics_session_factory()


@dataclass(slots=True)
class _AnalyticsTaskContext:
    name: str
    started_at: datetime


class AnalyticsService:
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession] = AnalyticsSessionFactory,
        logger_: logging.Logger | None = None,
    ) -> None:
        self.session_factory = session_factory
        self.logger = logger_ or logger

    def _spawn(self, task_name: str, coro: Any) -> None:
        try:
            asyncio.create_task(self._guard(task_name, coro))
        except RuntimeError:
            self.logger.debug("Skipping analytics task %s because no event loop is running", task_name)

    async def _guard(self, task_name: str, coro: Any) -> None:
        try:
            await coro
        except Exception:
            self.logger.exception("Analytics write failed for %s", task_name)

    @staticmethod
    def _bucket_start(occurred_at: datetime) -> datetime:
        return occurred_at.astimezone(timezone.utc).replace(second=0, microsecond=0)

    @staticmethod
    def _duration_seconds(duration_ms: int) -> int:
        return max(duration_ms // 1000, 0)

    @staticmethod
    def _event_properties(properties: dict[str, Any]) -> dict[str, Any]:
        return {key: value for key, value in properties.items() if value is not None}

    @staticmethod
    def _metric_value(value: int | float) -> Decimal:
        return Decimal(str(value))

    def _record(self, task_name: str, coro: Any) -> None:
        self._spawn(task_name, coro)

    def record_tool_usage(self, event: ToolUsageEvent) -> None:
        self._record("tool_usage", self._persist_tool_usage(event))

    def record_file_upload(self, event: FileUploadEvent) -> None:
        self._record("file_upload", self._persist_file_upload(event))

    def record_endpoint_performance(self, event: EndpointPerformanceEvent) -> None:
        self._record("endpoint_performance", self._persist_endpoint_performance(event))

    def record_user_activity(self, event: UserActivityEvent) -> None:
        self._record("user_activity", self._persist_user_activity(event))

    def record_request(self, event: EndpointPerformanceEvent) -> None:
        self.record_endpoint_performance(event)

    async def _persist_tool_usage(self, event: ToolUsageEvent) -> None:
        async with self.session_factory() as session:
            async with session.begin():
                await self._insert_metric_event(
                    session,
                    event_name="tool_usage",
                    event_category=event.tool_category or "tool",
                    source=event.tool_slug or event.tool_name,
                    occurred_at=event.occurred_at,
                    user_id=event.user_id,
                    session_id=event.session_id,
                    properties=self._event_properties(
                        {
                            "tool_name": event.tool_name,
                            "tool_slug": event.tool_slug,
                            "tool_category": event.tool_category,
                            "duration_ms": event.duration_ms,
                            "success": event.success,
                            "error_type": event.error_type,
                            "input_file_type": event.input_file_type,
                            "input_file_size_bytes": event.input_file_size_bytes,
                            "output_file_type": event.output_file_type,
                            "output_file_size_bytes": event.output_file_size_bytes,
                        }
                    ),
                )
                await self._insert_metric_point(
                    session,
                    metric_key="tool.duration_ms",
                    metric_value=event.duration_ms,
                    metric_unit="ms",
                    user_id=event.user_id,
                    occurred_at=event.occurred_at,
                    source=event.tool_slug or event.tool_name,
                    dimensions={
                        "tool_name": event.tool_name,
                        "tool_slug": event.tool_slug,
                        "success": event.success,
                    },
                )
                await self._insert_metric_point(
                    session,
                    metric_key="tool.success_count",
                    metric_value=1 if event.success else 0,
                    metric_unit="count",
                    user_id=event.user_id,
                    occurred_at=event.occurred_at,
                    source=event.tool_slug or event.tool_name,
                    dimensions={
                        "tool_name": event.tool_name,
                        "tool_slug": event.tool_slug,
                        "success": event.success,
                        "error_type": event.error_type,
                    },
                )
                await self._touch_user_activity(
                    session,
                    user_id=event.user_id,
                    occurred_at=event.occurred_at,
                    duration_ms=event.duration_ms,
                    activity_kind="tool_usage",
                    feature_name=event.tool_name,
                    source=event.tool_slug or event.tool_name,
                    success=event.success,
                    error_type=event.error_type,
                )

    async def _persist_file_upload(self, event: FileUploadEvent) -> None:
        async with self.session_factory() as session:
            async with session.begin():
                await self._insert_metric_event(
                    session,
                    event_name="file_upload",
                    event_category="upload",
                    source=event.file_type,
                    occurred_at=event.occurred_at,
                    user_id=event.user_id,
                    session_id=event.session_id,
                    properties=self._event_properties(
                        {
                            "file_name": event.file_name,
                            "file_type": event.file_type,
                            "file_size_bytes": event.file_size_bytes,
                            "processing_time_ms": event.processing_time_ms,
                            "success": event.success,
                            "error_type": event.error_type,
                        }
                    ),
                )
                await self._insert_metric_point(
                    session,
                    metric_key="file_upload.file_size_bytes",
                    metric_value=event.file_size_bytes,
                    metric_unit="bytes",
                    user_id=event.user_id,
                    occurred_at=event.occurred_at,
                    source=event.file_type,
                    dimensions={
                        "file_type": event.file_type,
                        "success": event.success,
                    },
                )
                await self._insert_metric_point(
                    session,
                    metric_key="file_upload.processing_time_ms",
                    metric_value=event.processing_time_ms,
                    metric_unit="ms",
                    user_id=event.user_id,
                    occurred_at=event.occurred_at,
                    source=event.file_type,
                    dimensions={
                        "file_type": event.file_type,
                        "success": event.success,
                    },
                )
                await self._insert_metric_point(
                    session,
                    metric_key="file_upload.success_count",
                    metric_value=1 if event.success else 0,
                    metric_unit="count",
                    user_id=event.user_id,
                    occurred_at=event.occurred_at,
                    source=event.file_type,
                    dimensions={
                        "file_type": event.file_type,
                        "success": event.success,
                        "error_type": event.error_type,
                    },
                )
                await self._touch_user_activity(
                    session,
                    user_id=event.user_id,
                    occurred_at=event.occurred_at,
                    duration_ms=event.processing_time_ms,
                    activity_kind="file_upload",
                    feature_name=event.file_type,
                    source=event.file_name or event.file_type,
                    success=event.success,
                    error_type=event.error_type,
                )

    async def _persist_endpoint_performance(self, event: EndpointPerformanceEvent) -> None:
        async with self.session_factory() as session:
            async with session.begin():
                await self._insert_metric_event(
                    session,
                    event_name="endpoint_performance",
                    event_category="performance",
                    source=event.route_name or f"{event.method} {event.path}",
                    occurred_at=event.occurred_at,
                    user_id=event.user_id,
                    session_id=event.session_id,
                    properties=self._event_properties(
                        {
                            "method": event.method,
                            "path": event.path,
                            "route_name": event.route_name,
                            "status_code": event.status_code,
                            "duration_ms": event.duration_ms,
                            "success": event.success,
                            "error_type": event.error_type,
                        }
                    ),
                )
                await self._insert_metric_point(
                    session,
                    metric_key="endpoint.response_time_ms",
                    metric_value=event.duration_ms,
                    metric_unit="ms",
                    user_id=event.user_id,
                    occurred_at=event.occurred_at,
                    source=event.route_name or event.path,
                    dimensions={
                        "method": event.method,
                        "path": event.path,
                        "route_name": event.route_name,
                        "status_code": event.status_code,
                        "success": event.success,
                    },
                )
                await self._insert_metric_point(
                    session,
                    metric_key="endpoint.error_count",
                    metric_value=0 if event.success else 1,
                    metric_unit="count",
                    user_id=event.user_id,
                    occurred_at=event.occurred_at,
                    source=event.route_name or event.path,
                    dimensions={
                        "method": event.method,
                        "path": event.path,
                        "route_name": event.route_name,
                        "status_code": event.status_code,
                        "success": event.success,
                        "error_type": event.error_type,
                    },
                )
                await self._touch_user_activity(
                    session,
                    user_id=event.user_id,
                    occurred_at=event.occurred_at,
                    duration_ms=event.duration_ms,
                    activity_kind="request",
                    feature_name=event.route_name or event.path,
                    source=event.path,
                    success=event.success,
                    error_type=event.error_type,
                )

    async def _persist_user_activity(self, event: UserActivityEvent) -> None:
        async with self.session_factory() as session:
            async with session.begin():
                await self._insert_metric_event(
                    session,
                    event_name="user_activity",
                    event_category="activity",
                    source=event.source or event.activity_kind,
                    occurred_at=event.occurred_at,
                    user_id=event.user_id,
                    session_id=event.session_id,
                    properties=self._event_properties(
                        {
                            "activity_kind": event.activity_kind,
                            "feature_name": event.feature_name,
                            "source": event.source,
                            "duration_ms": event.duration_ms,
                            "success": event.success,
                            "error_type": event.error_type,
                        }
                    ),
                )
                await self._touch_user_activity(
                    session,
                    user_id=event.user_id,
                    occurred_at=event.occurred_at,
                    duration_ms=event.duration_ms,
                    activity_kind=event.activity_kind,
                    feature_name=event.feature_name,
                    source=event.source,
                    success=event.success,
                    error_type=event.error_type,
                )

    async def _insert_metric_event(
        self,
        session: AsyncSession,
        *,
        event_name: str,
        event_category: str | None,
        source: str | None,
        occurred_at: datetime,
        user_id: UUID | None,
        session_id: UUID | None,
        properties: dict[str, Any],
    ) -> None:
        stmt = insert(MetricEvent.__table__).values(
            user_id=user_id,
            event_name=event_name,
            event_category=event_category,
            session_id=session_id,
            source=source,
            occurred_at=occurred_at,
            properties=properties,
        )
        await session.execute(stmt)

    async def _insert_metric_point(
        self,
        session: AsyncSession,
        *,
        metric_key: str,
        metric_value: int | float,
        metric_unit: str | None,
        user_id: UUID | None,
        occurred_at: datetime,
        source: str | None,
        dimensions: dict[str, Any],
    ) -> None:
        bucket_start = self._bucket_start(occurred_at)
        bucket_end = bucket_start + timedelta(minutes=1)
        stmt = insert(MetricDataPoint.__table__).values(
            user_id=user_id,
            metric_key=metric_key,
            metric_unit=metric_unit,
            metric_value=self._metric_value(metric_value),
            metric_count=1,
            bucket_start=bucket_start,
            bucket_end=bucket_end,
            dimensions=dimensions,
            source=source,
        )
        await session.execute(stmt)

    async def _touch_user_activity(
        self,
        session: AsyncSession,
        *,
        user_id: UUID | None,
        occurred_at: datetime,
        duration_ms: int,
        activity_kind: str,
        feature_name: str | None,
        source: str | None,
        success: bool,
        error_type: str | None,
    ) -> None:
        if user_id is None:
            return

        occurred_at = occurred_at.astimezone(timezone.utc)
        bucket_date = occurred_at.date()
        active_seconds = self._duration_seconds(duration_ms)

        stmt = pg_insert(UserActivityDaily.__table__).values(
            user_id=user_id,
            activity_date=bucket_date,
            events_count=1,
            active_seconds=active_seconds,
            first_event_at=occurred_at,
            last_event_at=occurred_at,
        )
        excluded = stmt.excluded
        upsert_stmt = stmt.on_conflict_do_update(
            index_elements=["user_id", "activity_date"],
            set_={
                "events_count": UserActivityDaily.__table__.c.events_count + excluded.events_count,
                "active_seconds": UserActivityDaily.__table__.c.active_seconds + excluded.active_seconds,
                "first_event_at": func.least(
                    func.coalesce(UserActivityDaily.__table__.c.first_event_at, excluded.first_event_at),
                    excluded.first_event_at,
                ),
                "last_event_at": func.greatest(
                    func.coalesce(UserActivityDaily.__table__.c.last_event_at, excluded.last_event_at),
                    excluded.last_event_at,
                ),
            },
        )
        await session.execute(upsert_stmt)

        await session.execute(
            update(AppUser)
            .where(AppUser.id == user_id)
            .values(last_seen_at=occurred_at)
        )


def get_analytics_service(request: Request) -> AnalyticsService:
    service = getattr(request.app.state, "analytics_service", None)
    if service is None:
        service = AnalyticsService()
        request.app.state.analytics_service = service
    return service


@asynccontextmanager
async def track_tool(
    analytics_service: AnalyticsService,
    *,
    tool_name: str,
    user: AuthenticatedPrincipal | None = None,
    tool_slug: str | None = None,
    tool_category: str | None = None,
    input_file_type: str | None = None,
    input_file_size_bytes: int | None = None,
    output_file_type: str | None = None,
    output_file_size_bytes: int | None = None,
) -> AsyncIterator[None]:
    started_at = perf_counter()
    occurred_at = datetime.now(timezone.utc)
    success = True
    error_type: str | None = None
    try:
        yield
    except Exception as exc:
        success = False
        error_type = exc.__class__.__name__
        raise
    finally:
        duration_ms = int((perf_counter() - started_at) * 1000)
        analytics_service.record_tool_usage(
            ToolUsageEvent(
                user_id=user.user_id if user else None,
                session_id=UUID(user.session_id) if user and user.session_id else None,
                occurred_at=occurred_at,
                tool_name=tool_name,
                tool_slug=tool_slug,
                tool_category=tool_category,
                duration_ms=duration_ms,
                success=success,
                error_type=error_type,
                input_file_type=input_file_type,
                input_file_size_bytes=input_file_size_bytes,
                output_file_type=output_file_type,
                output_file_size_bytes=output_file_size_bytes,
            )
        )
