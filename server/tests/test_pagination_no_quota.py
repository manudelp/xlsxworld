"""Prove that pagination / batch-loading does NOT count as a job.

The Inspect Sheets tool has two endpoints:
  POST /api/v1/tools/inspect/preview  → uploads a file (1 job)
  GET  /api/v1/tools/inspect/sheet    → pages through rows (0 jobs)

Before the fix, both routes lived under the same quota-enforced router,
so every page fetch incremented the daily counter.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import Depends

from app.core.app_factory import create_app
from app.core.quota_guard import enforce_quota


def _collect_routes(app):
    """Return a dict mapping (method, path) → list of dependency callables."""
    routes = {}
    for route in app.routes:
        path = getattr(route, "path", None)
        methods = getattr(route, "methods", None)
        deps = getattr(route, "dependencies", None) or []
        dep_callables = [d.dependency for d in deps if hasattr(d, "dependency")]
        if path and methods:
            for method in methods:
                routes[(method.upper(), path)] = dep_callables
    return routes


def test_preview_route_has_quota_enforcement():
    """POST /preview must be quota-enforced (it's the real job)."""
    app = create_app()
    routes = _collect_routes(app)
    deps = routes.get(("POST", "/api/v1/tools/inspect/preview"), [])
    assert enforce_quota in deps, "preview route must enforce quota"


def test_page_sheet_route_has_no_quota_enforcement():
    """GET /sheet must NOT be quota-enforced (it's pagination)."""
    app = create_app()
    routes = _collect_routes(app)
    deps = routes.get(("GET", "/api/v1/tools/inspect/sheet"), [])
    assert enforce_quota not in deps, (
        "page_sheet route must NOT enforce quota — pagination is not a job"
    )


def test_analytics_middleware_skips_pagination():
    """The analytics middleware must not record tool_usage for pagination."""
    from app.middleware.analytics import AnalyticsMiddleware

    assert AnalyticsMiddleware._is_pagination_request("/api/v1/tools/inspect/sheet", "GET")
    assert not AnalyticsMiddleware._is_pagination_request("/api/v1/tools/inspect/preview", "POST")
    assert not AnalyticsMiddleware._is_pagination_request("/api/v1/tools/inspect/sheet", "POST")


def test_other_tool_routes_still_have_quota():
    """Sanity check: non-pagination tool routes must still enforce quota."""
    app = create_app()
    routes = _collect_routes(app)

    # Spot-check a few tool routes that must remain quota-enforced
    for path in [
        "/api/v1/tools/inspect/preview",
        "/api/v1/tools/convert/csv-to-xlsx",
        "/api/v1/tools/clean/find-replace",
    ]:
        for method in ("POST",):
            deps = routes.get((method, path), [])
            assert enforce_quota in deps, (
                f"{method} {path} must enforce quota"
            )
