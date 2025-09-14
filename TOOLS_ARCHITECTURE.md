# Tools Architecture

This project treats each XLSX-related capability as a "tool" that has:

- Server API endpoints (FastAPI router) under `server/` (one file per tool or grouped logically)
- Shared Pydantic schemas in `server/schemas.py` (or tool-local if only used there)
- Client fetch helpers under `client/lib/tools/<tool>.ts`
- UI components/pages under `client/app/tools/[slug]/...`

## Inspect Tool

Files added:

- `server/tools_inspect.py` – FastAPI router with endpoints:
  - `POST /api/inspect/preview` – Upload workbook, returns token + sheet previews (sample rows)
  - `GET  /api/inspect/sheet` – Paged access to a sheet (offset + limit)
  - `GET  /api/inspect/export/csv` – Streaming CSV export for a sheet
  - `GET  /api/inspect/export/json` – Full JSON rows export
- `client/lib/api.ts` – Base fetch wrapper
- `client/lib/tools/inspect.ts` – TypeScript helper functions calling the API
- `client/app/tools/[slug]/inspect/InspectSheets.tsx` – Refactored React client UI using server APIs

### Token & Cache

A short-lived in-memory cache stores raw workbook bytes keyed by a random token. This enables paging and exporting without re-uploading the file. Current defaults:

- Max 32 workbooks (drops oldest when full)
- 15 minute TTL refreshed on access

Future options:

- Swap to Redis or a temp file directory
- Signed tokens with size metadata
- Background GC task

### Adding a New Tool

1. Create a router file: `server/tools_<name>.py` with an `APIRouter` (prefix `/api/<name>`).
2. Mount it in `server/main.py` via `app.include_router(router)`.
3. Define Pydantic models (reuse `schemas.py` or create local classes if purely internal).
4. Add client helper: `client/lib/tools/<name>.ts` exporting strongly typed functions.
5. Build UI under `client/app/tools/[slug]/<name>/`.
6. Reference slug routing (the `[slug]` segment) to dynamically load the right tool component.
7. Document usage in this file.

### Error Handling

Errors returned by the API should follow FastAPI's `{ "detail": "message" }` pattern so the client wrapper can surface consistent errors.

### Frontend Patterns

- Keep network + parsing logic in `client/lib/tools/*` not React components.
- Components focus on state orchestration + presentation.
- Provide streaming endpoints for large exports to avoid holding huge objects in memory client-side.

### Follow-Up Ideas

- Add sheet search / filter
- Column type inference
- Column stats endpoint (`/api/inspect/stats`)
- Multi-sheet combined export
- Persist tokens across reloads with localStorage
- Add e2e tests (Playwright) for upload + page navigation

---
This document will evolve as more tools are added.
