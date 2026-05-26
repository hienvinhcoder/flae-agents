# 🏛️ Kiến Trúc Hệ Thống (Master Blueprint)

## 1. 🎯 Tổng quan & Mục tiêu dự án
- **Dự án:** FLAE Agents (Nền tảng quản lý và vận hành AI Agents).
- **Mục tiêu:** Cung cấp một nền tảng hiệu năng cao, real-time để quản lý Agents, tích hợp chặt chẽ giữa Frontend (Angular) và Backend (FastAPI). Kiến trúc được thiết kế tối ưu cho Vibe Coding với AI Agents.

## 2. 🧩 Tech Stack Cốt lõi
- **Frontend:** Angular 20+ (Standalone Components, Signals), Tailwind CSS 4, Karma/Jasmine.
  - *Design System:* "Green Growth" — Primary `#00C27A`, Accent `#B9FF3B`, Dark Green `#062E24`.
  - *Fonts:* Inter (body) + Plus Jakarta Sans (heading).
- **Backend:** FastAPI (async), SQLAlchemy, Alembic, pgvector, `temporalio` (Temporal Python SDK).
  - *Cache & Realtime:* Redis (Cache, Pub/Sub).
  - *Background Tasks & Orchestration:* Temporal Server & Worker.
  - *Package Manager:* `uv`.
- **Database/Auth:** 
  - Hệ thống sử dụng 3 Database logic riêng biệt trên cùng một PostgreSQL cluster:
    1. `flae_db`: Database chính cho ứng dụng (User profiles, Workspaces, metadata...).
    2. `flae_agent_state_db`: Cơ sở dữ liệu lưu trạng thái phiên làm việc (agent session state), checkpoint, lịch sử hội thoại... thông qua LangChain Persistent.
    3. `flae_knowledge_db`: Cơ sở dữ liệu tri thức của Agent (knowledge base, vector chunks, embeddings) hỗ trợ pgvector, RLS (Row Level Security) cô lập theo tenant/workspace, và partition table (phân vùng bảng) theo tenant/workspace.
  - **Auth:** Firebase Authentication cấp JWT token.
  - **Storage:** Firebase Storage.
  - **Local Development:** Chạy qua Docker. Production chạy trên Cloud Run & Cloud SQL.

## 3. 🏗️ Mô hình Luồng Dữ liệu (System Architecture)

```text
                                  ┌───────────────┐
                                  │Temporal Server│
                                  └───────┬───────┘
                                          │ (task queue)
                                          ▼
Browser (Angular) <─── WebSocket ───> FastAPI Backend ───> Cloud SQL (flae_db / rag_db)
       │                                  │                     ▲
       │                                  │ (trigger workflow)  │ (DB operations)
       │                                  ▼                     │
       │ REST API (GET/POST/PUT/DELETE) ──┴──> Temporal Client ─┤
       ▼                                                        ▼
   Firebase Auth (JWT verify) <─────────────────────────── Temporal Worker (flae-worker)
```

- **Frontend:** Gọi REST API tới Backend. Kết nối WebSockets để nhận dữ liệu realtime (Event-driven).
- **Backend:** Xử lý API, kết nối DB (PostgreSQL), quản lý Cache (Redis). Khi phát sinh tác vụ nền lâu dài (như xử lý tri thức, chạy Agent), gửi tín hiệu chạy Workflow sang Temporal Server.
- **Temporal Server & Worker:** Temporal Server quản lý trạng thái và hàng đợi. `flae-worker` (chạy background) lắng nghe task queue, thực hiện các workflows và activities bất đồng bộ để đảm bảo tính chịu lỗi cao và bền vững (durable execution).
- **Auth Flow:** Firebase Authentication cấp JWT token → Backend xác thực qua `Depends(verify_token)`.

## 4. ⚖️ Những Nguyên Tắc Bất Di Bất Dịch (Golden Rules)
Agent khi viết code **BẮT BUỘC** phải tuân thủ các quy tắc sau:
1. **Backend Dependency:** Bắt buộc sử dụng `uv` thay cho `pip` để quản lý packages.
2. **Backend Architecture:** Thiết kế theo chuẩn 3-layer: `Endpoint -> Service -> Model`. Sử dụng Global Exception Handlers. Mọi API response đều phải bọc qua wrapper `DataResponse[T]` chuẩn (`code`, `message`, `data`).
3. **Frontend Architecture:** Phân tách rõ rệt mô hình `Smart/Container` (chứa logic/state) và `Dumb/Presentational` (chỉ nhận UI props). Quản lý state hoàn toàn bằng Angular Signals.
4. **Database Operations & Multi-tenancy:** 
  - Cẩn thận tối ưu queries bằng SQLAlchemy, thiết lập Index đầy đủ. Ưu tiên async sessions.
  - Áp dụng Row-Level Security (RLS) để cô lập dữ liệu giữa các tenant/workspace ngay tại mức database.
  - Đối với `flae_knowledge_db`, áp dụng thêm phân vùng bảng (Partition Table) theo từng workspace_id để tối ưu hóa hiệu năng truy vấn vector lớn. Không áp dụng tràn lan partition cho các database nhỏ khác.
5. **API & Caching Strategy:** Cần suy nghĩ và phân tích khi tạo API GET để quyết định xem có nên cache bằng Redis hay không (nhằm giảm tải DB). Realtime phải được quản lý qua WebSockets kết hợp Redis Pub/Sub.

## 5. 🗂️ Sơ đồ Tài liệu (Context Index)
Để phục vụ quá trình Vibe Coding, Agent khi thực thi tác vụ **PHẢI** chủ động dùng tool `view_file` truy cập các tài liệu sau để lấy bối cảnh chi tiết:

- **Hiến pháp dự án:** Đọc file `AGENTS.md`.
- **Quy chuẩn Backend:** Đọc file `docs/project-context-backend.md` (chứa chi tiết routing, logging, data models).
- **Quy chuẩn Frontend:** Đọc file `docs/project-context-frontend.md`.

---
*Dev Workflow Cheatsheet (Chạy Local):*
- Khởi chạy toàn bộ hạ tầng: `docker compose up`
- Khởi chạy Temporal Worker: `cd backend && uv run flae-worker`
- Frontend dev: `cd frontend && npm start`
- Backend dev: `cd backend && uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000`
- DB Migration: `cd backend && uv run migrate`