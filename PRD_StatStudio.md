# StatStudio — Product Requirements, Architecture & Build Plan

> Working name: **StatStudio**. A Python-powered, scriptable market research and statistics platform with a web front end, interactive graphing, a visual terminal and reproducible workflows. Built as a personal-use alternative to SPSS / JMP / BlueSky, extended with a modern web layer.

**Document owner:** Subhchandan Das (FroGGy)
**Status:** Draft v1.0 (feasibility already established in prior assessment)
**Intended build tool:** Claude Code in VS Code

---

## 0. How to read this document

This spec assumes the statistics engine itself is a solved problem (wrap mature libraries, do not reimplement algorithms). The real work is the platform: a secure web layer, file handling, interactive visualisation, a browser terminal, auth, audit and reproducibility. Sections 1 to 3 are the PRD. Section 4 is architecture. Section 5 is the Claude Code prompt pack. Sections 6 to 8 cover MVP staging, deliverables and run/deploy instructions.

---

## 1. Product Requirements Document

### 1.1 Vision

A single-user-first (later multi-user) platform where a researcher goes from a raw CSV or Excel file to a publication-ready statistical result, an interactive chart and a reproducible script, entirely in the browser or by API, faster than the SPSS point-and-click loop. Every analysis is logged, versioned and reproducible by construction.

### 1.2 Goals and success criteria

| Goal | Success criterion |
|------|-------------------|
| Reproducible analysis | Any saved result can be re-run from its stored script + data hash and produce identical output |
| Fast time-to-result | Raw upload to first descriptive table in under 60 seconds for a typical dataset (under 500k rows) |
| Interactive visual exploration | User can render histogram, scatter, line and bar charts and manipulate them without writing chart code |
| Scriptability | Every UI action maps to a Python API call, and the visual terminal can drive the same engine |
| Secure handling | Files are validated, access-controlled and never executed as code; auth gates every data route |
| Auditability | Every upload, transform, analysis and export is recorded with actor, timestamp and input hash |
| Graceful offline behaviour | Core viewing and previously loaded results work with no network, with a clear degraded-mode banner |

**Primary success metric:** a real research dataset can be taken end to end (upload, clean, test, visualise, export) by the user without editing internal code, and the exact run can be reproduced a month later.

### 1.3 Personas and use cases

**Persona A — Solo researcher (primary, that is you).**
Runs market research studies, wants SPSS-grade stats without the GUI friction, values reproducibility and scripting. Comfortable with Python but wants speed for routine work.

**Persona B — Collaborator / reviewer (phase 2).**
Read-only access to a shared project. Views results and charts, downloads exports, cannot mutate data. Justifies RBAC.

**Persona C — Automation client (phase 3).**
A script or notebook hitting the REST API with a token to batch-run analyses.

**Key use cases**
1. Upload a survey CSV, tag variable types (nominal / ordinal / scale), run descriptives and a t-test, export an APA-style table.
2. Open the visual terminal, load a dataset by name, run `describe(df)` and `ttest(...)`, see the chart render inline.
3. Brush a scatter plot region and export just that view as PNG.
4. Stream a live-updating chart as rows arrive from an ingest endpoint (near-real-time).
5. Re-open a project after a month and reproduce a prior result exactly.
6. Work on a plane with no wifi: view already-loaded datasets and cached results, queue an upload for when connection returns.

### 1.4 Functional requirements with acceptance criteria

Each requirement uses **Given / When / Then** acceptance criteria.

#### FR-1 Secure data upload and download
- **FR-1.1 Upload:** Support CSV, XLSX, Parquet and SPSS `.sav`.
  - *Given* a logged-in user, *when* they upload a valid CSV under the size cap, *then* the file is stored in object storage, a dataset record is created with detected schema, and a content hash is computed and persisted.
  - *Given* a file with a disallowed MIME type or extension, *when* uploaded, *then* it is rejected with a 415 and no bytes are persisted.
  - *Given* a file exceeding the size cap, *when* uploaded, *then* it is rejected with a 413 before full buffering (streamed size check).
- **FR-1.2 Download:** Users can download the original file or a processed export.
  - *Given* a user with read access to a dataset, *when* they request download, *then* they receive a time-limited signed URL, not a direct object path.
  - *Given* a user without access, *when* they request download, *then* they receive 403 and the attempt is audit-logged.
- **FR-1.3 Validation:** Uploaded tabular files are schema-sniffed (column names, dtypes, row count, null counts) and never evaluated as code.

#### FR-2 Screenshot capture (with consent)
- **FR-2.1** User can capture a screenshot of the current page or a selected element (a chart, a table).
  - *Given* a rendered chart, *when* the user clicks "Capture" and confirms the consent prompt, *then* a PNG of that element is produced and offered for download or attached to the result record.
  - *Given* the user declines the consent prompt, *then* no capture occurs and nothing is stored.
