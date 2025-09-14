# Docker & Deployment

This repository ships with container builds for both the FastAPI backend (`api`) and the Next.js frontend (`web`).

## Quick Start (Development / Integration)

Build and run both services:

```
docker compose build
docker compose up -d
```

Visit:
- API: http://localhost:8000 (docs at /docs)
- Web: http://localhost:3000

The frontend is built as a standalone Next.js server and communicates with the API via the internal DNS name `api` (set by `NEXT_PUBLIC_API_BASE=http://api:8000`).

## Images

- Backend: multi-layer Python 3.12 slim running `uvicorn server.main:app`.
- Frontend: multi-stage Node 20 build -> minimal runtime using `.next/standalone` output.

## Rebuilding After Changes

Docker layer caching will keep installs fast unless `requirements.txt` or dependency lockfiles change.

```
docker compose build --no-cache api
```

## Running Only the API

```
docker build -t ilovexlsx-api ./server
docker run --rm -p 8000:8000 ilovexlsx-api
```

## Environment Variables

Frontend:
- `NEXT_PUBLIC_API_BASE` (defaults to http://localhost:8000 outside compose)

Backend:
- Add future secrets via compose overrides / `.env` file.

## Healthchecks

Compose defines container-level healthchecks for both services. Kubernetes / ECS can reuse the `/health` endpoint for liveness.

## Production Hardening Ideas

- Add gunicorn with multiple uvicorn workers (currently single worker).
- Configure CORS origins precisely.
- Add Redis or persistent volume for workbook token cache.
- Enable CDN caching for static frontend assets.
- Run vulnerability scanning (e.g. Trivy) in CI.

## CI/CD (GitHub Actions)

The workflow (see `.github/workflows/docker.yml`) builds and optionally pushes images. Add `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` or GHCR credentials as repo secrets.

## Multi-Arch (Optional)

To build for arm64+amd64:
```
docker buildx build --platform linux/amd64,linux/arm64 -t your/image:tag --push .
```

## Troubleshooting

- If Next.js fails to resolve API: ensure `NEXT_PUBLIC_API_BASE` matches compose service name or externally reachable host.
- Large file uploads: consider raising body size limits (FastAPI + reverse proxy).
- Memory: Switch workbook cache to a bounded LRU store or Redis.

---
Use this doc as a base; adapt as new services/tools are added.
