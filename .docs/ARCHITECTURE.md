# 🏛️ Kiến Trúc Hệ Thống (Master Blueprint)

## 1. 🎯 Tổng quan & Mục tiêu dự án
- **Dự án:** FLAE Agents (Nền tảng quản lý và vận hành AI Agents).
- **Mục tiêu:** Cung cấp một nền tảng hiệu năng cao, real-time để quản lý Agents, tích hợp chặt chẽ giữa Frontend (Angular) và Backend (FastAPI). Kiến trúc được thiết kế tối ưu cho Vibe Coding với AI Agents.

## 2. 🧩 Tech Stack Cốt lõi
- **Frontend:** Angular 20+ (Standalone Components, Signals), Tailwind CSS 4, Karma/Jasmine.
  - *Design System:* "Green Growth" — Primary `#00C27A`, Accent `#B9FF3B`, Dark Green `#062E24`.
  - *Fonts:* Inter (body) + Plus Jakarta Sans (heading).
- **Backend:** FastAPI (async), SQLAlchemy, Alembic, pgvector.
  - *Cache & Realtime:* Redis (Cache, Pub/Sub).
  - *Package Manager:* `uv`.
- **Database/Auth:** Cloud SQL (PostgreSQL) cho Database. Firebase cho Auth & Storage. Local dùng Docker. Production dùng Cloud Run & Cloud SQL.
- **Infra:** Docker Compose (services: frontend, backend, postgres, redis).

## 3. 🏗️ Mô hình Luồng Dữ liệu (System Architecture)

```text
Browser (Angular) <─── WebSocket ───> FastAPI Backend ───> Cloud SQL (SQLAlchemy/asyncpg)
       │                                  │        
       │ GET/POST/PUT/DELETE              └──> Redis (Cache & Pub/Sub)
       ▼                                  │
   Firebase Auth (JWT verify) <───────────┘
```

- **Frontend:** Gọi REST API (GET/POST/PUT/DELETE) tới Backend. Kết nối WebSockets để nhận data realtime khi có thay đổi (Event-driven).
- **Backend:** Xử lý API, kết nối DB (PostgreSQL), quản lý Cache (Redis). Khi có thay đổi data quan trọng, publish event qua Redis Pub/Sub để đẩy WebSockets tới client.
- **Auth Flow:** Firebase Authentication cấp JWT token → Backend xác thực qua `Depends(verify_token)`.

## 4. ⚖️ Những Nguyên Tắc Bất Di Bất Dịch (Golden Rules)
Agent khi viết code **BẮT BUỘC** phải tuân thủ các quy tắc sau:
1. **Backend Dependency:** Bắt buộc sử dụng `uv` thay cho `pip` để quản lý packages.
2. **Backend Architecture:** Thiết kế theo chuẩn 3-layer: `Endpoint -> Service -> Model`. Sử dụng Global Exception Handlers. Mọi API response đều phải bọc qua wrapper `DataResponse[T]` chuẩn (`code`, `message`, `data`).
3. **Frontend Architecture:** Phân tách rõ rệt mô hình `Smart/Container` (chứa logic/state) và `Dumb/Presentational` (chỉ nhận UI props). Quản lý state hoàn toàn bằng Angular Signals.
4. **Database Operations:** Cẩn thận tối ưu queries bằng SQLAlchemy, thiết lập Index đầy đủ. Ưu tiên async sessions.
5. **API & Caching Strategy:** Cần suy nghĩ và phân tích khi tạo API GET để quyết định xem có nên cache bằng Redis hay không (nhằm giảm tải DB). Realtime phải được quản lý qua WebSockets kết hợp Redis Pub/Sub.

## 5. 🗂️ Sơ đồ Tài liệu (Context Index)
Để phục vụ quá trình Vibe Coding, Agent khi thực thi tác vụ **PHẢI** chủ động dùng tool `view_file` truy cập các tài liệu sau để lấy bối cảnh chi tiết:

- **Hiến pháp dự án:** Đọc file `AGENTS.md`.
- **Quy chuẩn Backend:** Đọc file `docs/project-context-backend.md` (chứa chi tiết routing, logging, data models).
- **Quy chuẩn Frontend:** Đọc file `docs/project-context-frontend.md`.


---
*Dev Workflow Cheatsheet (Chạy Local):*
- Khởi chạy toàn bộ: `docker compose up`
- Frontend dev: `cd frontend && npm start`
- Backend dev: `cd backend && uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000`
- DB Migration: `cd backend && uv run migrate`