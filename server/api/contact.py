from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

from contact_delivery import deliver_contact_message
from rate_limit import limiter

router = APIRouter(prefix="/api/contact", tags=["meta"])


class ContactMessage(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    message: str = Field(min_length=1, max_length=2000)
    cf_turnstile_response: str | None = None


@router.post(
    "",
    summary="Submit Contact Message",
    description="Accepts contact form submissions and delivers via configured channels.",
)
@limiter.limit("3/minute")
async def submit_contact(request: Request, payload: ContactMessage):
    name = payload.name.strip()
    message = payload.message.strip()

    if not name or not message:
        raise HTTPException(status_code=400, detail="Name and message are required.")

    # 1. Turnstile Secret Key from Env
    from os import getenv
    import httpx

    turnstile_secret = getenv("TURNSTILE_SECRET_KEY", "").strip()
    if turnstile_secret:  # Only enforce CAPTCHA if secret is configured
        if not payload.cf_turnstile_response:
            raise HTTPException(status_code=400, detail="Please complete the CAPTCHA.")

        # 2. Verify with Cloudflare
        verify_url = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
        async with httpx.AsyncClient() as client:
            resp = await client.post(verify_url, data={
                "secret": turnstile_secret,
                "response": payload.cf_turnstile_response,
                "remoteip": request.client.host if request.client else None
            })
            outcome = resp.json()
            if not outcome.get("success"):
                raise HTTPException(status_code=400, detail="CAPTCHA validation failed.")

    await deliver_contact_message(name=name, email=str(payload.email), message=message)
    return {"ok": True, "detail": "Thanks! Your message has been sent."}

