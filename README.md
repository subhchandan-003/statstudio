# StatStudio

A Python-powered, scriptable market research and statistics platform with a
web front end, interactive graphing, a visual terminal and reproducible
workflows. See [PRD_StatStudio.md](PRD_StatStudio.md) for the full spec.

This is the master scaffold: repo structure, tooling and a working
`/health` round-trip between frontend and backend. Feature modules (upload,
charting, visual terminal, real-time viz) are built incrementally per the
PRD's Claude Code prompt pack (section 4).

## Stack

- Backend: FastAPI (Python 3.12), SQLAlchemy 2.0, Alembic, Pydantic v2,
  Celery + Redis, managed with `uv`.
- Stats engine: pure package under `backend/app/engine`, no web imports.
- Frontend: React 18 + TypeScript + Vite + Tailwind, TanStack Query,
  Zustand, Plotly.js, xterm.js, managed with `pnpm`.
- Data: PostgreSQL 16, Redis, MinIO (S3-compatible).

## Prerequisites

- [uv](https://docs.astral.sh/uv/) (Python dependency manager)
- [pnpm](https://pnpm.io/) (Node dependency manager)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for the
  full local stack: Postgres, Redis, MinIO)

## Run locally with Docker (full stack)

```bash
cp .env.example .env          # edit secrets as needed
docker compose up --build     # api, worker, db, redis, minio, frontend

curl http://localhost:8000/health          # backend
open http://localhost:5173                 # frontend

docker compose exec api uv run alembic upgrade head
docker compose exec api uv run pytest
docker compose exec frontend pnpm test
```

## Run locally without Docker (backend/frontend only, no Postgres/Redis/MinIO)

Useful for iterating on code and running lint/typecheck/tests without the
full data tier.

```bash
# backend
cd backend
uv sync
uv run ruff check .
uv run mypy app
uv run pytest -q
uv run uvicorn app.main:app --reload   # http://localhost:8000/health

# frontend
cd frontend
pnpm install
pnpm exec eslint .
pnpm exec tsc --noEmit
pnpm exec vitest run
pnpm dev                                # http://localhost:5173
```

## Repository layout

```
backend/app/
  main.py       FastAPI app factory, mounts /api/v1
  config.py     typed settings (pydantic-settings)
  deps.py       DB session dependency
  models/       SQLAlchemy 2.0 models
  schemas/      Pydantic request/response schemas
  api/v1/       versioned routers
  engine/       pure stats engine, zero web imports (reused by the terminal)
  sandbox/      restricted REPL executor (visual terminal backend)
  tasks/        Celery app and tasks
  ws/           websocket handlers

frontend/src/
  main.tsx, App.tsx   app shell
  lib/api.ts          typed API client
```

## Status

Master scaffold only. See `PRD_StatStudio.md` section 4.2 onward for the
next modules (secure upload/download, charting, visual terminal, real-time
visualisation, screenshots).
