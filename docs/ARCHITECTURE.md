# Architecture Overview

## High-Level

```
Browser (Angular) ──realtime──> Firestore (read/listen)
       │                              ▲
       │ POST/PUT/DELETE               │ write
       ▼                              │
   FastAPI Backend ───────────> Firestore (via firedantic)
       │
       └── Firebase Auth (JWT verify via Depends)
```

- **Frontend đọc dữ liệu trực tiếp từ Firestore** (realtime listeners).
- **Backend chỉ xử lý mutations** (POST/PUT/DELETE) và business logic phức tạp.
- Auth: Firebase Authentication → JWT token → Backend verify qua `Depends(verify_token)`.

## Frontend

- **Framework:** Angular 20+ (Standalone Components, Signals, `input()`/`output()`)
- **Styling:** Tailwind CSS 4 (PostCSS plugin) + custom `@theme` tokens
- **Routing:** Lazy Loading via `loadComponent()`, Guards (`authGuard`, `requireNoAuthGuard`)
- **State:** Angular Signals (`signal()`, `effect()`) — chưa dùng NgRx SignalStore
- **Pattern:** Smart/Container + Dumb/Presentational components
- **Design System:** "Green Growth" — Primary `#00C27A`, Accent `#B9FF3B`, Dark Green `#062E24`
- **Fonts:** Inter (body) + Plus Jakarta Sans (heading)
- **Testing:** Karma + Jasmine

## Backend

- **Framework:** FastAPI (async)
- **ORM/DB:** Firedantic (Pydantic-based Firestore models)
- **Auth Middleware:** `verify_token` dependency (Firebase Admin SDK `auth.verify_id_token`)
- **Config:** `pydantic-settings` + `.env` file
- **Logging:** `logging` module — text format (local) / JSON format (production Cloud Run)
- **Error Handling:** Global exception handlers (`CustomException`, `ValidationError`, generic `Exception`)
- **Package Manager:** `uv`
- **Pattern:** Endpoint → Service → Model (3-layer)
- **Response Format:** `DataResponse[T]` wrapper chuẩn (`code`, `message`, `data`)

## Infrastructure

- **Docker Compose:** 3 services
  - `firebase-emulator` (Auth:9099, Firestore:8080, Storage:9199, UI:4000)
  - `backend` (port 8000, hot-reload via volume mount)
  - `frontend` (port 4200, hot-reload via volume mount)
- **Production:** Cloud Run (planned)

## Dev Workflow

```bash
# Start all services
docker compose up

# Frontend only
cd frontend && npm start      # localhost:4200

# Backend only
cd backend && uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000

# DB Migration
cd backend && uv run migrate
```