- **FR-2.2** Two modes: client-side (`html2canvas` for DOM elements, zero server round-trip) and server-side high-fidelity (Playwright renders a shareable result view). Server-side capture is gated behind explicit consent and RBAC.
- **FR-2.3** Consent is recorded in the audit log (who, what element, when).

#### FR-3 Graphing and visualisation module
- **FR-3.1** Chart types: histogram, box plot, line, bar, scatter at minimum.
  - *Given* a numeric column, *when* the user selects "Histogram", *then* an interactive Plotly histogram renders with adjustable bins.
  - *Given* two numeric columns, *when* the user selects "Scatter", *then* points render with hover tooltips, zoom, pan and box/lasso select.
- **FR-3.2** Charts are interactive: zoom, pan, hover, legend toggle, brush/select.
- **FR-3.3** Charts export to PNG (raster) and the underlying data to CSV/JSON.
- **FR-3.4** Chart specs are serialisable so a chart can be reproduced from stored config.

#### FR-4 Visual terminal
- **FR-4.1** A browser terminal (xterm.js) exposes a restricted Python REPL bound to the analysis engine, not a raw system shell.
  - *Given* the terminal, *when* the user types `describe(load("survey"))`, *then* a formatted descriptives table prints and any produced chart renders in an adjacent panel.
- **FR-4.2** The REPL runs in a sandboxed worker with a whitelist of engine functions, no filesystem or network access, an execution timeout and a memory cap.
- **FR-4.3** Terminal history is per-session and can be saved as a reproducible script.
- **FR-4.4** Output routing: text to the terminal, figures to the graph panel, tabular results to a results grid.

#### FR-5 Real-time / near-real-time visualisation
- **FR-5.1** A dataset flagged "streaming" accepts appended rows via an ingest endpoint, and any open chart on it updates within 1 second of new data.
  - *Given* an open live line chart, *when* new rows are pushed, *then* the chart appends points over a WebSocket without a full reload.
- **FR-5.2** Backpressure handling: if update rate exceeds render capacity, updates are batched on a fixed interval (for example 500 ms) rather than dropped silently.

#### FR-6 Authentication and role-based access control
- **FR-6.1** Email + password auth with Argon2 hashing, JWT access tokens (short-lived) and refresh tokens (rotating).
- **FR-6.2** Roles: `owner`, `editor`, `viewer`. Owner manages a project and members. Editor mutates data and runs analyses. Viewer is read/export only.
  - *Given* a viewer, *when* they attempt an upload or transform, *then* they receive 403 and the attempt is logged.
- **FR-6.3** Every data and analysis route is guarded by both authentication and a project-scoped role check.

#### FR-7 Audit logging and data versioning
- **FR-7.1** Append-only audit log records actor, action, target, input hash, timestamp and result reference for every mutating or exporting action.
- **FR-7.2** Datasets are versioned: each transform produces a new immutable version linked to its parent, with the transform recorded. Raw upload is version 0.
  - *Given* a cleaned dataset, *when* the user views history, *then* they see the lineage from raw upload through each transform with timestamps and actors.
- **FR-7.3** Results store the exact input dataset version hash so a result always traces to specific data.

#### FR-8 Export options
- **FR-8.1** Export dataset or result table as CSV and JSON.
- **FR-8.2** Export any chart as PNG.
- **FR-8.3** Export a full analysis bundle (script + data hash + results + charts) as a zip for reproducibility handoff.

#### FR-9 Offline support and graceful degradation
- **FR-9.1** The app is a PWA with a service worker caching the shell and previously loaded datasets/results in IndexedDB.
- **FR-9.2** With no network, users can view cached datasets, results and charts, and a clear offline banner is shown.
- **FR-9.3** Mutating actions (upload, run analysis) are disabled or queued while offline, with queued actions replayed on reconnect where safe.

### 1.5 Non-functional requirements

| Category | Requirement / target |
|----------|----------------------|
| Performance | Descriptives on 500k rows return in under 3 s p95. Chart render under 1 s for up to 100k points (downsample beyond that). API p95 latency under 300 ms for non-compute routes. |
| Scalability | Long-running analyses run as async jobs on a worker pool. Horizontal scale of API and workers independently. Single-node deploy must also work for personal use. |
| Security | HTTPS only, Argon2 password hashing, signed short-lived download URLs, strict file type validation, sandboxed terminal, CSRF protection on cookie flows, rate limiting on auth and upload. |
| Accessibility | WCAG 2.1 AA: keyboard navigation, ARIA labels on interactive charts, colour-blind-safe palettes, focus management, no colour-only encoding. |
| Reliability | Analysis outputs validated against reference datasets in the test suite. Jobs are idempotent and retryable. Target 99% uptime for personal deploy. |
| Portability | Runs via Docker Compose on any machine. Also runnable as a single-node stack. No OS-specific binaries in the core. |
| Maintainability | Typed throughout (Python type hints + TypeScript). One responsibility per module. Test coverage target 80% on engine, 60% overall. |
| Observability | Structured JSON logs, request tracing IDs, Prometheus metrics, Sentry error capture. |
| Data retention | User controls deletion. Hard-delete removes object + record; audit log retains the deletion event, not the data. |

