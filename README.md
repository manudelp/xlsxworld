# XLSX World

Free online tools for working with Excel (XLSX) files — convert, merge, split, clean, inspect, analyze, and more. No signup or installation required.

## Features

- **Convert** — CSV, JSON, SQL, XML, PDF ↔ XLSX
- **Merge** — Append workbooks, merge sheets
- **Split** — Split by sheet or by rows/columns
- **Clean** — Find & replace, normalize case, remove duplicates, trim spaces, remove empty rows
- **Inspect** — Preview and paginate sheet data in-browser
- **Analyze** — Summary stats, compare workbooks, scan formula errors
- **Format** — Auto-size columns, freeze header
- **Data** — Sort rows, split column, transpose sheet
- **Validate** — Detect blanks, validate emails

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS v4 |
| Backend | FastAPI, Python 3.13, SQLAlchemy (async), openpyxl |
| Database | PostgreSQL via Supabase (asyncpg) |
| Auth | Supabase Auth (JWT) |
| Hosting | Vercel (frontend), Render (backend) |

## Project Layout

```
xlsxworld/
├── client/        # Next.js frontend
├── server/        # FastAPI backend
├── .amazonq/      # Amazon Q rules and memory bank
├── .github/       # CI/CD workflows
├── .husky/        # Git hooks (pre-push)
├── docker-compose.yml
├── render.yaml
└── package.json   # Root: husky, lint-staged, prettier, concurrently
```

## Quick Start

### Prerequisites

- Node.js ≥ 18
- Python 3.13 + [uv](https://docs.astral.sh/uv/)

### Run both services

```bash
npm install
npm run dev
```

This starts the Next.js dev server and the FastAPI backend concurrently.

### Run individually

```bash
npm run dev:client   # Next.js on http://localhost:3000
npm run dev:server   # FastAPI on http://localhost:8000
```

### Other commands

```bash
npm run build        # Production build (client)
npm run verify:ci    # Type-check + lint + build
npm run format       # Prettier format client files
```

See [client/README.md](client/README.md) and [server/README.md](server/README.md) for detailed setup.
