from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.core.rate_limit import limiter
from app.core.security import AuthenticatedPrincipal, get_bearer_token, get_current_user
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
from app.services.auth_service import AuthService, get_auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=AuthSessionResponse)
@limiter.limit("5/minute")
async def signup(request: Request, body: AuthSignupRequest, auth_service: AuthService = Depends(get_auth_service)) -> AuthSessionResponse:
    return await auth_service.signup(body)


@router.post("/login", response_model=AuthSessionResponse)
@limiter.limit("10/minute")
async def login(request: Request, body: AuthLoginRequest, auth_service: AuthService = Depends(get_auth_service)) -> AuthSessionResponse:
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


@router.post("/forgot-password", response_model=AuthMessageResponse)
@limiter.limit("5/minute")
async def forgot_password(
    request: Request,
    body: AuthForgotPasswordRequest,
    redirect_to: str | None = Query(default=None),
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthMessageResponse:
    return await auth_service.forgot_password(body, redirect_to=redirect_to)


@router.post("/reset-password", response_model=AuthMessageResponse)
@limiter.limit("5/minute")
async def reset_password(
    request: Request,
    body: AuthResetPasswordRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthMessageResponse:
    return await auth_service.reset_password(body)


@router.post("/google", response_model=AuthSessionResponse)
async def google_login(
    body: AuthGoogleRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthSessionResponse:
    return await auth_service.google_login(body)


@router.post("/verify-recovery", response_model=AuthVerifyRecoveryResponse)
@limiter.limit("5/minute")
async def verify_recovery(
    request: Request,
    body: AuthVerifyRecoveryRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthVerifyRecoveryResponse:
    return await auth_service.verify_recovery(body)


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