### 1.6 Data models (high-level)

```
User
  id, email, password_hash, created_at, is_active

Project
  id, name, owner_id, created_at

Membership
  id, project_id, user_id, role (owner|editor|viewer)

Dataset
  id, project_id, name, source_format, storage_key,
  content_hash, row_count, created_by, created_at,
  parent_dataset_id (nullable), version (int)

VariableMetadata
  id, dataset_id, name, measure (nominal|ordinal|scale),
  dtype, label, value_labels (json), missing_codes (json)

AnalysisResult
  id, dataset_id, dataset_version_hash, method,
  params (json), statistic, p_value, effect_size,
  ci (json), output_table (json), script_snippet,
  created_by, created_at

ChartSpec
  id, result_id (nullable), dataset_id, chart_type,
  config (json), created_at

AuditEvent            (append-only)
  id, actor_id, action, target_type, target_id,
  input_hash, metadata (json), created_at

ExportRecord
  id, user_id, target_type, target_id, format,
  consent_flag, created_at
```

### 1.7 API surface (high-level)

Versioned under `/api/v1`. Full contract in section 4.5.

```
POST   /auth/register            create account
POST   /auth/login               issue access+refresh tokens
POST   /auth/refresh             rotate refresh token
POST   /auth/logout              revoke refresh token

GET    /projects                 list projects for user
POST   /projects                 create project
POST   /projects/{id}/members    add member with role

POST   /datasets                 upload (multipart, streamed)
GET    /datasets                 list (scoped)
GET    /datasets/{id}            metadata + schema
GET    /datasets/{id}/download   signed URL
POST   /datasets/{id}/transform  create new version
GET    /datasets/{id}/history    version lineage

POST   /analyses                 run analysis (async job)
GET    /analyses/{job_id}        poll status / result
GET    /results/{id}             fetch stored result

POST   /charts                   create chart spec, get render payload
GET    /charts/{id}/png          export PNG
POST   /screenshots              server-side capture (consented)

POST   /ingest/{dataset_id}      append streaming rows
WS     /ws/datasets/{id}         live updates channel

GET    /audit                    query audit events (owner only)
POST   /exports                  bundle export (zip)
```

### 1.8 Milestones and deliverables (see section 6 for staging)

### 1.9 Risks, mitigations and compliance

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Visual terminal RCE (arbitrary code execution) | Critical | Restricted REPL with function whitelist, sandboxed worker, no fs/network, timeout + memory cap, never `eval` raw user input against system |
| Malicious file upload | High | Strict MIME + extension allowlist, size cap with streamed check, parse in isolated worker, never execute uploaded content |
| Scope creep into a full GUI clone | High (solo project killer) | MVP is CLI/API + terminal + core charts. Defer dashboards, DOE, SEM |
| Numerical incorrectness | High | Wrap validated libraries only, regression-test against known reference outputs (SPSS tutorial datasets) |
| Reproducibility drift | Medium | Lock deps, hash inputs, pin seeds, store script with every result |
| PII in research data | Medium | User-controlled retention, encryption at rest via storage layer, access logging, no third-party analytics on data content |
| Real-time render overload | Medium | Batch updates, downsample large series |

**Compliance posture:** personal-use, single-tenant first, so keep it lean. If it ever holds third-party personal data, add: explicit consent capture on upload, data export + delete on request (GDPR-style data subject rights), encryption at rest and a documented retention policy. Do not over-engineer compliance for a single-user tool, but design the audit + delete primitives so they are ready if needed.

---

## 2. System architecture

### 2.1 Overview

Three tiers: a React PWA front end, a FastAPI backend that both serves the REST/WS API and hosts the Python statistics engine, and a data tier (Postgres for metadata, object storage for files, Redis for jobs and pub/sub). Long analyses run on Celery workers. The visual terminal talks to a sandboxed execution service.

### 2.2 Component diagram (ASCII)

