import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

from app.core.security import AuthenticatedPrincipal, get_bearer_token, get_current_user
from app.schemas.auth import (
    AuthLoginRequest,
    AuthLogoutResponse,
    AuthProfileResponse,
    AuthRefreshRequest,
    AuthSessionResponse,
    AuthSignupRequest,
    AuthUpdateProfileRequest,
)
from app.services.auth_service import AuthService, get_auth_service

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


@router.post("/signup", response_model=AuthSessionResponse)
async def signup(request: Request, auth_service: AuthService = Depends(get_auth_service)) -> AuthSessionResponse:
    raw_body = await request.body()
    raw_text = raw_body.decode("utf-8", errors="replace")
    expected_fields = list(AuthSignupRequest.model_fields.keys())

    logger.error("[SIGNUP_DEBUG] expected schema fields=%s", expected_fields)
    logger.error("[SIGNUP_DEBUG] raw request body=%s", raw_text)

    try:
        body = AuthSignupRequest.model_validate_json(raw_body)
    except ValidationError as exc:
        logger.error("[SIGNUP_DEBUG] validation errors=%s", exc.errors(include_url=True))
        logger.error("[SIGNUP_DEBUG] validation error json=%s", exc.json())
        raise RequestValidationError(exc.errors())

    return await auth_service.signup(body)


@router.post("/login", response_model=AuthSessionResponse)
async def login(body: AuthLoginRequest, auth_service: AuthService = Depends(get_auth_service)) -> AuthSessionResponse:
    return await auth_service.login(body)


@router.post("/refresh", response_model=AuthSessionResponse)
async def refresh(body: AuthRefreshRequest, auth_service: AuthService = Depends(get_auth_service)) -> AuthSessionResponse:
    return await auth_service.refresh(body)


@router.post("/logout", response_model=AuthLogoutResponse)
async def logout(
    _: AuthenticatedPrincipal = Depends(get_current_user),
    token: str = Depends(get_bearer_token),
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthLogoutResponse:
    return await auth_service.logout(token)


@router.get("/me", response_model=AuthProfileResponse)
async def me(
    current_user: AuthenticatedPrincipal = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthProfileResponse:
    if current_user.email is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authenticated token is missing the email claim")
    profile = await auth_service.me(current_user.user_id, current_user.email, None)
    return profile


@router.patch("/me", response_model=AuthProfileResponse)
async def update_me(
    body: AuthUpdateProfileRequest,
    current_user: AuthenticatedPrincipal = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthProfileResponse:
    if current_user.email is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authenticated token is missing the email claim")
    profile = await auth_service.update_profile(current_user.user_id, current_user.email, body)
    return profile
