# Project Context - Backend

> **Last Updated**: 2026-06-05

## 1. Overview
Hệ thống backend xử lý API mutations và business logic phức tạp cho ứng dụng FLAE (Company Memory AI), tích hợp PostgreSQL (cho metadata và dữ liệu RAG), Redis (cho cache và realtime Pub/Sub), Firebase (xác thực), và Temporal (cho việc quản lý và thực thi các long-running workflows).

## 2. Stack
- Python ≥ 3.11
- FastAPI · Uvicorn
- PostgreSQL · SQLAlchemy (v2) · asyncpg · Alembic · pgvector (vector search)
- Redis (Caching & Pub/Sub) · WebSockets
- Firebase Admin SDK (Auth, Storage)
- Temporal Python SDK (`temporalio`)
- pydantic v2 · pandas · numpy
- `uv` (package manager)

## 3. Project Structure
```text
backend/
├── app/
│   ├── agents/           # Các LLM Agents (Slack Digest, Stale Doc Detector, v.v.)
│   ├── api/              # API Routers
│   │   └── v1/           # API v1 endpoints
│   │       ├── endpoints/
│   │       │   ├── auth.py          # Đồng bộ và xác thực Firebase User
│   │       │   ├── user.py          # Profile user & workspace hiện tại
│   │       │   ├── workspace.py     # Quản lý Workspaces thủ công
│   │       │   └── temporal_demo.py # Tích hợp gọi Temporal workflows
│   │       └── api_router.py
│   ├── core/             # Cấu hình hệ thống, logging, security, temporal client setup
│   ├── db/               # Khởi tạo DB sessions
│   │   ├── database.py   # PostgreSQL flae_db (metadata) & Redis client
│   │   └── rag_db.py     # PostgreSQL flae_knowledge_db (RAG DB manager với RLS & Partition)
│   ├── helpers/          # Exception Handlers
│   ├── models/           # Các Model SQLAlchemy
│   │   ├── base.py       # BaseModel (id UUID, timestamps)
│   │   ├── user.py       # Model User
│   │   └── workspace.py  # Model Workspace, IntegrationConfig, BriefingItem
│   ├── schemas/          # Pydantic Schemas (Request/Response validation)
│   ├── services/         # Business & DB service layers
│   └── temporal/         # Logic chạy Temporal
│       ├── workflows/    # Định nghĩa các Temporal Workflows (ví dụ: GreetingWorkflow)
│       └── activities/   # Định nghĩa các Temporal Activities (ví dụ: greet)
├── migrations/           # Alembic Migration Scripts
├── scripts/              # Helper Scripts (e.g. migrate.py)
├── workers/              # Temporal workers
│   └── flae_worker.py    # Background worker lắng nghe task queue chạy workflow/activity
├── tests/                # Pytest Test Cases
├── pyproject.toml        # Cấu hình dependency qua uv
└── main.py               # FastAPI Entry Point
```

## 4. Quy tắc kiến trúc (BẮT BUỘC)
- **API GET & Caching:** Tự do tạo API GET, nhưng BẮT BUỘC phải suy nghĩ và phân tích xem có nên áp dụng Redis Cache (ví dụ: Cache-Aside) hay không để tối ưu chi phí và tải cho Database.
- **Realtime (WebSockets):** Các sự kiện cần realtime (như trạng thái sync, cập nhật tin nhắn) phải được publish qua Redis Pub/Sub và đẩy tới Angular client bằng WebSockets.
- **API prefix**: `/api/v1` (cấu hình tại `settings.API_V1_STR`).
- **Database operations:** Tất cả thao tác với SQLAlchemy phải dùng `async` session (`asyncpg`).
- **Row-Level Security (RLS) & Partitioning:**
  - Đối với các bảng trong `flae_knowledge_db` (chunks, entities, relationships), bắt buộc thiết lập RLS dựa trên `workspace_id` và session context (`SET LOCAL app.current_workspace_id = :workspace_id`).
  - Áp dụng phân vùng bảng (Partition Table) cho dữ liệu RAG theo từng `workspace_id` (`CREATE TABLE chunks_safe PARTITION OF chunks FOR VALUES IN ('workspace_id')`).
- **Package manager**: luôn dùng `uv add`, `uv run`, `uv sync` — không dùng `pip`.
- **Logging**: luôn dùng `get_logger(__name__)` — tuyệt đối không dùng `print()`.

## 5. Dev Commands
```bash
uv run python main.py     # Chạy FastAPI server (port 8000, hot-reload)
uv run flae-worker        # Chạy background Temporal worker
uv add <pkg>              # Thêm dependency
uv run migrate            # Chạy migrations
uv run pytest tests/      # Chạy tests
```

## 6. Chi tiết hệ thống
Mời xem các tài liệu chi tiết sau đây để hiểu sâu hơn về kiến trúc và triển khai Backend:
- 📖 [Schema & Response Pattern](backend/schema-response.md)
- 📖 [Data Models (Database)](backend/data-models.md)
- 📖 [Auth & Security](backend/auth-security.md)
- 📖 [Error Handling](backend/error-handling.md)
- 📖 [API Endpoints](backend/api-endpoints.md)
