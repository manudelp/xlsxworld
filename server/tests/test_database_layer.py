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

    emitted_sql = [str(stmt).upper() for stmt in fake_db.executed_statements]
    upsert_matches = [
        sql for sql in emitted_sql
        if "INSERT INTO" in sql and "USERS" in sql and "ON CONFLICT" in sql
    ]
    assert upsert_matches, f"Expected an UPSERT on users, got: {emitted_sql}"

    assert response.user.email == "db@example.com"
    assert str(response.user.id) == str(fixed_user_id)


class _SpySession:
    """Async session double that replays a scripted set of SELECT results.

    Each call to ``execute`` records the compiled SQL; SELECTs return the
    next item off the scripted results queue (``None`` means no row).
    Writes (INSERT/UPDATE) are no-ops and return a None-valued result.
    """

    def __init__(self, select_results: list[AppUser | None]) -> None:
        self._select_results = list(select_results)
        self.statements: list[str] = []
        self.commit_calls = 0
        self.refreshed: list[AppUser] = []

    async def execute(self, stmt):
        sql = str(stmt).upper()
        self.statements.append(sql)
        if sql.lstrip().startswith("SELECT"):
            value = self._select_results.pop(0) if self._select_results else None
            return DummyScalarResult(value)
        return DummyScalarResult(None)

    async def commit(self):
        self.commit_calls += 1

    async def refresh(self, obj):
        self.refreshed.append(obj)


def _app_user(user_id: UUID, **overrides) -> AppUser:
    defaults = dict(
        id=user_id,
        email="user@example.com",
        display_name="User",
        avatar_url=None,
        role=UserRole.MEMBER,
        status=UserStatus.ACTIVE,
        metadata_json={},
        last_seen_at=None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    defaults.update(overrides)
    return AppUser(**defaults)


@pytest.mark.asyncio
async def test_ensure_profile_skips_upsert_when_row_is_up_to_date():
    user_id = UUID("22222222-2222-2222-2222-222222222222")
    existing = _app_user(user_id, email="hot@path.com", display_name="Existing")
    session = _SpySession([existing])
    service = auth_service_module.AuthService(session)  # type: ignore[arg-type]

    profile = await service._ensure_profile(
        user_id=user_id, email="hot@path.com", display_name=None
    )

    assert profile.email == "hot@path.com"
    assert session.commit_calls == 0, "Hot path should not commit"
    upserts = [sql for sql in session.statements if "ON CONFLICT" in sql]
    assert upserts == [], f"Hot path should not issue an UPSERT, got: {session.statements}"


@pytest.mark.asyncio
async def test_ensure_profile_touch_last_seen_uses_narrow_update_not_upsert():
    user_id = UUID("33333333-3333-3333-3333-333333333333")
    existing = _app_user(user_id, email="me@x.com", display_name="Me")
    session = _SpySession([existing])
    service = auth_service_module.AuthService(session)  # type: ignore[arg-type]

    await service._ensure_profile(
        user_id=user_id, email="me@x.com", display_name=None, touch_last_seen=True
    )

    assert session.commit_calls == 1
    upserts = [sql for sql in session.statements if "ON CONFLICT" in sql]
    updates = [
        sql for sql in session.statements
        if sql.lstrip().startswith("UPDATE") and "LAST_SEEN_AT" in sql
    ]
    assert upserts == [], "touch_last_seen on existing row must not trigger an UPSERT"
    assert len(updates) == 1, f"Expected a single narrow UPDATE, got: {session.statements}"


@pytest.mark.asyncio
async def test_ensure_profile_upserts_when_row_is_missing():
    user_id = UUID("44444444-4444-4444-4444-444444444444")
    created = _app_user(user_id, email="new@x.com", display_name=None)
    # First SELECT: row missing. Second SELECT (post-upsert): created row.
    session = _SpySession([None, created])
    service = auth_service_module.AuthService(session)  # type: ignore[arg-type]

    profile = await service._ensure_profile(
        user_id=user_id, email="new@x.com", display_name=None
    )

    assert profile.email == "new@x.com"
    assert session.commit_calls == 1
    upserts = [sql for sql in session.statements if "ON CONFLICT" in sql]
    assert len(upserts) == 1, "Missing row must fall through to an UPSERT"


@pytest.mark.asyncio
async def test_analytics_touch_user_activity_does_not_write_to_app_users():
    """Regression: the analytics fire-and-forget task used to issue
    ``UPDATE users SET last_seen_at = …`` on every tracked request, which
    acquired a row-level lock on the logged-in user's row and serialized
    against the synchronous ``_ensure_profile`` UPSERT. That caused
    Supabase's ``statement_timeout`` to fire on /auth/me under concurrency.
    The auth service already maintains ``last_seen_at`` on signup/login/
    refresh, so analytics must not touch ``app_users``.
    """

    from app.services.analytics_service import AnalyticsService

    recorded_statements: list[str] = []

    class RecordingSession:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

        def begin(self):
            class _Txn:
                async def __aenter__(_self):
                    return _self

                async def __aexit__(_self, *exc):
                    return False

            return _Txn()

        async def execute(self, stmt):
            recorded_statements.append(str(stmt).upper())
            return DummyScalarResult(None)

    def factory():
        return RecordingSession()

    service = AnalyticsService(session_factory=factory)  # type: ignore[arg-type]
    await service._touch_user_activity(
        RecordingSession(),
        user_id=UUID("55555555-5555-5555-5555-555555555555"),
        occurred_at=datetime.now(timezone.utc),
        duration_ms=42,
        activity_kind="request",
        feature_name="x",
        source="x",
        success=True,
        error_type=None,
    )

    touched_users = [
        sql for sql in recorded_statements
        if sql.lstrip().startswith("UPDATE") and "USERS" in sql.split("SET", 1)[0]
    ]
    assert touched_users == [], (
        "Analytics must not update app_users; this caused lock contention "
        f"with _ensure_profile. Got: {recorded_statements}"
    )