```
                         ┌─────────────────────────────────────────┐
                         │            Browser (React PWA)           │
                         │  Upload UI · Charts (Plotly) · xterm.js  │
                         │  Service Worker + IndexedDB (offline)    │
                         └───────┬───────────────────────┬─────────┘
                            HTTPS│REST                 WSS│ live/terminal
                                 ▼                        ▼
                         ┌─────────────────────────────────────────┐
                         │              API Gateway                  │
                         │        FastAPI (ASGI, Uvicorn)            │
                         │  auth · RBAC · validation · rate limit    │
                         └───┬───────────┬───────────┬──────────────┘
                             │           │           │
              ┌──────────────▼──┐  ┌─────▼──────┐  ┌─▼───────────────┐
              │ Analysis Engine │  │ Job Queue  │  │ Sandbox Exec    │
              │ pandas/scipy/   │  │ Celery +   │  │ Restricted REPL │
              │ statsmodels/    │  │ Redis      │  │ (whitelist,     │
              │ pingouin/sklearn│  │ (async     │  │ timeout, memcap)│
              │                 │  │ analyses)  │  │                 │
              └────────┬────────┘  └─────┬──────┘  └─────────────────┘
                       │                 │
        ┌──────────────┼─────────────────┼──────────────┐
        ▼              ▼                 ▼               ▼
  ┌───────────┐  ┌───────────┐   ┌──────────────┐  ┌──────────┐
  │ PostgreSQL│  │  Redis    │   │ Object Store │  │ Parquet  │
  │ metadata, │  │ cache +   │   │ MinIO / S3   │  │ processed│
  │ audit,    │  │ pub/sub   │   │ raw uploads, │  │ data     │
  │ users     │  │ (live viz)│   │ exports, png │  │          │
  └───────────┘  └───────────┘   └──────────────┘  └──────────┘

  Cross-cutting: structured logging · Prometheus metrics · Sentry
```

### 2.3 Key components and interactions

- **Frontend (React PWA):** renders UI, holds no secrets, calls REST for CRUD and WebSocket for live viz + terminal I/O. Service worker caches shell and data for offline. Charts are Plotly, terminal is xterm.js.
- **API gateway (FastAPI):** authentication, RBAC checks, request validation (Pydantic), rate limiting, routing. Synchronous fast paths (metadata, small descriptives) run inline. Heavy analyses are enqueued.
- **Analysis engine:** a pure-Python package (no web imports) wrapping pandas, scipy, statsmodels, pingouin, scikit-learn, lifelines, pyreadstat. Stateless functions, fully unit-tested. This is the reusable core and also what the terminal calls.
- **Job queue (Celery + Redis):** runs long analyses, reports progress, stores results. Idempotent, retryable.
- **Sandbox exec service:** the visual terminal's backend. A restricted namespace exposing only whitelisted engine functions, run in a worker with timeouts and memory limits, no filesystem or network.
- **Postgres:** all metadata, users, memberships, audit log, result records, chart specs.
- **Object storage (MinIO local, S3 prod):** raw files, PNG exports, zip bundles.
- **Parquet layer:** processed dataset versions stored as Parquet for fast typed reload.
- **Redis pub/sub:** fans out live-data updates to WebSocket subscribers.

### 2.4 Tech stack recommendations

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend framework | React 18 + TypeScript + Vite | Fast, typed, matches your existing React/Vite stack |
| Styling | Tailwind CSS | Rapid, consistent |
| Data fetching | TanStack Query | Caching, retries, offline-friendly |
| State | Zustand | Minimal client state |
| Charts | Plotly.js | Interactive out of the box (zoom, brush, hover), PNG export built in |
| Terminal | xterm.js | Battle-tested browser terminal |
| Client screenshot | html2canvas | DOM element capture, no server round-trip |
| PWA/offline | Workbox + IndexedDB (idb) | Standard offline tooling |
| Backend | FastAPI (Python 3.12) | Async, typed, same language as the stats engine |
| ORM / migrations | SQLAlchemy 2.0 + Alembic | Mature, typed |
| Validation | Pydantic v2 | Request/response schemas |
| Auth | JWT (access+refresh) + passlib/argon2 | Standard, self-hostable |
| Jobs | Celery + Redis | Async analyses |
| Stats libs | scipy, statsmodels, pingouin, scikit-learn, lifelines, pyreadstat | Validated coverage (see prior gap register) |
| Dataframes | pandas default, polars opt-in for >1GB | Ecosystem first, speed when needed |
| DB | PostgreSQL 16 | Relational metadata + audit |
| Object storage | MinIO (local) / S3 (prod) | S3-compatible, portable |
| Server screenshot | Playwright (Python) | High-fidelity headless capture |
| Packaging | Docker + Docker Compose | Portable one-command stack |
| Dep management | uv (Python), pnpm (frontend) | Fast, lockfile-based |

### 2.5 API contracts and versioning

- All routes under `/api/v1`. Breaking changes bump to `/api/v2`; old version supported for one release cycle.
- Request/response bodies defined by Pydantic models, published as an OpenAPI 3 schema at `/api/v1/openapi.json` (FastAPI auto-generates).
- Errors use a consistent envelope: `{ "error": { "code": str, "message": str, "details": {...} } }`.
- Analysis is async: `POST /analyses` returns `202` with a `job_id`; client polls `GET /analyses/{job_id}` or subscribes over WS.

