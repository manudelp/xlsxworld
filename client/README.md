# XLSX World — Client

Next.js 15 frontend for the XLSX World tool suite.

## Tech

- **Framework:** Next.js 15 (App Router, Turbopack, standalone output)
- **Language:** TypeScript 5, React 19
- **Styling:** Tailwind CSS v4 + CSS custom properties (no component library)
- **i18n:** next-intl (en, es, fr, pt)
- **Auth:** Supabase Auth via AuthProvider context

## Structure

```
client/
├── app/
│   ├── [locale]/                  # i18n dynamic route
│   │   ├── tools/[slug]/          # Tool pages (dynamic slug routing)
│   │   │   ├── analyze/           # CompareWorkbooks, ScanFormulaErrors
│   │   │   ├── clean/             # FindReplace, NormalizeCase, RemoveDuplicates, TrimSpaces
│   │   │   ├── convert/           # CSV/JSON/SQL/XML/PDF ↔ XLSX components
│   │   │   ├── inspect/           # InspectSheets
│   │   │   ├── merge/             # AppendWorkbooks, MergeSheets
│   │   │   ├── split/             # SplitSheet, SplitWorkbook
│   │   │   └── page.tsx
│   │   ├── admin/, contact/, faq/, privacy/, terms/
│   │   ├── login/, signup/, forgot-password/, reset-password/
│   │   ├── my-account/
│   │   ├── layout.tsx, page.tsx, error.tsx, loading.tsx, not-found.tsx
│   ├── api/                       # Next.js API routes (auth, proxy)
│   ├── globals.css, layout.tsx, robots.ts, sitemap.ts
├── components/
│   ├── auth/          # AuthProvider, useRequireAuth
│   ├── common/        # BackToTopButton, FileUploadDropzone
│   ├── layout/        # Header, Footer, LanguageToggle
│   ├── theme/         # ThemeProvider, ThemeToggle
│   └── tools/         # Tools listing, filtering, data registry, translations
├── i18n/              # next-intl config (routing, navigation, request)
├── lib/
│   ├── auth/          # Auth client, constants, types
│   ├── tools/         # API client functions (analyze, clean, convert, inspect, merge, split)
│   ├── api.ts         # Base API client
│   └── seo.ts
├── messages/          # i18n JSON files (en, es, fr, pt)
├── public/            # Static assets
└── types/             # Global TypeScript declarations
```

## Setup

```bash
cd client
npm install
```

## Environment

Create `.env.local`:

```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

## Commands

```bash
npm run dev          # Dev server with Turbopack (http://localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run type-check   # TypeScript check
npm run test         # Jest tests
```

## API Integration

Centralized API client in `lib/api.ts` with tool-specific wrappers in `lib/tools/`:

- `api.get(path)`, `api.postForm(path, formData)`, `api.postJson(path, body)`
- Authenticated variants under `api.auth.*` with automatic 401 → refresh → retry
- All `/api/` paths auto-proxied through Next.js `/api/proxy` in production
