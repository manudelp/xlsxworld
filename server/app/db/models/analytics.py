from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models._mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.db.models.users import AppUser


class MetricEvent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "metric_events"

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    event_name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    event_category: Mapped[str | None] = mapped_column(String(80), nullable=True)
    session_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    source: Mapped[str | None] = mapped_column(String(80), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    properties_json: Mapped[dict] = mapped_column(
        "properties",
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )

    user: Mapped["AppUser | None"] = relationship(back_populates="metric_events")

    __table_args__ = (
        Index("ix_metric_events_name_occurred", "event_name", "occurred_at"),
    )


class UserActivityDaily(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "user_activity_daily"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    activity_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    events_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    active_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    first_event_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_event_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["AppUser"] = relationship(back_populates="activity_daily")

    __table_args__ = (
        UniqueConstraint("user_id", "activity_date", name="uq_user_activity_daily_user_id_activity_date"),
    )


class MetricDataPoint(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "metric_data_points"

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    metric_key: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    metric_unit: Mapped[str | None] = mapped_column(String(32), nullable=True)
    metric_value: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    metric_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    bucket_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    bucket_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    dimensions_json: Mapped[dict] = mapped_column(
        "dimensions",
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )
    source: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["AppUser | None"] = relationship(back_populates="metric_data_points")

    __table_args__ = (
        Index("ix_metric_data_points_key_bucket_start", "metric_key", "bucket_start"),
    )
