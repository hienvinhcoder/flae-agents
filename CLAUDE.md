# FLAE Agents

AI Company Memory platform — connects knowledge across documents, source code, workplace tools and internal systems into a continuously updated knowledge layer. Users interact via the web app or through an MCP server, giving AI agents (Codex, Claude, Cursor) access to accurate business context.

## Architecture

```
Frontend (React/Vite)  →  Backend (FastAPI)  →  PostgreSQL + pgvector
                              ↕
                         Temporal (workflows)
                              ↕
                     LangChain / LangGraph (agents)
```

### 3 Databases

| Database | Purpose |
|----------|---------|
| `flae_db` | Core app metadata, users, workspaces |
| `rag_db` | Vector chunks, embeddings, evidence, graph (RLS enforced) |
| `flae_agent_state_db` | LangGraph checkpoints and agent state |

### Knowledge pipeline

```
Connector event → Revision → Parse/Chunk → Base publish (searchable)
  → Entity/Relation/Domain/Topic Extraction → Fusion → Save
    → Domain Navigation (API) → MCP Tools
    → Retriever (demo-style Beam Search) → cited answers via QA Agent
```

## Quick start

```bash
# Full stack via Docker
docker compose up

# Backend only
cd backend && uv sync && uv run uvicorn main:app --reload --reload-dir app

# Frontend only
cd frontend && npm install && npm run dev
```

## Key commands

| Task | Command |
|------|---------|
| All backend tests | `uv run --project backend pytest -q` |
| Evaluation only | `uv run --project backend pytest backend/tests/evaluation -q` |
| Collect tests (fast) | `uv run --project backend pytest --collect-only -q` |
| Core migration | `uv run --project backend alembic upgrade head` |
| RAG migration | `uv run --project backend alembic -c backend/alembic-rag.ini upgrade head` |
| Frontend dev | `cd frontend && npm run dev` |
| Frontend tests | `cd frontend && npm run test` |
| Frontend e2e | `cd frontend && npm run test:e2e` |
| Type check frontend | `cd frontend && npm run typecheck` |

## Detailed docs

- `AGENTS.md` — full repository instructions (architecture rules, coding standards, all layers)
- `backend/CLAUDE.md` — backend deep context (services, workflows, agents, env vars)
- `frontend/CLAUDE.md` — frontend deep context (features, components, design system)
- `DESIGN.md` — brand, colors, typography, component guidelines
- `tasks/plan.md` — implementation plan and task tracking


---
