from __future__ import annotations

import asyncio
import time

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.middleware.analytics import AnalyticsMiddleware
from app.services.analytics_service import AnalyticsService


class SpyAnalyticsService:
    def __init__(self) -> None:
        self.endpoint_events: list[object] = []
        self.tool_events: list[object] = []
        self.file_events: list[object] = []

    def record_endpoint_performance(self, event):
        self.endpoint_events.append(event)

    def record_tool_usage(self, event):
        self.tool_events.append(event)

    def record_file_upload(self, event):
        self.file_events.append(event)


@pytest.fixture()
def app(monkeypatch: pytest.MonkeyPatch) -> FastAPI:
    async def no_principal(self, _request):
        return None

    monkeypatch.setattr(AnalyticsMiddleware, "_resolve_principal", no_principal)

    app = FastAPI()
    app.add_middleware(AnalyticsMiddleware)

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    @app.get("/api/health")
    async def api_health():
        return {"status": "ok"}

    @app.get("/api/v1/tools/inspect/preview")
    async def preview():
        return {"ok": True}

    @app.get("/auth/me")
    async def auth_me():
        return {"ok": True}

    @app.get("/ok")
    async def ok():
        return {"ok": True}

    return app


@pytest.mark.asyncio
async def test_excluded_health_and_docs_paths_emit_no_events(app: FastAPI):
    spy = SpyAnalyticsService()
    app.state.analytics_service = spy

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.get("/health")
        await client.get("/api/health")
        await client.get("/docs")
        await client.get("/redoc")
        await client.get("/openapi.json")

    assert spy.endpoint_events == []
    assert spy.tool_events == []
    assert spy.file_events == []


@pytest.mark.asyncio
async def test_tool_path_emits_endpoint_and_tool_events(app: FastAPI):
    spy = SpyAnalyticsService()
    app.state.analytics_service = spy

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/tools/inspect/preview")

    assert response.status_code == 200
    assert len(spy.endpoint_events) == 1
    assert len(spy.tool_events) == 1


@pytest.mark.asyncio
async def test_auth_me_get_is_not_tracked(app: FastAPI):
    spy = SpyAnalyticsService()
    app.state.analytics_service = spy

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/auth/me")

    assert response.status_code == 200
    assert spy.endpoint_events == []
    assert spy.tool_events == []
    assert spy.file_events == []


@pytest.mark.asyncio
async def test_analytics_service_fire_and_forget_does_not_block_response(app: FastAPI, monkeypatch: pytest.MonkeyPatch):
    service = AnalyticsService()
    app.state.analytics_service = service

    started = asyncio.Event()
    finished = asyncio.Event()

    async def delayed_persist(_event):
        started.set()
        await asyncio.sleep(0.35)
        finished.set()

    monkeypatch.setattr(service, "_persist_endpoint_performance", delayed_persist)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        t0 = time.perf_counter()
        response = await client.get("/ok")
        elapsed = time.perf_counter() - t0

    assert response.status_code == 200
    assert elapsed < 0.2
    await asyncio.wait_for(started.wait(), timeout=1.0)
    await asyncio.wait_for(finished.wait(), timeout=1.0)
