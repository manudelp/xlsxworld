from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

import pytest

from app.db.models.users import AppUser, UserRole, UserStatus
from app.db import session as db_session
from app.schemas.auth import AuthSignupRequest
from app.services import auth_service as auth_service_module


class DummyScalarResult:
    def __init__(self, value):
        self._value = value

    def scalar_one_or_none(self):
        return self._value


class DummyAsyncSession:
    def __init__(self, returned_user: AppUser):
        self.returned_user = returned_user
        self.executed_statements: list[object] = []
        self.commit_calls = 0

    async def execute(self, stmt):
        self.executed_statements.append(stmt)
        if len(self.executed_statements) == 1:
            return DummyScalarResult(None)
        return DummyScalarResult(self.returned_user)

    async def commit(self):
        self.commit_calls += 1


class DummySessionContext:
    def __init__(self, session_obj):
        self.session_obj = session_obj

    async def __aenter__(self):
        return self.session_obj

    async def __aexit__(self, exc_type, exc, tb):
        return False


class DummySessionFactory:
    def __init__(self, session_obj):
        self.session_obj = session_obj

    def __call__(self):
        return DummySessionContext(self.session_obj)


@pytest.mark.asyncio
async def test_get_db_session_yields_session(monkeypatch: pytest.MonkeyPatch):
    expected_session = object()
    monkeypatch.setattr(db_session, "AsyncSessionFactory", DummySessionFactory(expected_session))

    sessions = []
    async for session in db_session.get_db_session():
        sessions.append(session)

    assert sessions == [expected_session]


@pytest.mark.asyncio
async def test_signup_triggers_users_upsert(monkeypatch: pytest.MonkeyPatch):
    fixed_user_id = UUID("11111111-1111-1111-1111-111111111111")

    class FakeSupabaseAuthClient:
        def __init__(self, _settings=None):
            pass

        async def create_user(self, email: str, _password: str, display_name: str | None = None):
            return auth_service_module._SupabaseAuthUser(
                id=str(fixed_user_id),
                email=email,
                user_metadata={"display_name": display_name or ""},
                app_metadata={},
            )

        async def sign_in_with_password(self, email: str, _password: str):
            return auth_service_module._SupabaseSession(
                access_token="access-token",
                refresh_token="refresh-token",
                token_type="bearer",
                expires_in=3600,
                user=auth_service_module._SupabaseAuthUser(
                    id=str(fixed_user_id),
                    email=email,
                    user_metadata={"display_name": "DB User"},
                    app_metadata={},
                ),
            )

    monkeypatch.setattr(auth_service_module, "SupabaseAuthClient", FakeSupabaseAuthClient)

    app_user = AppUser(
        id=fixed_user_id,
        email="db@example.com",
        display_name="DB User",
        avatar_url=None,
        role=UserRole.MEMBER,
        status=UserStatus.ACTIVE,
        metadata_json={},
        last_seen_at=None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    fake_db = DummyAsyncSession(app_user)

    service = auth_service_module.AuthService(fake_db)
    response = await service.signup(
        AuthSignupRequest(email="db@example.com", password="Password123!", display_name="DB User")
    )

    assert fake_db.commit_calls == 1
    assert fake_db.executed_statements, "Expected at least one SQL statement"

    first_stmt_sql = str(fake_db.executed_statements[0]).upper()
    assert "INSERT INTO" in first_stmt_sql
    assert "USERS" in first_stmt_sql
    assert "ON CONFLICT" in first_stmt_sql

    assert response.user.email == "db@example.com"
    assert str(response.user.id) == str(fixed_user_id)