Representative contract (upload):

```jsonc
// POST /api/v1/datasets  (multipart/form-data: file, project_id, name)
// 201 Created
{
  "id": "ds_01H...",
  "name": "survey_q1",
  "source_format": "csv",
  "row_count": 4820,
  "content_hash": "sha256:9f2c...",
  "version": 0,
  "schema": [
    { "name": "age", "dtype": "int64", "measure": "scale" },
    { "name": "segment", "dtype": "object", "measure": "nominal" }
  ],
  "created_at": "2026-07-03T10:22:00Z"
}
```

Representative contract (run analysis):

```jsonc
// POST /api/v1/analyses
{
  "dataset_id": "ds_01H...",
  "method": "independent_ttest",
  "params": { "dv": "score", "group": "segment", "groups": ["A", "B"] }
}
// 202 Accepted -> { "job_id": "job_01H..." }
// GET /api/v1/analyses/job_01H... -> 200
{
  "status": "complete",
  "result": {
    "id": "res_01H...",
    "method": "independent_ttest",
    "statistic": 2.83, "p_value": 0.0048,
    "effect_size": { "cohens_d": 0.41 },
    "ci": [0.12, 0.71],
    "dataset_version_hash": "sha256:9f2c...",
    "script_snippet": "ttest(df, dv='score', group='segment', groups=['A','B'])"
  }
}
```

### 2.6 Deployment model

- **Local dev:** `docker compose up` brings the full stack (API, worker, Postgres, Redis, MinIO, frontend dev server). `.env` driven config.
- **CI/CD:** GitHub Actions. On PR: lint (ruff + eslint), typecheck (mypy + tsc), tests (pytest + vitest), build images. On merge to main: build and push images, deploy.
- **Containers:** each service (api, worker, frontend, sandbox) is a separate image. Multi-stage builds keep them lean.
- **Cloud target (personal-scale):** a single small VM or a PaaS such as Render / Fly.io / Railway running the Compose stack, plus managed Postgres and managed Redis, plus S3 for storage. Scales up later by splitting API and workers.
- **Monitoring:** Prometheus scrapes `/metrics`, Grafana dashboards, Sentry for errors, structured JSON logs shipped to a log store.
- **Secrets:** environment variables via the platform's secret manager, never committed. `.env.example` documents required keys.

---

## 3. Repository structure

```
statstudio/
├── README.md
├── docker-compose.yml
├── .env.example
├── .github/workflows/ci.yml
│
├── backend/
│   ├── pyproject.toml            # uv-managed
│   ├── uv.lock
│   ├── alembic/                  # migrations
│   ├── app/
│   │   ├── main.py               # FastAPI app factory
│   │   ├── config.py             # pydantic-settings
│   │   ├── deps.py               # DI: db session, current user
│   │   ├── auth/                 # jwt, rbac, password hashing
│   │   ├── models/               # SQLAlchemy models
│   │   ├── schemas/              # pydantic request/response
│   │   ├── api/v1/               # routers: auth, datasets, analyses, charts, ...
│   │   ├── services/             # storage, ingest, screenshot, export
│   │   ├── engine/               # PURE stats engine (no web imports)
│   │   │   ├── dataset.py        # Dataset wrapper + metadata
│   │   │   ├── descriptives.py
│   │   │   ├── inferential.py    # ttest, anova, chi2, ...
│   │   │   ├── modelling.py      # regression, sklearn wrappers
│   │   │   ├── charts.py         # chart spec builders
│   │   │   └── registry.py       # method registry for terminal whitelist
│   │   ├── sandbox/              # restricted REPL executor
│   │   ├── tasks/                # celery tasks
│   │   └── ws/                   # websocket handlers
│   └── tests/
│       ├── engine/               # reference-output regression tests
│       └── api/
│
├── frontend/
│   ├── package.json              # pnpm
│   ├── vite.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── lib/api.ts            # typed API client
│   │   ├── lib/offline.ts        # service worker + idb
│   │   ├── components/
│   │   │   ├── Uploader.tsx
│   │   │   ├── ChartPanel.tsx    # Plotly wrapper
│   │   │   ├── VisualTerminal.tsx# xterm.js
│   │   │   ├── ResultsGrid.tsx
│   │   │   └── ScreenshotButton.tsx
│   │   ├── pages/
│   │   └── store/                # zustand
│   └── tests/                    # vitest
│
└── docs/
    ├── api.md
    ├── architecture.md
    └── runbook.md
```

### 3.1 Illustrative snippets (reference only, generate the rest with Claude Code)

Engine dataset wrapper (backend/app/engine/dataset.py):

