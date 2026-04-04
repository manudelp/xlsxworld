from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.db.models.users import UserRole, UserStatus


class AuthSignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=256)
    display_name: str | None = Field(default=None, max_length=150)


class AuthLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class AuthRefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class AuthUpdateProfileRequest(BaseModel):
    display_name: str | None = Field(default=None, max_length=150)


class AuthProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    display_name: str | None = None
    avatar_url: str | None = None
    role: UserRole
    status: UserStatus
    metadata_json: dict[str, Any] = Field(default_factory=dict)
    last_seen_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class AuthSessionResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int | None = None
    user: AuthProfileResponse


class AuthLogoutResponse(BaseModel):
    detail: str = "Signed out"
