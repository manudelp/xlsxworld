import os
import logging
import html

import httpx
from fastapi import HTTPException

logger = logging.getLogger(__name__)


def is_enabled(env_var_name: str) -> bool:
    raw = os.getenv(env_var_name, "")
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _build_contact_text(name: str, email: str, message: str) -> str:
    safe_name = html.escape(name)
    safe_email = html.escape(email)
    safe_message = html.escape(message)
    return (
        "📬 <b>New Contact Form Submission</b>\n\n"
        f"👤 <b>Name:</b> {safe_name}\n"
        f"📧 <b>Email:</b> {safe_email}\n\n"
        "📝 <b>Message:</b>\n"
        f"<blockquote>{safe_message}</blockquote>"
    )


def _require_env_vars(channel_name: str, env_values: dict[str, str]) -> None:
    missing = [key for key, value in env_values.items() if not value]
    if missing:
        raise HTTPException(
            status_code=500,
            detail=f"{channel_name} is enabled but missing env vars: {', '.join(missing)}",
        )


async def forward_contact_webhook(name: str, email: str, message: str) -> None:
    webhook_url = os.getenv("CONTACT_WEBHOOK_URL", "").strip()
    if not webhook_url:
        return

    timeout_seconds = float(os.getenv("CONTACT_WEBHOOK_TIMEOUT", "10"))
    request_payload = {
        "name": name,
        "email": email,
        "message": message,
    }

    try:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            response = await client.post(webhook_url, json=request_payload)
            response.raise_for_status()
    except Exception:
        logger.exception("Failed to forward contact submission to webhook")
        raise HTTPException(
            status_code=502,
            detail="Message received, but forwarding failed. Please try again.",
        )



async def send_telegram_message(name: str, email: str, message: str) -> None:
    if not is_enabled("CONTACT_TELEGRAM_ENABLED"):
        return

    bot_token = os.getenv("CONTACT_TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = os.getenv("CONTACT_TELEGRAM_CHAT_ID", "").strip()
    timeout_seconds = float(os.getenv("CONTACT_TELEGRAM_TIMEOUT", "10"))

    _require_env_vars(
        "Telegram",
        {
            "CONTACT_TELEGRAM_BOT_TOKEN": bot_token,
            "CONTACT_TELEGRAM_CHAT_ID": chat_id,
        },
    )

    text_body = _build_contact_text(name=name, email=email, message=message)

    endpoint = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    request_body = {
        "chat_id": chat_id,
        "text": text_body,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }

    try:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            response = await client.post(endpoint, json=request_body)
            response.raise_for_status()
    except Exception:
        logger.exception("Failed to deliver contact submission to Telegram")
        raise HTTPException(
            status_code=502,
            detail="Message received, but Telegram delivery failed. Please try again.",
        )


async def deliver_contact_message(name: str, email: str, message: str) -> None:
    await forward_contact_webhook(name=name, email=email, message=message)
    await send_telegram_message(name=name, email=email, message=message)
