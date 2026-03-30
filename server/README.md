# XLSX World Backend

This folder contains the FastAPI backend for XLSX World.

## Overview

- Framework: FastAPI
- Python: 3.13 (pinned for local development)
- HTTP server: Uvicorn
- DB: PostgreSQL (psycopg + SQLAlchemy planned)

## Included modules

- `main.py`: lightweight app entrypoint
- `app_factory.py`: creates the FastAPI app, middleware, and router wiring
- `openapi_custom.py`: OpenAPI schema customization
- `api/system.py`: root and health routes (`/`, `/health`)
- `api/contact.py`: contact form route (`/api/contact`)
- `contact_delivery.py`: webhook/Telegram delivery logic
- `auth.py`: user/auth routes (`/api/auth/*`), JWT handling, password hashing
- `tools_inspect.py`, `tools_convert.py`, `tools_merge_split.py`: Excel tool endpoints
- `schemas.py`: shared pydantic models

## Environment

Required variables:
- `DATABASE_URL` (e.g. `postgresql://user:pass@host:5432/xlsxworld`)
- `JWT_SECRET` (secure random string)
- `JWT_EXP_MIN` (optional, default 60)

Optional:
- `CORS_ORIGINS` (used by docker-compose as service env placeholder)
- `CONTACT_WEBHOOK_URL` (if set, contact form submissions are forwarded as JSON)
- `CONTACT_WEBHOOK_TIMEOUT` (optional seconds, default `10`)
- `CONTACT_TELEGRAM_ENABLED` (set `true` to send contact submissions to Telegram)
- `CONTACT_TELEGRAM_BOT_TOKEN` (Telegram bot token from BotFather)
- `CONTACT_TELEGRAM_CHAT_ID` (your personal/group chat ID)
- `CONTACT_TELEGRAM_TIMEOUT` (optional seconds, default `10`)

Telegram quick setup (free):

1. Create a bot with BotFather in Telegram and copy the token.
2. Start a chat with the bot (send any message).
3. Get your chat id by visiting in the browser:

	https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates

	Inspect the JSON and copy `message.chat.id` for your chat.
4. Add to `server/.env`:

```
CONTACT_TELEGRAM_ENABLED=true
CONTACT_TELEGRAM_BOT_TOKEN=123456789:AA...YOURTOKEN...
CONTACT_TELEGRAM_CHAT_ID=123456789
CONTACT_TELEGRAM_TIMEOUT=10
CONTACT_TEST_KEY=my-local-only-key   # optional, protects the test endpoint
```

5. Restart the backend and test a delivery with curl (if you set `CONTACT_TEST_KEY`, include it):

```
# without key
curl -X POST http://localhost:8000/api/contact/test

# with key
curl -X POST 'http://localhost:8000/api/contact/test?key=my-local-only-key'
```

The test endpoint calls the same delivery code used by the contact form.

Local dev:
- To avoid hardcoding origins in source, you can create a `.env` in the
	`server/` folder with `CORS_ORIGINS` set to a comma-separated list of
	allowed origins (for example `http://localhost:3000`). The server loads
	`server/.env` automatically during startup. Do NOT commit `.env` — it is
	excluded by `server/.gitignore`.

## Prerequisites

- `uv` installed (recommended package manager and runner)
- Python 3.13 available

Notes:
- This folder is pinned to Python `3.13` via `.python-version`.
- Python `3.14` may fail in Windows with `httptools` build errors unless you
  install Microsoft C++ Build Tools.

## Installation (uv)

```bash
cd server
uv sync
```

## Run locally (development)

```bash
cd server
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Open [http://localhost:8000/health](http://localhost:8000/health)

## Daily workflow

```bash
cd server
uv sync
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Troubleshooting

- If `uv` is not recognized in PowerShell, reopen terminal or ensure `uv` is in
  your user `PATH`.
- If dependencies fail with Python 3.14 on Windows, use Python 3.13 in this
  project (already pinned) or install Microsoft C++ Build Tools.

## API endpoints

- `GET /`: status
- `GET /health`: health check
- `/api/auth/signup`, `/api/auth/login`, `/api/auth/me`
- `/api/tools/inspect` etc (in `tools_inspect.py`)

Supported Excel upload formats for inspect/merge/split endpoints:
- `.xlsx`, `.xls`, `.xlsm`, `.xlsb`, `.xltx`, `.xltm`, `.xlam`

## Tests

Add tests to `tests/` or create as needed, then run with pytest.

## Docker / production

Service is configured in top-level `docker-compose.yml` (backend service) and expects a database connection.
