from __future__ import annotations

from datetime import datetime, timezone
from time import perf_counter
from uuid import UUID

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from app.core.security import AuthenticatedPrincipal, verify_supabase_token
from app.schemas.analytics import EndpointPerformanceEvent, FileUploadEvent, ToolUsageEvent
from app.services.analytics_service import AnalyticsService, get_analytics_service


class AnalyticsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        path = request.url.path
        analytics_service = get_analytics_service(request)
        started_at = perf_counter()
        occurred_at = datetime.now(timezone.utc)
        principal = await self._resolve_principal(request)
        request.state.analytics_principal = principal
        response: Response | None = None
        error_type: str | None = None
        status_code = 500
        route_name: str | None = None
        tool_slug: str | None = None
        is_tool_request = path.startswith("/api/v1/tools/")
        content_type = request.headers.get("content-type", "").lower()
        content_length = request.headers.get("content-length")

        try:
            response = await call_next(request)
            status_code = response.status_code
            route = request.scope.get("route")
            route_name = getattr(route, "name", None)
            return response
        except Exception as exc:
            error_type = exc.__class__.__name__
            raise
        finally:
            if not self._should_skip_tracking(path, request.method, route_name):
                if status_code >= 400 and error_type is None:
                    error_type = f"HTTP_{status_code}"

                analytics_service.record_endpoint_performance(
                    EndpointPerformanceEvent(
                        user_id=principal.user_id if principal else None,
                        session_id=UUID(principal.session_id) if principal and principal.session_id else None,
                        occurred_at=occurred_at,
                        method=request.method,
                        path=path,
                        status_code=status_code,
                        duration_ms=int((perf_counter() - started_at) * 1000),
                        success=status_code < 400,
                        error_type=error_type,
                        route_name=route_name,
                    )
                )

                if is_tool_request:
                    tool_slug = path.split("/api/v1/tools/", 1)[1].strip("/") or None
                    tool_name = route_name or tool_slug or path
                    tool_category = tool_slug.split("/", 1)[0] if tool_slug and "/" in tool_slug else tool_slug
                    analytics_service.record_tool_usage(
                        ToolUsageEvent(
                            user_id=principal.user_id if principal else None,
                            session_id=UUID(principal.session_id) if principal and principal.session_id else None,
                            occurred_at=occurred_at,
                            tool_name=tool_name,
                            tool_slug=tool_slug,
                            tool_category=tool_category,
                            duration_ms=int((perf_counter() - started_at) * 1000),
                            success=status_code < 400,
                            error_type=error_type,
                        )
                    )

                    if "multipart/form-data" in content_type:
                        estimated_size = int(content_length) if content_length and content_length.isdigit() else 0
                        file_type = "csv" if tool_slug and "csv-to-xlsx" in tool_slug else "xlsx"
                        analytics_service.record_file_upload(
                            FileUploadEvent(
                                user_id=principal.user_id if principal else None,
                                session_id=UUID(principal.session_id) if principal and principal.session_id else None,
                                occurred_at=occurred_at,
                                file_name=None,
                                file_type=file_type,
                                file_size_bytes=estimated_size,
                                processing_time_ms=int((perf_counter() - started_at) * 1000),
                                success=status_code < 400,
                                error_type=error_type,
                            )
                        )

    @staticmethod
    def _should_skip_tracking(path: str, method: str, route_name: str | None) -> bool:
        if path in {"/health", "/api/health"} or path.startswith(("/docs", "/redoc", "/openapi")):
            return True

        if method.upper() == "GET" and path == "/auth/me":
            return True

        return route_name == "me" and method.upper() == "GET"

    async def _resolve_principal(self, request: Request) -> AuthenticatedPrincipal | None:
        authorization = request.headers.get("authorization")
        if not authorization or not authorization.lower().startswith("bearer "):
            return None

        token = authorization.split(" ", 1)[1].strip()
        if not token:
            return None

        try:
            return await verify_supabase_token(token)
        except Exception:
            return None