```python
from dataclasses import dataclass, field
import hashlib
import pandas as pd

@dataclass
class Dataset:
    data: pd.DataFrame
    name: str
    metadata: dict = field(default_factory=dict)  # {col: {measure, label, ...}}

    @property
    def content_hash(self) -> str:
        blob = pd.util.hash_pandas_object(self.data, index=True).values.tobytes()
        return "sha256:" + hashlib.sha256(blob).hexdigest()

    def infer_schema(self) -> list[dict]:
        out = []
        for col in self.data.columns:
            dtype = str(self.data[col].dtype)
            measure = "scale" if pd.api.types.is_numeric_dtype(self.data[col]) else "nominal"
            out.append({"name": col, "dtype": dtype, "measure": measure})
        return out
```

Inferential wrapper (backend/app/engine/inferential.py):

```python
import pingouin as pg
import pandas as pd

def independent_ttest(df: pd.DataFrame, dv: str, group: str, groups: list[str]) -> dict:
    a = df.loc[df[group] == groups[0], dv].dropna()
    b = df.loc[df[group] == groups[1], dv].dropna()
    res = pg.ttest(a, b)  # validated implementation, do not reinvent
    row = res.iloc[0]
    return {
        "method": "independent_ttest",
        "statistic": float(row["T"]),
        "p_value": float(row["p-val"]),
        "effect_size": {"cohens_d": float(row["cohen-d"])},
        "ci": [float(row["CI95%"][0]), float(row["CI95%"][1])],
    }
```

FastAPI upload route sketch (backend/app/api/v1/datasets.py):

```python
@router.post("/datasets", status_code=201)
async def upload_dataset(
    file: UploadFile,
    project_id: str = Form(...),
    name: str = Form(...),
    user=Depends(require_role("editor")),
    db=Depends(get_db),
):
    validate_upload(file)                 # extension + MIME allowlist, size cap
    key = await storage.stream_save(file) # streamed, size-checked write
    ds = ingest.register(db, key, project_id, name, user.id)
    audit.log(db, user.id, "dataset.upload", "dataset", ds.id, ds.content_hash)
    return ds.to_schema()
```

Config file (.env.example):

```bash
# backend
DATABASE_URL=postgresql+psycopg://stat:stat@db:5432/statstudio
REDIS_URL=redis://redis:6379/0
JWT_SECRET=change-me
ACCESS_TOKEN_TTL=900
REFRESH_TOKEN_TTL=1209600
STORAGE_ENDPOINT=http://minio:9000
STORAGE_BUCKET=statstudio
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
MAX_UPLOAD_MB=200
SANDBOX_TIMEOUT_SEC=10
SANDBOX_MEM_MB=512
# frontend
VITE_API_BASE=http://localhost:8000/api/v1
```

---

## 4. Claude Code prompt pack

Paste the master prompt first to scaffold, then use the module prompts one at a time. Claude Code works best with tight scope per prompt.

### 4.1 Master scaffolding prompt

```
You are a senior full-stack engineer scaffolding "StatStudio", a Python-powered
statistics and market-research web platform (a personal SPSS/JMP alternative).

ROLE: Set up a clean, typed, testable monorepo. Do not implement business logic
yet beyond thin working stubs. Prioritise correct structure, config and wiring.

STACK (do not substitute without asking):
- Backend: FastAPI (Python 3.12), SQLAlchemy 2.0, Alembic, Pydantic v2,
  Celery + Redis, uv for deps.
- Stats engine: a PURE package under app/engine with NO web imports, wrapping
  pandas, scipy, statsmodels, pingouin, scikit-learn.
- Frontend: React 18 + TypeScript + Vite + Tailwind, TanStack Query, Zustand,
  Plotly.js, xterm.js, pnpm.
- Data: PostgreSQL 16, Redis, MinIO (S3-compatible).
- Orchestration: docker-compose for the full local stack.

SCOPE (this prompt only):
1. Create the repo tree exactly as specified in the attached structure.
2. Write pyproject.toml (uv), package.json (pnpm), docker-compose.yml,
   .env.example, and a GitHub Actions CI workflow (lint, typecheck, test).
3. FastAPI app factory with health route, settings via pydantic-settings,
   DB session dependency, and one working Alembic migration for the User table.
4. React app shell that boots, reads VITE_API_BASE, and calls /health.
5. Wire linting (ruff, eslint), typing (mypy, tsc) and tests (pytest, vitest)
   so `docker compose up` and the test commands all run green.

CONSTRAINTS:
- Everything typed. No `any` in TS, no untyped defs in Python.
- The engine package must import cleanly with zero web/db dependencies.
- No secrets committed. Use .env.example.
- Prose in code comments: plain, no em dashes.

EXPECTED OUTPUT:
- All files created, a README with run instructions, and a short note listing
  every command to verify the scaffold works locally.
```

### 4.2 Module prompt — backend data upload/download

