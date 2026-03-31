from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm

from app.core.security import (
    UserOut,
    get_current_user,
    require_admin,
    get_user_by_email,
    verify_password,
    create_access_token,
    create_user,
    get_db_conn,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/signup", response_model=UserOut)
def signup(body: dict):
    email = body.get("email")
    password = body.get("password")
    if not email or not password:
        raise HTTPException(status_code=400, detail="email and password required")
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(1) FROM users")
            total = cur.fetchone()[0]
    role = "admin" if total == 0 else "user"
    u = create_user(email, password, role=role)
    return UserOut(**u)


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = get_user_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    token = create_access_token(user["id"], user["role"])  # type: ignore
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def me(current: UserOut = Depends(get_current_user)):
    return current


@router.get("/admin/ping")
def admin_ping(_: UserOut = Depends(require_admin)):
    return {"pong": True}
