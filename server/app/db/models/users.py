from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum as SAEnum, Index, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.analytics import MetricDataPoint, MetricEvent, UserActivityDaily
    from app.db.models.billing import BillingInvoice, UserSubscription
    from app.db.models.jobs import ToolJob


class UserRole(str, Enum):
    ADMIN = "admin"
    MEMBER = "member"
    ANALYST = "analyst"
    SUPPORT = "support"


class UserStatus(str, Enum):
    ACTIVE = "active"
    PENDING = "pending"
    SUSPENDED = "suspended"
    DELETED = "deleted"


class AppUser(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        nullable=False,
    )
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True, index=True)
    display_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_role", native_enum=False),
        nullable=False,
        default=UserRole.MEMBER,
        server_default=UserRole.MEMBER.value,
    )
    status: Mapped[UserStatus] = mapped_column(
        SAEnum(UserStatus, name="user_status", native_enum=False),
        nullable=False,
        default=UserStatus.ACTIVE,
        server_default=UserStatus.ACTIVE.value,
    )
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_json: Mapped[dict] = mapped_column(
        "metadata",
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    metric_events: Mapped[list["MetricEvent"]] = relationship(back_populates="user")
    activity_daily: Mapped[list["UserActivityDaily"]] = relationship(back_populates="user")
    metric_data_points: Mapped[list["MetricDataPoint"]] = relationship(back_populates="user")
    subscriptions: Mapped[list["UserSubscription"]] = relationship(back_populates="user")
    invoices: Mapped[list["BillingInvoice"]] = relationship(back_populates="user")
    tool_jobs: Mapped[list["ToolJob"]] = relationship(back_populates="user")

    __table_args__ = (
        Index("ix_users_role_status", "role", "status"),
    )
