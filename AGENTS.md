# Repository Instructions

## FLAE

FLAE is an **AI Company Memory** platform that connects and organizes knowledge scattered across documents, source code, workplace tools, and internal systems. It turns data from sources such as Google Drive, Notion, Slack, and GitHub into a continuously updated knowledge layer that understands relationships between people, projects, decisions, documents, code, and risks.

Users can interact with FLAE directly through the web application or connect through FLAE's MCP server, giving AI agents such as Codex, Claude, Cursor, and OpenClaw access to accurate business context.

## Mission And Stack

Act as a senior full-stack engineer and system architect. Build FLAE Agents to enterprise standards for maintainability, scalability, security, and performance.

- Frontend (`frontend/`): React SPA, Vite, strict TypeScript, Tailwind CSS, React Router, TanStack Query, Zustand, and Firebase.
- Backend (`backend/`): FastAPI, Pydantic, SQLAlchemy, Alembic, asyncpg, Redis, and PostgreSQL.
- Use `uv` for all backend dependency and virtual-environment operations; do not use `pip`.

## General Coding Standards

- Follow DRY and SOLID. Prefer clear, cohesive modules over duplicated or overly abstract code.
- Use `camelCase` in TypeScript and `snake_case` in Python, following framework conventions where required.
- Use strict, explicit types in TypeScript and Python. Avoid `any`; if unavoidable, isolate and justify it.
- Add unit or integration tests for every new feature on both frontend and backend as applicable. Keep coverage at 75% or higher.

## Frontend Architecture

### Directory Tree & Code Organization

The frontend source code is structured under [frontend/src](frontend/src) as follows:

```
frontend/src/
├── app/                  # Application bootstrap and global configuration
│   ├── providers/        # React Context Providers (QueryClient, Auth, etc.)
│   ├── router/           # App-level routing (App Router)
│   ├── layout/           # Global layouts (Sidebar, Header, Main Layout)
│   ├── errors/           # Global error handling and Error Boundaries
│   ├── App.tsx           # Root application component
│   └── main.tsx          # Entry point for React application bootstrapping
├── core/                 # Core system configurations (Firebase SDK client, environment config)
├── features/             # Domain-driven feature modules
│   └── <feature-name>/   # Example: agents, chat, knowledge, settings...
│       ├── api/          # Network layer (TanStack Query hooks: queries & mutations)
│       ├── hooks/        # Custom React hooks specific to this feature
│       ├── pages/        # Page-level components connected to routing
│       ├── routes/       # Child route definitions for this feature
│       ├── schemas/      # Zod validation schemas (e.g., form validation)
│       ├── types/        # TypeScript types and interfaces specific to this domain
│       └── ui/           # Internal UI components used only within this feature
└── shared/               # Shared code utilized across features
    ├── ui/               # Presentational components (Button, Input, Modal, etc.)
    ├── lib/              # Shared libraries and helpers (utils, local storage, date, etc.)
    └── i18n/             # Internationalization configuration (Localization)
```

### Core Architecture Rules

- **Design System First (Mandatory)**: You MUST read and strictly adhere to [DESIGN.md](DESIGN.md) before creating, modifying, or refactoring any UI component, page, layout, or visual styling. Ensure all color tokens, typography, surfaces, glassmorphism, animations, and component patterns strictly comply with the design specification.
- **Feature Organization**: Each business domain must reside in its own directory under `frontend/src/features/<feature-name>/`. Avoid creating generic catch-all features containing unrelated business logic.
- **shared/ui Boundaries**: Components in `shared/ui/` must be strictly presentational. They should only receive data via `props` and emit signals via `callbacks`. They must never make API calls, read/write to the global store (Zustand), or contain feature-specific business logic.
- **State & Data Management**:
  - **Server State**: Must use **TanStack Query** for all server-related data actions (fetching, caching, mutation, invalidation, and request lifecycle management). Never replicate data from TanStack Query into Zustand.
  - **Global Client State**: Use **Zustand** only for UI client states that genuinely need to be shared across distant component branches or routes.
  - **Local State**: Prefer React's `useState` / `useReducer` for component-internal states.
- **Forms**: Forms with 2 or more fields or complex validation rules must use **React Hook Form** combined with **Zod**. The Zod schema is the single source of truth for validation.
- **API Communication**: All requests to the backend must pass through a typed API layer (the `api` folder within each feature). Components and Pages must not call `fetch`, Axios, or network SDKs directly.
- **Usage of Effects**: Only use `useEffect` to synchronize with systems outside React (browser APIs, event listeners, websockets). Always return a cleanup function to clean up subscriptions, listeners, timers, or cancel asynchronous requests.
- **Routing**: Routing at feature boundaries must be lazy-loaded. Stable public paths must not be changed arbitrarily without a backward compatibility plan.

