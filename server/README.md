# XLSX World Backend

This folder contains the FastAPI backend for XLSX World.

## Overview

- Framework: FastAPI
- Python: 3.13 (pinned for local development)
- HTTP server: Uvicorn
- DB: Supabase PostgreSQL (direct connection, async SQLAlchemy)
- Migrations: Alembic

## Project structure

```
server/
├── main.py                          # Application entry point
├── Dockerfile
├── pyproject.toml
├── requirements.txt
├── alembic.ini
├── alembic/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
└── app/
    ├── core/                        # App-wide config & cross-cutting concerns
    │   ├── app_factory.py           # FastAPI app creation, middleware, router wiring
  │   ├── config.py                # Typed environment settings (pydantic-settings)
    │   ├── security.py              # JWT, password hashing, auth dependencies
    │   ├── openapi_custom.py        # OpenAPI schema customization
    │   └── rate_limit.py            # Rate limiter instance
  │
  ├── db/                          # SQLAlchemy models, engine and session dependency
  │   ├── base.py
  │   ├── session.py
  │   └── models/
  │       ├── users.py
  │       ├── analytics.py
  │       └── billing.py
    │
    ├── middleware/                   # Future: billing guard, upload-limit, logging
    │
    ├── routes/                      # Platform routes (non-tool)
    │   ├── __init__.py              # Collects all platform routers
    │   ├── system.py                # /, /health
    │   ├── contact.py               # /api/v1/contact
    │   └── auth.py                  # /api/v1/auth/*
    │
    ├── tools/                       # Every tool lives here, grouped by category
    │   ├── __init__.py              # Collects all category routers
    │   ├── _common.py               # Shared helpers (sheet title sanitization, upload size, etc.)
    │   ├── inspect/                 # Workbook inspection tools
    │   │   ├── __init__.py          # Category router
    │   │   ├── _store.py            # In-memory workbook token store
    │   │   ├── preview.py           # POST /api/v1/tools/inspect/preview
    │   │   └── page_sheet.py        # GET  /api/v1/tools/inspect/sheet
    │   ├── convert/                 # Format conversion tools
    │   │   ├── __init__.py          # Category router
    │   │   ├── csv_to_xlsx.py       # POST /api/v1/tools/convert/csv-to-xlsx
    │   │   └── xlsx_to_csv.py       # POST /api/v1/tools/convert/xlsx-to-csv, xlsx-to-csv-zip
    │   └── merge_split/             # Merge & split tools
    │       ├── __init__.py          # Category router
    │       ├── merge_sheets.py      # POST /api/v1/tools/merge-sheets
    │       ├── split_sheet.py       # POST /api/v1/tools/split-sheet
    │       ├── split_workbook.py    # POST /api/v1/tools/split-workbook
    │       └── append_workbooks.py  # POST /api/v1/tools/append-workbooks
    │
    ├── services/                    # Business logic & external integrations
    │   ├── excel_reader.py          # Multi-format Excel parsing
    │   └── contact_delivery.py      # Webhook/Telegram delivery
    │
    └── schemas/                     # Pydantic data models
        └── schemas.py
```

## Environment

Required variables:
- `DATABASE_URL` (Supabase direct Postgres URL, e.g. `postgresql://postgres:<password>@<project-ref>.supabase.co:5432/postgres`)
- `JWT_SECRET` (secure random string)
- `JWT_EXP_MIN` (optional, default 60)

Optional:
- `APP_ENV` (`development`, `staging`, `production`)
- `DB_POOL_SIZE` (default `10`)
- `DB_MAX_OVERFLOW` (default `20`)
- `DB_POOL_TIMEOUT` (default `30`)
- `DB_POOL_RECYCLE` (default `1800`)
- `DB_ECHO_SQL` (default `false`)
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_JWT_SECRET`
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
curl -X POST http://localhost:8000/api/v1/contact/test

# with key
curl -X POST 'http://localhost:8000/api/v1/contact/test?key=my-local-only-key'
```

The test endpoint calls the same delivery code used by the contact form.

Local dev:
- Copy `.env.example` to `.env` and fill values.
- The backend loads `server/.env` automatically.
- Do NOT commit `.env` — it is excluded by `server/.gitignore`.

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

## Database migrations

```bash
cd server
uv run alembic upgrade head
```

Create a new revision after schema changes:

```bash
cd server
uv run alembic revision --autogenerate -m "describe-change"
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

All tool endpoints are under `/api/v1/`:

- `GET /` — status
- `GET /health` — health check
- `POST /api/v1/auth/signup`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`
- `POST /api/v1/tools/inspect/preview`, `GET /api/v1/tools/inspect/sheet`
- `POST /api/v1/tools/convert/csv-to-xlsx`, `POST /api/v1/tools/convert/xlsx-to-csv`, `POST /api/v1/tools/convert/xlsx-to-csv-zip`
- `POST /api/v1/tools/merge-sheets`, `POST /api/v1/tools/split-sheet`, `POST /api/v1/tools/split-workbook`, `POST /api/v1/tools/append-workbooks`

Supported Excel upload formats:
- `.xlsx`, `.xls`, `.xlsm`, `.xlsb`, `.xltx`, `.xltm`, `.xlam`

## Adding a new tool

1. Create a new file in the appropriate category folder (e.g. `app/tools/convert/json_to_xlsx.py`)
2. Define a `router = APIRouter()` with your endpoint(s)
3. Import and include it in the category's `__init__.py`
4. That's it — the app_factory picks it up automatically

## Tests

Add tests to `tests/` or create as needed, then run with pytest.

## Docker / production

Service is configured in top-level `docker-compose.yml` (backend service) and expects a database connection.
