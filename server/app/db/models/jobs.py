from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, LargeBinary, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models._mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.db.models.users import AppUser


class ToolJob(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "tool_jobs"

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    tool_slug: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    tool_name: Mapped[str] = mapped_column(String(180), nullable=False)
    original_filename: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_filename: Mapped[str] = mapped_column(Text, nullable=False)
    storage_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    encryption_blob: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    mime_type: Mapped[str] = mapped_column(String(180), nullable=False)
    output_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    error_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    user: Mapped["AppUser | None"] = relationship(back_populates="tool_jobs")

    __table_args__ = (
        Index("ix_tool_jobs_user_created_at", "user_id", "created_at"),
    )
