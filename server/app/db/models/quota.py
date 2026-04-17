from __future__ import annotations

from datetime import date

from sqlalchemy import Date, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models._mixins import TimestampMixin, UUIDPrimaryKeyMixin


class ToolRequestCounter(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Per-day counter of tool requests per key.

    ``key`` is a tier-prefixed identifier: ``user:<uuid>`` for
    authenticated callers, ``ip:<address>`` for anonymous ones. Using a
    single column (instead of a ``user_id`` FK + a nullable ``ip``)
    keeps the increment query tier-agnostic and the unique index
    minimal.
    """

    __tablename__ = "tool_request_counters"

    key: Mapped[str] = mapped_column(String(180), nullable=False)
    day_utc: Mapped[date] = mapped_column(Date, nullable=False)
    count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint("key", "day_utc", name="uq_tool_request_counters_key_day"),
        Index("ix_tool_request_counters_key_day", "key", "day_utc"),
    )