```
ROLE: Backend engineer on StatStudio. Implement secure dataset upload/download.

SCOPE:
- POST /api/v1/datasets: multipart, streamed to MinIO with a size cap enforced
  DURING streaming (reject >MAX_UPLOAD_MB with 413 before full buffering).
  Allowlist CSV/XLSX/Parquet/.sav by extension AND sniffed MIME. Reject others
  with 415. On success: store object, compute a sha256 content hash, sniff
  schema (columns, dtypes, row count, null counts), create Dataset (version 0)
  and VariableMetadata rows, write an AuditEvent.
- GET /api/v1/datasets/{id}/download: return a time-limited signed URL, never a
  raw object path. 403 (audit-logged) if the user lacks project read access.
- Parse uploaded files in an isolated function; never execute file content.

REQUIREMENTS:
- RBAC: upload requires editor role, download requires viewer+.
- Pydantic schemas for all requests/responses.
- Reject path traversal and duplicate names within a project gracefully.

TESTS (pytest, required):
- valid CSV upload returns 201 with schema and hash
- oversize upload returns 413
- wrong type returns 415
- viewer cannot upload (403), unauthorized download is 403 and audit-logged

OUTPUT: routes, service functions (storage, ingest, validation), schemas,
tests, and a docs/api.md section. No em dashes in comments.
```

### 4.3 Module prompt — screenshot service

```
ROLE: Backend + frontend engineer on StatStudio. Implement consented screenshots.

SCOPE:
- Client-side: a ScreenshotButton component using html2canvas to capture a
  target DOM element (chart or table). Show a consent dialog BEFORE capture.
  On confirm, produce a PNG and offer download; on decline, do nothing.
- Server-side (high fidelity, optional): POST /api/v1/screenshots renders a
  shareable result view with Playwright (headless Chromium) and returns a PNG.
  Gate behind auth + RBAC + an explicit consent flag in the request body.
- Record every capture (client-confirmed or server) as an ExportRecord +
  AuditEvent with consent_flag=true.

CONSTRAINTS:
- No capture may occur without recorded consent.
- Playwright runs in its own container/service; never render arbitrary URLs,
  only internal result views by id.

TESTS: server route rejects missing consent (400); records audit on success.
Frontend: unit test that declining consent produces no capture call.

OUTPUT: component, route, service, schemas, tests, docs note.
```

### 4.4 Module prompt — graphing widget

```
ROLE: Frontend engineer on StatStudio. Build the interactive charting module.

SCOPE:
- ChartPanel.tsx: a typed Plotly wrapper supporting histogram, box, line, bar
  and scatter. Props: chart_type, dataset columns, config. Interactions: zoom,
  pan, hover, legend toggle, box/lasso select (scatter).
- A ChartSpec type mirroring the backend schema so a chart round-trips
  (build spec -> render -> serialise -> re-render identically).
- Controls: histogram bin count, axis pickers, series pickers.
- Export: PNG (Plotly toImage) and underlying data as CSV/JSON.
- Downsample to <=100k points before render for large series; show a notice.

TESTS (vitest + testing-library):
- renders each chart type from a spec
- bin control updates the histogram
- export handler produces a PNG blob and a CSV string

OUTPUT: component, types, hooks, tests, a Storybook-free usage example in docs.
No em dashes in comments.
```

### 4.5 Module prompt — visual terminal

```
ROLE: Backend + frontend engineer on StatStudio. Build the visual terminal:
a browser REPL bound to the stats engine, NOT a system shell.

SCOPE:
- Frontend: VisualTerminal.tsx using xterm.js. Sends each entered line over a
  WebSocket to the sandbox exec service; prints text output; routes any figure
  payload to ChartPanel and any table payload to ResultsGrid.
- Backend sandbox service: evaluate input against a RESTRICTED namespace that
  exposes ONLY whitelisted engine functions from app/engine/registry.py
  (load, describe, ttest, anova, hist, scatter, ...). No builtins like open,
  exec, eval, import, __; no filesystem; no network.
- Enforce per-call timeout (SANDBOX_TIMEOUT_SEC) and memory cap
  (SANDBOX_MEM_MB); kill and report on breach.
- Session history persists per session and can be saved as a reproducible
  script (an ordered list of executed lines) attached to the project.

SECURITY (hard requirements, call out in code comments):
- Never eval raw user input in the main process.
- Whitelist calls by AST inspection: reject any node that is not a call to an
  allowed name or a literal argument. Reject attribute access to dunders.

TESTS:
- allowed call (describe) returns a table payload
- disallowed input (import os / open(...) / __import__) is rejected, not run
- timeout on an infinite loop returns a timeout error, not a hang

OUTPUT: component, ws handler, sandbox executor with AST validator, registry,
tests, and a docs/security note on the sandbox model.
```

### 4.6 Module prompt — real-time visualisation

