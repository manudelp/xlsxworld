from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AnalyticsEventBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: UUID | None = None
    session_id: UUID | None = None
    occurred_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ToolUsageEvent(AnalyticsEventBase):
    tool_name: str = Field(min_length=1, max_length=120)
    tool_slug: str | None = Field(default=None, max_length=120)
    tool_category: str | None = Field(default=None, max_length=80)
    duration_ms: int = Field(ge=0)
    success: bool = True
    error_type: str | None = Field(default=None, max_length=120)
    input_file_type: str | None = Field(default=None, max_length=32)
    input_file_size_bytes: int | None = Field(default=None, ge=0)
    output_file_type: str | None = Field(default=None, max_length=32)
    output_file_size_bytes: int | None = Field(default=None, ge=0)


class FileUploadEvent(AnalyticsEventBase):
    file_name: str | None = Field(default=None, max_length=255)
    file_type: str = Field(min_length=1, max_length=32)
    file_size_bytes: int = Field(ge=0)
    processing_time_ms: int = Field(ge=0)
    success: bool = True
    error_type: str | None = Field(default=None, max_length=120)


class EndpointPerformanceEvent(AnalyticsEventBase):
    method: str = Field(min_length=1, max_length=16)
    path: str = Field(min_length=1, max_length=255)
    status_code: int = Field(ge=100, le=599)
    duration_ms: int = Field(ge=0)
    success: bool = True
    error_type: str | None = Field(default=None, max_length=120)
    route_name: str | None = Field(default=None, max_length=120)


class UserActivityEvent(AnalyticsEventBase):
    activity_kind: str = Field(min_length=1, max_length=40)
    feature_name: str | None = Field(default=None, max_length=120)
    source: str | None = Field(default=None, max_length=120)
    duration_ms: int = Field(default=0, ge=0)
    success: bool = True
    error_type: str | None = Field(default=None, max_length=120)
