from __future__ import annotations

from typing import Any
from uuid import UUID

import httpx
from fastapi import Depends
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db.models.users import AppUser, UserRole, UserStatus
from app.db.session import get_db_session
from app.schemas.auth import (
    AuthLoginRequest,
    AuthLogoutResponse,
    AuthProfileResponse,
    AuthRefreshRequest,
    AuthSessionResponse,
    AuthSignupRequest,
    AuthUpdateProfileRequest,
)


class AuthServiceError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class _SupabaseAuthUser(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    email: EmailStr
    user_metadata: dict[str, Any] = Field(default_factory=dict)
    app_metadata: dict[str, Any] = Field(default_factory=dict)


class _SupabaseSession(BaseModel):
    model_config = ConfigDict(extra="ignore")

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int | None = None
    user: _SupabaseAuthUser


class SupabaseAuthClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        if not self.settings.supabase_secret_key:
            raise RuntimeError("SUPABASE_SECRET_KEY is not configured")
        self._base_url = self.settings.supabase_auth_url
        self._headers = {
            "apikey": self.settings.supabase_secret_key,
            "Authorization": f"Bearer {self.settings.supabase_secret_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json_body: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
        auth_token: str | None = None,
    ) -> Any:
        headers = dict(self._headers)
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"

        async with httpx.AsyncClient(base_url=self._base_url, timeout=20.0) as client:
            response = await client.request(method, path, headers=headers, json=json_body, params=params)

        if response.status_code >= 400:
            self._raise_for_error(response)

        if response.status_code == 204 or not response.content:
            return None
        return response.json()

    def _raise_for_error(self, response: httpx.Response) -> None:
        try:
            payload = response.json()
        except ValueError:
            payload = {"message": response.text}

        message = str(
            payload.get("msg")
            or payload.get("error_description")
            or payload.get("error")
            or payload.get("message")
            or "Supabase auth request failed"
        )
        error_code = str(payload.get("error_code") or payload.get("code") or "")
        normalized_message = message.lower()

        if response.status_code == 401 or error_code in {"invalid_grant", "bad_jwt"}:
            raise AuthServiceError("Invalid email, password, or session", status_code=401)
        if response.status_code == 403:
            raise AuthServiceError("Forbidden", status_code=403)
        if response.status_code == 404:
            raise AuthServiceError("Authentication resource not found", status_code=404)
        if response.status_code == 409 or "already registered" in normalized_message or "already exists" in normalized_message:
            raise AuthServiceError("An account with that email already exists", status_code=409)
        if response.status_code == 422:
            raise AuthServiceError("Unable to process the authentication request", status_code=422)
        if response.status_code == 400:
            raise AuthServiceError("Invalid email or password", status_code=400)

        raise AuthServiceError("Something went wrong. Please try again.", status_code=502)

    async def create_user(self, email: str, password: str, display_name: str | None = None) -> _SupabaseAuthUser:
        payload: dict[str, Any] = {
            "email": email,
            "password": password,
            "email_confirm": True,
        }
        if display_name:
            payload["user_metadata"] = {"display_name": display_name}

        data = await self._request("POST", "/admin/users", json_body=payload)
        if not isinstance(data, dict):
            raise AuthServiceError("Supabase auth user creation returned an unexpected response", status_code=502)
        return _SupabaseAuthUser.model_validate(data)

    async def sign_in_with_password(self, email: str, password: str) -> _SupabaseSession:
        data = await self._request(
            "POST",
            "/token",
            params={"grant_type": "password"},
            json_body={"email": email, "password": password},
        )
        if not isinstance(data, dict):
            raise AuthServiceError("Supabase auth login returned an unexpected response", status_code=502)
        return _SupabaseSession.model_validate(data)

    async def refresh_session(self, refresh_token: str) -> _SupabaseSession:
        data = await self._request(
            "POST",
            "/token",
            params={"grant_type": "refresh_token"},
            json_body={"refresh_token": refresh_token},
        )
        if not isinstance(data, dict):
            raise AuthServiceError("Supabase auth refresh returned an unexpected response", status_code=502)
        return _SupabaseSession.model_validate(data)

    async def sign_out(self, access_token: str) -> None:
        await self._request("POST", "/logout", params={"scope": "local"}, auth_token=access_token)


class AuthService:
    def __init__(self, db: AsyncSession, settings: Settings | None = None) -> None:
        self.db = db
        self.settings = settings or get_settings()
        self.auth_client = SupabaseAuthClient(self.settings)

    async def _ensure_profile(
        self,
        *,
        user_id: UUID,
        email: str,
        display_name: str | None = None,
        avatar_url: str | None = None,
        touch_last_seen: bool = False,
    ) -> AuthProfileResponse:
        profile_values: dict[str, Any] = {
            "id": user_id,
            "email": email,
            "display_name": display_name,
            "avatar_url": avatar_url,
            "role": UserRole.MEMBER,
            "status": UserStatus.ACTIVE,
            "metadata_json": {},
        }
        if touch_last_seen:
            profile_values["last_seen_at"] = func.now()

        insert_stmt = insert(AppUser).values(**profile_values)
        update_values: dict[str, Any] = {
            "email": insert_stmt.excluded.email,
            "display_name": func.coalesce(insert_stmt.excluded.display_name, AppUser.display_name),
            "avatar_url": func.coalesce(insert_stmt.excluded.avatar_url, AppUser.avatar_url),
            "status": UserStatus.ACTIVE,
        }
        if touch_last_seen:
            update_values["last_seen_at"] = func.now()

        upsert_stmt = insert_stmt.on_conflict_do_update(index_elements=[AppUser.id], set_=update_values)
        await self.db.execute(upsert_stmt)
        await self.db.commit()

        result = await self.db.execute(select(AppUser).where(AppUser.id == user_id))
        user = result.scalar_one_or_none()
        if user is None:
            raise AuthServiceError("Unable to load the authenticated user profile", status_code=500)
        return AuthProfileResponse.model_validate(user)

    async def signup(self, body: AuthSignupRequest) -> AuthSessionResponse:
        auth_user = await self.auth_client.create_user(body.email, body.password, body.display_name)
        session = await self.auth_client.sign_in_with_password(body.email, body.password)

        profile = await self._ensure_profile(
            user_id=UUID(auth_user.id),
            email=auth_user.email,
            display_name=body.display_name or auth_user.user_metadata.get("display_name"),
            touch_last_seen=True,
        )
        return AuthSessionResponse(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            token_type=session.token_type,
            expires_in=session.expires_in,
            user=profile,
        )

    async def login(self, body: AuthLoginRequest) -> AuthSessionResponse:
        session = await self.auth_client.sign_in_with_password(body.email, body.password)
        profile = await self._ensure_profile(
            user_id=UUID(session.user.id),
            email=session.user.email,
            display_name=session.user.user_metadata.get("display_name"),
            touch_last_seen=True,
        )
        return AuthSessionResponse(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            token_type=session.token_type,
            expires_in=session.expires_in,
            user=profile,
        )

    async def refresh(self, body: AuthRefreshRequest) -> AuthSessionResponse:
        session = await self.auth_client.refresh_session(body.refresh_token)
        profile = await self._ensure_profile(
            user_id=UUID(session.user.id),
            email=session.user.email,
            display_name=session.user.user_metadata.get("display_name"),
        )
        return AuthSessionResponse(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            token_type=session.token_type,
            expires_in=session.expires_in,
            user=profile,
        )

    async def logout(self, access_token: str) -> AuthLogoutResponse:
        await self.auth_client.sign_out(access_token)
        return AuthLogoutResponse()

    async def me(self, user_id: UUID, email: str, display_name: str | None = None) -> AuthProfileResponse:
        return await self._ensure_profile(user_id=user_id, email=email, display_name=display_name)

    async def update_profile(
        self,
        user_id: UUID,
        email: str,
        body: AuthUpdateProfileRequest,
    ) -> AuthProfileResponse:
        display_name = body.display_name.strip() if body.display_name is not None else None
        if display_name == "":
            display_name = None

        profile_values: dict[str, Any] = {
            "id": user_id,
            "email": email,
            "display_name": display_name,
            "avatar_url": None,
            "role": UserRole.MEMBER,
            "status": UserStatus.ACTIVE,
            "metadata_json": {},
            "updated_at": func.now(),
        }

        insert_stmt = insert(AppUser).values(**profile_values)
        update_values: dict[str, Any] = {
            "email": insert_stmt.excluded.email,
            "display_name": insert_stmt.excluded.display_name,
            "avatar_url": insert_stmt.excluded.avatar_url,
            "status": UserStatus.ACTIVE,
            "updated_at": func.now(),
        }

        upsert_stmt = insert_stmt.on_conflict_do_update(index_elements=[AppUser.id], set_=update_values)
        await self.db.execute(upsert_stmt)
        await self.db.commit()

        result = await self.db.execute(select(AppUser).where(AppUser.id == user_id))
        user = result.scalar_one_or_none()
        if user is None:
            raise AuthServiceError("Unable to load the authenticated user profile", status_code=500)
        return AuthProfileResponse.model_validate(user)


def get_auth_service(db: AsyncSession = Depends(get_db_session)) -> AuthService:
    return AuthService(db)
