# XLSX World Client

This folder contains the Next.js frontend for the XLSX World tool suite.

- Framework: Next.js App Router
- Language: TypeScript
- Bundler: built-in Vercel/Next.js
- UI: custom components in `components/` and tool flows under `app/tools/[slug]`

## Prerequisites

- Node.js >= 18
- npm, yarn, or pnpm

## Setup

```bash
cd client
npm install
# or yarn
# or pnpm install
```

## Environment

`NEXT_PUBLIC_API_BASE` (optional, defaults to `http://localhost:8000`)

Example `.env.local`:

```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

## Run

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Build

```bash
npm run build
npm run start
```

## Lint / Format

```bash
npm run lint
npm run fmt
```

## API Integration

The frontend uses `client/lib/api.ts` for calls.
- `api.get('/tools/...')`
- `api.postForm('/tools/...', formData)`

## Notes

- Login/signup is available via `/login` and `/signup`.
- Tool inspection path: `/tools/[slug]/inspect/InspectSheets`.

