from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

import httpx
from fastapi import Depends
from jose import JWTError, jwt as jose_jwt
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db.models.users import AppUser, UserRole, UserStatus
from app.db.session import get_db_session
from app.schemas.auth import (
    AuthForgotPasswordRequest,
    AuthGoogleRequest,
    AuthLoginRequest,
    AuthLogoutResponse,
    AuthMessageResponse,
    AuthProfileResponse,
    AuthRefreshRequest,
    AuthResetPasswordRequest,
    AuthSessionResponse,
    AuthSignupRequest,
    AuthUpdateProfileRequest,
    AuthVerifyRecoveryRequest,
    AuthVerifyRecoveryResponse,
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

    async def reset_password_for_email(self, email: str, redirect_to: str | None = None) -> None:
        payload: dict[str, Any] = {"email": email}
        params: dict[str, Any] = {}
        if redirect_to:
            params["redirect_to"] = redirect_to
        await self._request("POST", "/recover", json_body=payload, params=params or None)

    async def update_user_password(self, access_token: str, new_password: str) -> None:
        await self._request(
            "PUT",
            "/user",
            json_body={"password": new_password},
            auth_token=access_token,
        )

    async def sign_in_with_id_token(self, provider: str, id_token: str | None = None, access_token: str | None = None) -> _SupabaseSession:
        payload: dict[str, Any] = {"provider": provider}
        if id_token:
            payload["id_token"] = id_token
        if access_token:
            payload["access_token"] = access_token
        data = await self._request(
            "POST",
            "/token",
            params={"grant_type": "id_token"},
            json_body=payload,
        )
        if not isinstance(data, dict):
            raise AuthServiceError("Supabase auth id_token login returned an unexpected response", status_code=502)
        return _SupabaseSession.model_validate(data)

    async def verify_otp(self, token_hash: str, otp_type: str) -> _SupabaseSession:
        data = await self._request(
            "POST",
            "/verify",
            json_body={"token_hash": token_hash, "type": otp_type},
        )
        if not isinstance(data, dict):
            raise AuthServiceError("Supabase OTP verification returned an unexpected response", status_code=502)
        return _SupabaseSession.model_validate(data)

    async def update_user_by_id(self, user_id: str, *, password: str | None = None) -> dict[str, Any]:
        """Update a user via the admin API. Creates an email identity if setting a password on an OAuth-only account."""
        payload: dict[str, Any] = {}
        if password is not None:
            payload["password"] = password
        data = await self._request("PUT", f"/admin/users/{user_id}", json_body=payload)
        if not isinstance(data, dict):
            raise AuthServiceError("Supabase admin user update returned an unexpected response", status_code=502)
        return data


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
        # Read-first: the vast majority of calls (every /auth/me, every
        # authenticated request) hit an existing row that does not need to
        # change. Issuing an INSERT … ON CONFLICT DO UPDATE in that case
        # takes a row-level write lock and amplifies contention under
        # concurrency, which is what caused the statement_timeout on
        # /auth/me in production. Only upsert when something actually has
        # to be written.
        existing = (
            await self.db.execute(select(AppUser).where(AppUser.id == user_id))
        ).scalar_one_or_none()

        if existing is not None and self._profile_is_up_to_date(
            existing,
            email=email,
            display_name=display_name,
            avatar_url=avatar_url,
        ):
            if touch_last_seen:
                await self.db.execute(
                    update(AppUser)
                    .where(AppUser.id == user_id)
                    .values(last_seen_at=func.now())
                )
                await self.db.commit()
                await self.db.refresh(existing)
            return AuthProfileResponse.model_validate(existing)

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
            "display_name": func.coalesce(AppUser.display_name, insert_stmt.excluded.display_name),
            "avatar_url": func.coalesce(AppUser.avatar_url, insert_stmt.excluded.avatar_url),
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

    @staticmethod
    def _profile_is_up_to_date(
        user: AppUser,
        *,
        email: str,
        display_name: str | None,
        avatar_url: str | None,
    ) -> bool:
        """True when the stored row already reflects the provided claims.

        Note: display_name / avatar_url are merged with COALESCE(existing, new)
        in the upsert path, so we treat a non-null existing value as satisfied
        regardless of what the new claim says.
        """

        if user.status != UserStatus.ACTIVE:
            return False
        if user.email != email:
            return False
        if display_name is not None and user.display_name is None:
            return False
        if avatar_url is not None and user.avatar_url is None:
            return False
        return True

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

    async def forgot_password(self, body: AuthForgotPasswordRequest, redirect_to: str | None = None) -> AuthMessageResponse:
        try:
            await self.auth_client.reset_password_for_email(body.email, redirect_to=redirect_to)
        except AuthServiceError:
            pass  # Always return success to prevent email enumeration
        return AuthMessageResponse(detail="If an account exists with that email, a reset link has been sent.")

    async def reset_password(self, body: AuthResetPasswordRequest) -> AuthMessageResponse:
        await self.auth_client.update_user_password(body.access_token, body.new_password)
        # Also set via admin API to ensure an email identity is created for OAuth-only accounts
        try:
            claims = jose_jwt.get_unverified_claims(body.access_token)
            user_id = claims.get("sub")
            if user_id:
                await self.auth_client.update_user_by_id(user_id, password=body.new_password)
        except (JWTError, AuthServiceError, httpx.HTTPError) as exc:
            logging.getLogger(__name__).debug("Admin identity link best-effort failed: %s", exc)
        return AuthMessageResponse(detail="Password updated successfully.")

    async def google_login(self, body: AuthGoogleRequest) -> AuthSessionResponse:
        session = await self.auth_client.sign_in_with_id_token(
            provider="google",
            id_token=body.id_token,
            access_token=body.access_token,
        )
        display_name = session.user.user_metadata.get("full_name") or session.user.user_metadata.get("name")
        avatar_url = session.user.user_metadata.get("avatar_url") or session.user.user_metadata.get("picture")
        profile = await self._ensure_profile(
            user_id=UUID(session.user.id),
            email=session.user.email,
            display_name=display_name,
            avatar_url=avatar_url,
            touch_last_seen=True,
        )
        return AuthSessionResponse(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            token_type=session.token_type,
            expires_in=session.expires_in,
            user=profile,
        )

    async def verify_recovery(self, body: AuthVerifyRecoveryRequest) -> AuthVerifyRecoveryResponse:
        session = await self.auth_client.verify_otp(body.token_hash, body.type)
        return AuthVerifyRecoveryResponse(access_token=session.access_token)

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

        result = await self.db.execute(select(AppUser).where(AppUser.id == user_id))
        user = result.scalar_one_or_none()

        if user is None:
            raise AuthServiceError("Unable to load the authenticated user profile", status_code=500)

        user.display_name = display_name
        user.email = email
        user.updated_at = func.now()  # type: ignore[assignment]
        await self.db.commit()
        await self.db.refresh(user)

        return AuthProfileResponse.model_validate(user)


def get_auth_service(db: AsyncSession = Depends(get_db_session)) -> AuthService:
    return AuthService(db)