### Frontend Testing

- Use **Vitest** and **React Testing Library** for unit & integration tests, and **Playwright** for end-to-end business flow testing.
- Focus tests on user behavior and accessibility rather than implementation details. Test coverage must reach **at least 75%**.

## Backend Architecture

### Directory Tree & Code Organization

The backend source code is structured under [backend/app](backend/app) as follows:

```
backend/app/
├── agents/               # AI Agents architecture logic (LangChain, LangGraph, prompt templates, tools)
├── api/                  # API Endpoints (FastAPI Routers)
│   ├── v1/               # Version 1 endpoints grouped by domain (auth, agents, chats, etc.)
│   └── deps.py           # FastAPI dependency injection (token verification, DB sessions, etc.)
├── core/                 # Core system configuration
│   ├── config.py         # Environment variables and system configurations management
│   ├── security.py       # Security handling, Firebase JWT Token verification
│   ├── logger.py         # Logging configuration (plain text locally, JSON in production)
│   └── exceptions.py     # Centralized exception definitions and Global Exception Handler
├── db/                   # Database setup and connection
│   ├── session.py        # Async session factory for PostgreSQL connections
│   └── base.py           # SQLAlchemy declarative base (imports all models for Alembic)
├── models/               # SQLAlchemy ORM Models (Physical database schema definition)
├── schemas/              # Pydantic Schemas for request/response validation
├── services/             # Service Layer (Core business logic and DB queries execution)
├── temporal/             # Temporal SDK configurations (Workflows, Activities, Workers for background tasks)
├── evaluation/           # Agent quality evaluation and testing (Agent Evaluation)
├── helpers/              # Specific business logic helper functions
└── utils/                # General utility functions
```

### Core Architecture Rules

- **File Size Limit**: **Maximum 450 lines** per source file.
- **Strict 3-Layer Architecture (`Endpoint -> Service -> Model`)**:
  1. **API Endpoints (`app/api/`)**: Responsible for receiving requests, validating transport payloads, enforcing authentication/authorization via Dependency Injection, calling the appropriate Service, and returning data formatted by Pydantic schemas. **PROHIBITED** from executing database queries, calling `db.execute`, or executing `db.commit` directly.
  2. **Service Layer (`app/services/`)**: Houses all business logic and database transaction logic. All database query, insertion, deletion, and transaction commit operations must be implemented here.
  3. **Data Model (`app/models/`)**: Defines the physical database tables using SQLAlchemy.
- **Asynchronous Operations**: Use `async`/`await` for all I/O operations (database access via `asyncpg`, external API integration, Redis interactions, and realtime Pub/Sub).
- **Database Partitioning by Responsibility**: The architecture partitions data into 3 distinct databases:
  - `flae_db`: Stores core application metadata, user accounts, and tenant configurations.
  - `flae_agent_state_db`: Stores conversation history, checkpoints, and agent execution states.
  - `rag_db`: Stores vector knowledge bases (vector chunks and embeddings).
- **Multi-tenancy Security**:
  - Enforce PostgreSQL Row Level Security (RLS) on database tables to guarantee absolute tenant isolation.
  - Partitioning (Partition Table) by tenant ID is reserved exclusively for high-volume vector chunk/embedding tables within `rag_db`. Do not apply partitioning to small tables or other databases to prevent unnecessary Alembic migration complexity and performance degradation.
- **Logging & Exceptions**:
  - Always utilize `get_logger` from `app.core.logger` for all logging. The use of `print()` is strictly PROHIBITED in production code.
  - Any error occurring in the Service layer must be raised as a custom application Exception, so the API Global Exception Handler can catch and format a standardized response for the frontend, preventing system stack traces from leaking.
- **Migrations**: All database schema changes must be managed through **Alembic migrations** (normally generated with `uv run alembic revision --autogenerate` and carefully reviewed before execution).

## Superpowers Workflow

- Use workflows from the Superpowers plugin only for complex tasks.
- Treat a task as complex when it involves multiple dependent implementation steps, cross-cutting or architectural changes, significant ambiguity or tradeoffs, non-trivial debugging, or high-risk verification.
- For straightforward requests such as small isolated edits, simple questions, or routine inspections, do not invoke or follow Superpowers workflows unless the user explicitly requests them.

## Instruction Priority

When repository instructions conflict, follow this order:

1. The user's explicit request for the current task.
2. Security, accessibility, and functional correctness.
3. This `AGENTS.md` and `DESIGN.md` within their respective scopes.
4. Existing local component and architecture patterns.
5. General framework or library defaults.
