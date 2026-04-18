from fastapi import APIRouter, Request
from pydantic import BaseModel, EmailStr

from app.core.rate_limit import limiter
from app.services.contact_delivery import deliver_contact_message

router = APIRouter(prefix="/api/v1/launch-updates", tags=["meta"])


class LaunchUpdatesSignup(BaseModel):
    email: EmailStr


@router.post(
    "",
    summary="Join Launch Updates",
    description="Collects emails from the public footer signup form.",
)
@limiter.limit("5/minute")
async def subscribe_to_launch_updates(request: Request, payload: LaunchUpdatesSignup):
    email = str(payload.email).strip().lower()

    await deliver_contact_message(
        name="Launch updates subscriber",
        email=email,
        message="Please notify me when new XLSX World tools launch.",
    )

    return {"ok": True, "detail": "You are on the list. We will email you when new tools launch."}
