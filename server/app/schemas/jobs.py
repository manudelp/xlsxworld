"""Pydantic schemas for the ``/api/v1/me/jobs`` endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class JobItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tool_slug: str
    tool_name: str
    original_filename: str | None
    output_filename: str
    mime_type: str
    output_size_bytes: int
    success: bool
    error_type: str | None
    duration_ms: int | None
    expires_at: datetime
    created_at: datetime
    expired: bool


class JobsListResponse(BaseModel):
    items: list[JobItem]


