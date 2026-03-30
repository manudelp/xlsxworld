# XLSX World Backend

This folder contains the FastAPI backend for XLSX World.

## Overview

- Framework: FastAPI
- Python: 3.13 (pinned for local development)
- HTTP server: Uvicorn
- DB: PostgreSQL (psycopg + SQLAlchemy planned)

## Included modules

- `main.py`: app entrypoint and routers (`/`, `/health`, example route)
- `auth.py`: user/auth routes (`/api/auth/*`), JWT handling, password hashing
- `schemas.py`: pydantic models
- `tools_inspect.py`: XLSX inspection endpoints

## Environment

Required variables:
- `DATABASE_URL` (e.g. `postgresql://user:pass@host:5432/xlsxworld`)
- `JWT_SECRET` (secure random string)
- `JWT_EXP_MIN` (optional, default 60)

Optional:
- `CORS_ORIGINS` (used by docker-compose as service env placeholder)

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
