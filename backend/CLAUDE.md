# Backend — FLAE Agents

## Tech Stack

- **Framework:** FastAPI + Uvicorn
- **ORM:** SQLAlchemy (async, via asyncpg)
- **Migrations:** Alembic (two tracks: `flae_db` and `rag_db`)
- **Task orchestration:** Temporal (workflows + activities)
- **AI agents:** LangChain / LangGraph + LangSmith
- **Vector DB:** PostgreSQL + pgvector
- **External LLM:** Google Gemini (extraction, embeddings)
- **Cache / queues:** Redis
- **Auth:** Firebase Admin SDK (JWT verification)

Use `uv` for all dependency and virtual-environment operations. Do **not** use `pip`.

---

## Architecture

### 3-Layer rule: Endpoint → Service → Model

| Layer | Directory | Responsibilities |
|-------|-----------|-----------------|
| API Endpoint | `app/api/v1/routes/` | Receive request, validate transport payload, enforce auth via DI, call Service, return Pydantic schema. **Never** query DB directly. |
| Service | `app/services/` | All business logic, DB transactions, domain rules. |
| Model | `app/models/` | SQLAlchemy ORM table definitions. |

### 3 Databases

| Database | Purpose | Connection key |
|----------|---------|---------------|
| `flae_db` | Core app: users, workspaces, knowledge bases, topics | `POSTGRES_URL` |
| `rag_db` | Vector chunks, embeddings, evidence, graph, revisions (RLS enforced) | `RAG_DATABASE_URL` |
| `flae_agent_state_db` | LangGraph checkpoints and agent execution state | `AGENT_STATE_DATABASE_URL` |

### Key directories

```
backend/app/
├── agents/                  # LangGraph agents
│   ├── qa/                  #   Q&A agent with tool routing
│   └── shared/              #   Shared LLM factory, prompts, utils
├── api/v1/routes/           # FastAPI routers (auth, knowledge, chat, topics …)
├── core/                    # Config, security, logger, exceptions, telemetry_redaction, langsmith
├── connectors/              # External adapter contracts (e.g. Google Drive)
├── db/                      # Session factory, RAG DB manager, checkpoint
├── models/                  # flae_db + rag ORM models
├── schemas/                 # Pydantic request/response schemas
├── services/                # Business logic
│   ├── knowledge/           #   Ingestion, extraction, retrieval, graph, discovery
│   ├── agents/              #   Agent/chat session CRUD
│   └── …
├── temporal/                # Workflows and activities
│   ├── workflows/           #   Temporal workflow definitions
│   └── activities/          #   Temporal activity implementations
└── evaluation/              # LangSmith evaluation helpers
```

### Temporal Workflows

| Workflow | Purpose |
|----------|---------|
| `ingestion_v2` | Main ingestion: base staging → atomic publish → extraction (entity + relation + domain + topic) → fusion → save |

### Workers

| Entry point | Role |
|------------|------|
| `workers/flae_worker.py` | Interactive worker (chat, QA, agent tasks) |
| `workers/flae_ingestion_worker.py` | Ingestion-only worker (Temporal ingestion task queue) |

---

## Running

### Dev server

```bash
cd backend
uv sync
uv run uvicorn main:app --reload --reload-dir app
```

### Docker

```bash
docker compose up backend postgres redis temporal
```

### Tests

```bash
# All tests (unit + integration; integration requires PostgreSQL)
uv run --project backend pytest -q

# Evaluation fixtures only (offline, no DB)
uv run --project backend pytest backend/tests/evaluation -q

# Temporal workflow tests (uses test server)
uv run --project backend pytest backend/tests/temporal -q

# Integration tests only (requires migrated PostgreSQL)
uv run --project backend pytest -m integration -q

# Collect without running (fast sanity check)
uv run --project backend pytest --collect-only -q
```

### Migrations

```bash
# flae_db (core)
uv run --project backend alembic upgrade head
uv run --project backend alembic revision --autogenerate -m "description"

# rag_db (knowledge base / vector store)
uv run --project backend alembic -c backend/alembic-rag.ini upgrade head
uv run --project backend alembic -c backend/alembic-rag.ini revision --autogenerate -m "description"
```

### Workers

```bash
uv run --project backend flae-worker           # Interactive worker
uv run --project backend flae-ingestion-worker  # Ingestion worker
```

---

## Environment

Copy `backend/.env.example` to `backend/.env` and fill in:

| Variable | Required | Default / Notes |
|----------|----------|----------------|
| `RAG_DATABASE_URL` | Yes | `postgresql+asyncpg://…@localhost:5432/rag_db` |
| `POSTGRES_URL` | Yes | Core DB (`flae_db`) |
| `AGENT_STATE_DATABASE_URL` | No | LangGraph agent state DB |
| `REDIS_URL` | Yes | `redis://localhost:6379/0` |
| `TEMPORAL_HOST` | Yes | `localhost:7233` |
| `GEMINI_API_KEY` | Yes | For LLM extraction and embeddings |
| `LANGCHAIN_API_KEY` | No | Enables LangSmith tracing |
| `INGESTION_V2_ENABLED` | No | `true` to enable V2 ingestion workflow |

---

## Key conventions

- All I/O is `async`/`await` (asyncpg, httpx, Redis, Temporal).
- Logging: always use `from app.core.logger import get_logger`. Never `print()`.
- Errors: raise custom exceptions from `app.core.exceptions` — the global handler formats them for the API response.
- RLS: `rag_db` enforces Row Level Security. Repositories receive typed `AuthorizationContext` and must never expose unscoped queries.
- Temporal workflows receive reference-only Pydantic models — never raw documents, full chunk arrays, or embeddings.
- Schemas: public and workflow boundaries use explicit Pydantic models. No unbounded `Any` at service boundaries.
