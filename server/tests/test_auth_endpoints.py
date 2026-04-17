from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

import pytest
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from httpx import ASGITransport, AsyncClient

from app.core.security import AuthenticatedPrincipal, get_current_user
from app.routes.auth import router as auth_router
from app.services.auth_service import AuthServiceError, get_auth_service


class FakeAuthService:
    def __init__(self) -> None:
        self._users: dict[str, dict[str, str | None]] = {}

    @staticmethod
    def _profile(email: str, display_name: str | None = None) -> dict[str, object]:
        now = datetime.now(timezone.utc).isoformat()
        return {
            "id": str(uuid4()),
            "email": email,
            "display_name": display_name,
            "avatar_url": None,
            "role": "member",
            "status": "active",
            "metadata_json": {},
            "last_seen_at": None,
            "created_at": now,
            "updated_at": now,
        }

    async def signup(self, body):
        if body.email in self._users:
            raise AuthServiceError("An account with that email already exists", status_code=409)
        self._users[body.email] = {
            "password": body.password,
            "display_name": body.display_name,
        }
        return {
            "access_token": "access-token",
            "refresh_token": "refresh-token",
            "token_type": "bearer",
            "expires_in": 3600,
            "user": self._profile(body.email, body.display_name),
        }

    async def login(self, body):
        user = self._users.get(body.email)
        if user is None or user["password"] != body.password:
            raise AuthServiceError("Invalid email, password, or session", status_code=401)
        return {
            "access_token": "access-token",
            "refresh_token": "refresh-token",
            "token_type": "bearer",
            "expires_in": 3600,
            "user": self._profile(body.email, user["display_name"]),
        }

    async def refresh(self, body):
        if body.refresh_token != "refresh-token":
            raise AuthServiceError("Invalid email, password, or session", status_code=401)
        email = next(iter(self._users), "user@example.com")
        return {
            "access_token": "access-token-2",
            "refresh_token": "refresh-token-2",
            "token_type": "bearer",
            "expires_in": 3600,
            "user": self._profile(email, self._users.get(email, {}).get("display_name")),
        }

    async def logout(self, _token: str):
        return {"detail": "Signed out"}

    async def me(self, _user_id, email: str, _display_name):
        profile_data = self._users.get(email, {})
        return self._profile(email, profile_data.get("display_name"))


async def _auth_service_exception_handler(_: Request, exc: AuthServiceError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@pytest.fixture()
def app() -> FastAPI:
    app = FastAPI()
    app.include_router(auth_router)
    app.add_exception_handler(AuthServiceError, _auth_service_exception_handler)
    return app


@pytest.fixture()
async def client(app: FastAPI):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as async_client:
        yield async_client


@pytest.mark.asyncio
async def test_signup_and_duplicate_email(app: FastAPI, client: AsyncClient):
    fake_service = FakeAuthService()
    app.dependency_overrides[get_auth_service] = lambda: fake_service

    response = await client.post(
        "/auth/signup",
        json={"email": "new@example.com", "password": "Password123!", "display_name": "New User"},
    )
    assert response.status_code == 200
    assert response.json()["user"]["email"] == "new@example.com"

    duplicate = await client.post(
        "/auth/signup",
        json={"email": "new@example.com", "password": "Password123!", "display_name": "Again"},
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "An account with that email already exists"


@pytest.mark.asyncio
async def test_login_happy_and_wrong_password(app: FastAPI, client: AsyncClient):
    fake_service = FakeAuthService()
    app.dependency_overrides[get_auth_service] = lambda: fake_service

    await client.post(
        "/auth/signup",
        json={"email": "member@example.com", "password": "Password123!", "display_name": "Member"},
    )

    ok = await client.post("/auth/login", json={"email": "member@example.com", "password": "Password123!"})
    assert ok.status_code == 200
    assert ok.json()["access_token"] == "access-token"

    wrong_password = await client.post(
        "/auth/login",
        json={"email": "member@example.com", "password": "bad-password"},
    )
    assert wrong_password.status_code == 401
    assert wrong_password.json()["detail"] == "Invalid email, password, or session"


@pytest.mark.asyncio
async def test_refresh_happy_and_invalid_token(app: FastAPI, client: AsyncClient):
    fake_service = FakeAuthService()
    app.dependency_overrides[get_auth_service] = lambda: fake_service

    await client.post(
        "/auth/signup",
        json={"email": "refresh@example.com", "password": "Password123!", "display_name": "Refresh"},
    )

    ok = await client.post("/auth/refresh", json={"refresh_token": "refresh-token"})
    assert ok.status_code == 200
    assert ok.json()["refresh_token"] == "refresh-token-2"

    invalid = await client.post("/auth/refresh", json={"refresh_token": "invalid"})
    assert invalid.status_code == 401
    assert invalid.json()["detail"] == "Invalid email, password, or session"


@pytest.mark.asyncio
async def test_me_missing_token_returns_401(client: AsyncClient):
    response = await client.get("/auth/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "Missing bearer token"


@pytest.mark.asyncio
async def test_me_invalid_token_returns_401(client: AsyncClient):
    response = await client.get("/auth/me", headers={"Authorization": "Bearer malformed-token"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid token"


@pytest.mark.asyncio
async def test_me_happy_path(app: FastAPI, client: AsyncClient):
    fake_service = FakeAuthService()
    app.dependency_overrides[get_auth_service] = lambda: fake_service

    principal = AuthenticatedPrincipal(
        user_id=uuid4(),
        email="me@example.com",
        role="member",
        session_id=None,
        claims={"sub": "me"},
    )
    app.dependency_overrides[get_current_user] = lambda: principal

    response = await client.get("/auth/me", headers={"Authorization": "Bearer any-token"})
    assert response.status_code == 200
    assert response.json()["email"] == "me@example.com"


@pytest.mark.asyncio
async def test_logout_happy_and_missing_token(app: FastAPI, client: AsyncClient):
    fake_service = FakeAuthService()
    app.dependency_overrides[get_auth_service] = lambda: fake_service

    principal = AuthenticatedPrincipal(
        user_id=uuid4(),
        email="logout@example.com",
        role="member",
        session_id=None,
        claims={"sub": "logout"},
    )
    app.dependency_overrides[get_current_user] = lambda: principal

    ok = await client.post("/auth/logout", headers={"Authorization": "Bearer good-token"})
    assert ok.status_code == 200
    assert ok.json()["detail"] == "Signed out"

    app.dependency_overrides.pop(get_current_user)
    missing = await client.post("/auth/logout")
    assert missing.status_code == 401
    assert missing.json()["detail"] == "Missing bearer token"