```
ROLE: Full-stack engineer on StatStudio. Add near-real-time chart updates.

SCOPE:
- POST /api/v1/ingest/{dataset_id}: append rows to a streaming-flagged dataset;
  publish an update event to Redis pub/sub.
- WS /api/v1/ws/datasets/{id}: subscribe; forward batched updates to clients
  on a fixed interval (500 ms) to handle backpressure.
- Frontend: a live line chart that appends incoming points without full reload;
  shows a "live" indicator and pauses cleanly on disconnect.

TESTS: ingest publishes an event; ws client receives batched updates; verify
updates are batched, not one-per-row, under high rate.

OUTPUT: routes, ws handler, redis pub/sub wiring, frontend hook, tests.
```

---

## 5. MVP and iterations

### 5.1 MVP feature list

In scope for MVP:
- Email/password auth with JWT, single role behaviour (owner) to start.
- CSV/XLSX upload with schema sniffing, content hash and object storage.
- Dataset list + metadata view with variable measure tagging.
- Descriptive statistics (mean, median, SD, skew, frequency tables).
- One inferential method end to end (independent-samples t-test).
- Interactive charts: histogram and scatter via Plotly, PNG + CSV export.
- Visual terminal running the whitelisted engine (load, describe, ttest, hist).
- Audit log for upload, analysis and export.
- Dataset versioning (raw = v0, one transform path).
- Docker Compose local run.

**MVP success criteria:** a real dataset goes upload → tag → describe → t-test →
histogram → export, both via UI and via the terminal, reproducibly, on a clean
`docker compose up`, with every action showing in the audit log.

Explicitly deferred from MVP: RBAC multi-role, server-side screenshots,
real-time streaming, offline PWA, ANOVA/regression, SPSS `.sav`, bundle export,
dashboards, DOE/SEM/complex-samples (from the prior capability gap register).

### 5.2 Iteration plan

| Phase | Weeks | Adds |
|-------|-------|------|
| MVP | 1–3 | Auth, upload, descriptives, t-test, histogram/scatter, terminal, audit, versioning |
| Iteration 2 | 4–5 | RBAC (editor/viewer), download signed URLs, client screenshots, ANOVA + linear/logistic regression, more chart types, CSV/JSON/PNG export polish |
| Iteration 3 | 6–7 | Real-time ingest + live charts, server-side screenshots (Playwright), bundle export (zip) |
| Iteration 4 | 8–9 | Offline PWA + graceful degradation, `.sav` import, project sharing/members |
| Iteration 5 | 10+ | Backlog from gap register: survival analysis, factor/cluster, plugin system via entry points; optional Streamlit-style dashboard |

### 5.3 Minimal security and privacy

- HTTPS everywhere, Argon2 password hashing, short-lived access + rotating refresh tokens.
- Strict upload validation and a sandboxed terminal (the two highest-risk surfaces).
- Signed, time-limited download URLs. Rate limiting on auth and upload.
- User-controlled hard delete; audit log retains the deletion event but not the data.
- No third-party analytics touching dataset content. Secrets only via env.

---

## 6. Deliverables checklist

- [ ] Monorepo scaffold (backend + frontend + compose + CI) that runs green
- [ ] API contracts published as OpenAPI at `/api/v1/openapi.json`
- [ ] Database schema + Alembic migrations for all core models
- [ ] `.env.example` documenting every required variable
- [ ] Engine package with reference-output regression tests
- [ ] Frontend components: Uploader, ChartPanel, VisualTerminal, ResultsGrid, ScreenshotButton
- [ ] `docs/`: api.md, architecture.md, runbook.md
- [ ] README with local-run and deploy instructions

---

## 7. Run locally and deploy

### 7.1 Local

```bash
git clone <repo> && cd statstudio
cp .env.example .env          # edit secrets
docker compose up --build     # api, worker, db, redis, minio, frontend

# verify
curl http://localhost:8000/health          # backend
open http://localhost:5173                 # frontend

# backend tests
docker compose exec api uv run pytest
# frontend tests
docker compose exec frontend pnpm test
```

### 7.2 Production (personal-scale)

1. Provision managed Postgres, managed Redis and an S3 bucket.
2. Set production env vars in your host's secret manager (Render/Fly/Railway).
3. CI builds and pushes images on merge to `main`; the host pulls and runs them.
4. Run `alembic upgrade head` as a release step.
5. Point a domain at the frontend, enable HTTPS (managed certs).
6. Wire Prometheus/Grafana + Sentry; confirm `/metrics` scrapes and errors report.

### 7.3 Reproducibility discipline

- Commit `uv.lock` and `pnpm-lock.yaml`.
- Pin random seeds in any stochastic analysis; store the seed on the result.
- Every result stores its script snippet + input dataset version hash, so a run
  is reproducible from data + script alone.

---

*End of specification. Build with the master prompt first, then the module prompts one at a time. Keep the engine package web-free so it stays reusable and testable.*
