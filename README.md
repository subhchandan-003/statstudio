# StatStudio

A Python-powered, scriptable market research and statistics platform with a
web front end, interactive graphing, a visual terminal and reproducible
workflows. See [PRD_StatStudio.md](PRD_StatStudio.md) for the full spec.

**Architecture note:** this build deviates from the PRD's original
persistent-storage design. Uploaded files/datasets are processed live,
in-request, and never persisted — there is no database, object storage or
job queue. This keeps the whole thing stateless, which maps cleanly onto
Vercel's serverless model for both the frontend and the backend.

## Stack

- Backend: FastAPI (Python 3.12), Pydantic v2, managed with `uv`. Deployed
  as Vercel serverless functions (no server process to keep alive).
- Stats engine: pure package under `backend/app/engine`, no web imports.
- Frontend: React 18 + TypeScript + Vite + Tailwind, TanStack Query,
  Zustand, Plotly.js, xterm.js, managed with `pnpm`. Deployed as a static
  Vercel site.

## Prerequisites

- [uv](https://docs.astral.sh/uv/) (Python dependency manager)
- [pnpm](https://pnpm.io/) (Node dependency manager)
- [Vercel CLI](https://vercel.com/docs/cli) (`npm i -g vercel`, then
  `vercel login`) if you want to deploy

## Run locally

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

Copy `.env.example` to `.env` in each of `backend/` and `frontend/` (or the
repo root, read by both) and adjust `VITE_API_BASE` to point at wherever
the backend is running.

## Deploy to Vercel

Each side of the monorepo is its own Vercel project, linked by running
`vercel link` from within that subdirectory so its root directory is set
correctly.

```bash
# backend — FastAPI is auto-detected via pyproject.toml's [tool.vercel]
# entrypoint (app.main:app); no vercel.json needed.
cd backend
vercel link --yes
vercel deploy --prod --yes

# frontend — set VITE_API_BASE to the backend's production URL first
cd frontend
vercel env add VITE_API_BASE production
vercel link --yes
vercel deploy --prod --yes
```

After the first backend deploy, set `CORS_ORIGINS` on the backend project
to include the frontend's production URL and redeploy.

## Repository layout

```
backend/app/
  main.py       FastAPI app factory, mounts /api/v1
  config.py     typed settings (pydantic-settings)
  api/v1/       versioned routers
  engine/       pure stats engine, zero web imports (reused by the terminal)
  services/     request-scoped processing (upload/analyze — no persistence)
  sandbox/      restricted REPL executor (visual terminal backend)
  ws/           websocket handlers

frontend/src/
  main.tsx, App.tsx   app shell
  lib/api.ts          typed API client
```

## Status

Scaffold + hosting only. See `PRD_StatStudio.md` section 4.2 onward for the
next modules (live upload/describe, charting, visual terminal, real-time
visualisation, screenshots) — reworked to process in-memory per request
instead of persisting to a database.
