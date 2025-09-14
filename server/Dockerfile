# syntax=docker/dockerfile:1.7
# --- Base python image ---
FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Install build deps for some wheels then purge
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Separate layer for requirements to leverage cache
COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy source
COPY . .

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -fs http://localhost:8000/health || exit 1

CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8000"]
