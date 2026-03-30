from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field

from contact_delivery import deliver_contact_message

router = APIRouter(prefix="/api/contact", tags=["meta"])


class ContactMessage(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    message: str = Field(min_length=1, max_length=2000)


@router.post(
    "",
    summary="Submit Contact Message",
    description="Accepts contact form submissions and delivers via configured channels.",
)
async def submit_contact(payload: ContactMessage):
    name = payload.name.strip()
    message = payload.message.strip()

    if not name or not message:
        raise HTTPException(status_code=400, detail="Name and message are required.")

    await deliver_contact_message(name=name, email=str(payload.email), message=message)
    return {"ok": True, "detail": "Thanks! Your message has been sent."}

