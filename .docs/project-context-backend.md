# Project Context - Backend

> **Last Updated**: 2026-05-07

## 1. Overview
Hệ thống backend xử lý API mutations và business logic phức tạp cho ứng dụng FLAE, làm việc cùng frontend thông qua Firebase và Firestore.

## 2. Stack
- Python ≥ 3.11
- FastAPI · Uvicorn
- PostgreSQL · SQLAlchemy · asyncpg · Alembic
- Redis (Caching & Pub/Sub) · WebSockets
- Firebase Admin SDK (Auth, Storage)
- pydantic v2
- `uv` (package manager)

## 3. Project Structure
```text
backend/
├── app/
│   ├── agents/           # LangGraph/LangChain agents (reserved)
│   ├── api/v1/           # API Routers & Endpoints (REST & WebSockets)
│   ├── core/             # Config, Security, Logger
│   ├── db/               # Database Setup (SQLAlchemy engines, Redis client)
│   ├── helpers/          # Exception Handlers
│   ├── models/           # SQLAlchemy Models
│   ├── schemas/          # Pydantic Schemas (Request/Response)
│   └── services/         # Business Logic & Caching Logic
├── migrations/           # Alembic Migration Scripts
├── scripts/              # Helper Scripts
├── tests/                # Pytest Test Cases
└── main.py               # FastAPI Entry Point
```

## 4. Quy tắc kiến trúc (BẮT BUỘC)
- **API GET & Caching:** Tự do tạo API GET, nhưng BẮT BUỘC phải suy nghĩ và phân tích xem có nên áp dụng Redis Cache (ví dụ: Cache-Aside) hay không để tối ưu chi phí và tải cho Database.
- **Realtime (WebSockets):** Các sự kiện cần realtime (như nhận tin nhắn mới) phải được publish qua Redis Pub/Sub và đẩy tới Angular client bằng WebSockets.
- **API prefix**: `/api/v1` (cấu hình tại `settings.API_V1_STR`).
- **Database operations:** Tất cả thao tác với SQLAlchemy phải dùng `async` session (`asyncpg`).
- **Package manager**: luôn dùng `uv add`, `uv run`, `uv sync` — không dùng `pip`.
- **Logging**: luôn dùng `get_logger(__name__)` — tuyệt đối không dùng `print()`.

## 5. Dev Commands
```bash
uv run python main.py   # Chạy server (port 8000, hot-reload)
uv add <pkg>            # Thêm dependency
uv run migrate          # Chạy migrations
uv run pytest tests/    # Chạy tests
```

## 6. Chi tiết hệ thống
Mời xem các tài liệu chi tiết sau đây để hiểu sâu hơn về kiến trúc và triển khai Backend:
- 📖 [Schema & Response Pattern](backend/schema-response.md)
- 📖 [Data Models (Database)](backend/data-models.md)
- 📖 [Auth & Security](backend/auth-security.md)
- 📖 [Error Handling](backend/error-handling.md)
- 📖 [API Endpoints](backend/api-endpoints.md)
