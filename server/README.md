# XLSX World — Backend

FastAPI backend for XLSX World.

## Tech

- **Framework:** FastAPI 0.116.1
- **Runtime:** Python 3.13
- **Server:** Uvicorn
- **Database:** PostgreSQL via Supabase (async SQLAlchemy + asyncpg)
- **Migrations:** Alembic
- **Excel:** openpyxl, xlrd, pyxlsb

## Structure

```
server/
├── main.py
├── Dockerfile
├── pyproject.toml
├── requirements.txt
├── alembic.ini
├── alembic/                         # Database migrations
├── tests/
└── app/
    ├── core/                        # App factory, config, security, rate limiting, OpenAPI
    ├── db/                          # SQLAlchemy models, engine, session
    │   └── models/                  # users, analytics, billing, _mixins
    ├── middleware/                   # Analytics middleware
    ├── routes/                      # Platform routes (auth, contact, system)
    ├── schemas/                     # Pydantic schemas (analytics, auth, general)
    ├── services/                    # Business logic (analytics, auth, contact, excel_reader)
    └── tools/                       # Excel tool implementations
        ├── _common.py               # Shared helpers
        ├── analyze/                 # compare_workbooks, scan_formula_errors, summary_stats
        ├── clean/                   # find_replace, normalize_case, remove_duplicates, remove_empty_rows, trim_spaces
        ├── convert/                 # csv↔xlsx, json↔xlsx, sql↔xlsx, xml↔xlsx, pdf↔xlsx
        ├── data/                    # sort_rows, split_column, transpose_sheet
        ├── format/                  # auto_size_columns, freeze_header
        ├── inspect/                 # preview, page_sheet, _store
        ├── merge/                   # append_workbooks, merge_sheets
        ├── security/                # (placeholder)
        ├── split/                   # split_sheet, split_workbook
        └── validate/                # detect_blanks, validate_emails
```

## Environment

Required:

- `DATABASE_URL` — Supabase direct Postgres URL
- `DATABASE_POOL_URL` — Supabase pooler URL (hosted/background services)

Optional:

- `APP_ENV` (`development` | `staging` | `production`)
- `DB_POOL_SIZE` (default `10`), `DB_MAX_OVERFLOW` (default `20`), `DB_POOL_TIMEOUT` (default `30`), `DB_POOL_RECYCLE` (default `1800`), `DB_ECHO_SQL` (default `false`)
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
- `CORS_ORIGINS`
- `CONTACT_WEBHOOK_URL`, `CONTACT_WEBHOOK_TIMEOUT`
- `CONTACT_TELEGRAM_ENABLED`, `CONTACT_TELEGRAM_BOT_TOKEN`, `CONTACT_TELEGRAM_CHAT_ID`, `CONTACT_TELEGRAM_TIMEOUT`

Local dev: copy `.env.example` to `.env` and fill values. Do NOT commit `.env`.

## Prerequisites

- [uv](https://docs.astral.sh/uv/) installed
- Python 3.13 (pinned via `.python-version`)

> Python 3.14 may fail on Windows with `httptools` build errors unless you install Microsoft C++ Build Tools.

## Setup

```bash
cd server
uv sync
```

## Database Migrations

```bash
uv run alembic upgrade head                          # Apply migrations
uv run alembic revision --autogenerate -m "message"  # Create new revision
```

## Run

```bash
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Open http://localhost:8000/health

## Tests

```bash
uv run pytest
```

## API Endpoints

Platform:

- `GET /` — status
- `GET /health` — health check
- `POST /auth/signup`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`
- `POST /api/v1/contact`

Tools (all under `/api/v1/tools/`):

| Category | Endpoints |
|---|---|
| Inspect | `POST .../inspect/preview`, `GET .../inspect/sheet` |
| Convert | `POST .../convert/csv-to-xlsx`, `xlsx-to-csv`, `xlsx-to-csv-zip`, `json-to-xlsx`, `xlsx-to-json`, `sql-to-xlsx`, `xlsx-to-sql`, `xml-to-xlsx`, `xlsx-to-xml`, `pdf-to-xlsx`, `xlsx-to-pdf` |
| Merge | `POST .../merge-sheets`, `POST .../append-workbooks` |
| Split | `POST .../split-sheet`, `POST .../split-workbook` |
| Clean | `POST .../clean/find-replace`, `normalize-case`, `remove-duplicates`, `remove-empty-rows`, `trim-spaces` |
| Analyze | `POST .../analyze/summary-stats`, `compare-workbooks`, `scan-formula-errors` |
| Format | `POST .../format/auto-size-columns`, `freeze-header` |
| Data | `POST .../data/sort-rows`, `split-column`, `transpose-sheet` |
| Validate | `POST .../validate/detect-blanks`, `validate-emails` |

Supported upload formats: `.xlsx`, `.xls`, `.xlsm`, `.xlsb`, `.xltx`, `.xltm`, `.xlam`

## Adding a New Tool

1. Create a file in the appropriate category folder (e.g., `app/tools/convert/json_to_xlsx.py`)
2. Define a `router = APIRouter()` with your endpoint(s)
3. Import and include it in the category's `__init__.py`
4. The app factory picks it up automatically

## Docker

```bash
docker-compose up   # From project root
```
