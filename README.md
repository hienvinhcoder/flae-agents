# FLAE Agents

FLAE Agents là một nền tảng quản lý và vận hành AI Agents đa khách thuê (Multi-tenant SaaS Platform), được thiết kế với kiến trúc chuẩn Enterprise, mang lại khả năng mở rộng tốt và tính bảo mật cao.

## 🚀 Công nghệ sử dụng (Tech Stack)

### Frontend (`frontend/`)
- **Framework**: React 19, Vite và TypeScript strict mode
- **Styling**: Tailwind CSS (Utility-first)
- **Routing**: React Router với lazy loading theo feature
- **State**: TanStack Query cho server state, Zustand cho shared client state và React state cho state cục bộ.
- **Communication (Realtime)**: Typed API client, Server-Sent Events và WebSockets với cleanup khi component unmount.

### Backend (`backend/`)
- **Web Framework**: FastAPI (Python)
- **Package Manager**: `uv` (quản lý thư viện siêu tốc và ổn định)
- **Database & ORM**: PostgreSQL, SQLAlchemy (Async), Alembic (Quản lý migrations), `asyncpg`
- **Caching & Realtime**: Redis (Pub/Sub cho WebSockets & caching)
- **Durable Execution (Workflow Orchestration)**: Temporal (quản lý trạng thái AI Agent và các long-running tasks/workflows)

---

## 🛠️ Yêu cầu hệ thống (Prerequisites)

Trước khi khởi chạy dự án, hãy đảm bảo máy tính của bạn đã cài đặt các công cụ sau:
1. **Docker & Docker Compose** (để chạy các dịch vụ database, cache, temporal, backend và worker)
2. **Node.js & npm**: Node `^20.19.0`, `^22.13.0` hoặc `>=24.0.0` theo `engines` trong `frontend/package.json` (để chạy frontend React/Vite cục bộ)
3. **Python (3.10+)** (nếu bạn muốn debug backend hoặc worker trực tiếp ngoài Docker)

---

## ⚙️ Hướng dẫn Khởi chạy Môi trường Phát triển (Development Run)

Để đảm bảo frontend có thể tự động tải lại (hot-reload) khi bạn chỉnh sửa mã nguồn, toàn bộ hệ thống được thiết kế chạy kết hợp:
* **Backend, Databases, Redis, Temporal**: Chạy trong môi trường ảo hóa Docker Compose.
* **Frontend (React/Vite)**: Chạy trực tiếp ở máy host qua Vite để hỗ trợ hot reload.

Chúng tôi đã chuẩn bị sẵn 2 script để bạn dễ dàng quản lý việc khởi động và tắt hệ thống.

### 1. Khởi động hệ thống
Từ thư mục gốc của dự án, chạy lệnh:
```bash
./start.sh
```

**Script này sẽ tự động:**
- Khởi chạy Postgres, Redis, Backend API, Worker, Temporal và Temporal UI dưới dạng container chạy ngầm (`docker compose up -d`).
- Kiểm tra thư mục `frontend/`, tự động chạy `npm ci` khi `node_modules/` chưa tồn tại hoặc `npm ls --depth=0` phát hiện cây dependency trực tiếp đã cài không hợp lệ, cũ hoặc chưa đầy đủ.
- Khởi chạy frontend React ở chế độ foreground (`npm run dev` tức Vite dev server). Bạn có thể theo dõi tiến trình build và hot reload trực tiếp trên terminal này.

👉 **Địa chỉ truy cập**:
* **Frontend Web App**: [http://localhost:4200](http://localhost:4200)
* **Backend API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **Temporal Web Console**: [http://localhost:8233](http://localhost:8233) (để giám sát và quản lý các workflows)

---

### 2. Dừng hệ thống
Khi bạn muốn dừng hoàn toàn dự án, nhấn `Ctrl+C` tại terminal đang chạy frontend để thoát Vite, sau đó chạy:
```bash
./stop.sh
```

**Script này sẽ tự động:**
- Gỡ bỏ và tắt toàn bộ các container Docker Compose đang chạy ngầm (`docker compose down`).
- Tìm và dừng mọi tiến trình đang lắng nghe ở cổng `4200` mà không xác minh tiến trình đó có thuộc dự án hay không. Chỉ chạy `./stop.sh` khi cổng `4200` được dành riêng cho dự án này.

---

## 📂 Cấu trúc dự án (Project Structure)

```text
├── backend/                # Mã nguồn FastAPI Backend & Worker
│   ├── app/                # Logic cốt lõi (API endpoints, Models, Services)
│   ├── migrations/         # Alembic database migrations
│   ├── pyproject.toml      # Quản lý dependencies với uv
│   └── Dockerfile          # Dockerfile cho backend api và worker
│
├── frontend/               # Mã nguồn React/Vite Frontend
│   ├── src/                # App shell, core infrastructure, features và shared UI
│   ├── tests/              # Thiết lập test và Playwright E2E
│   ├── package.json        # Định nghĩa dependencies & scripts frontend
│   ├── vite.config.ts      # Cấu hình Vite dev server/build
│   └── Dockerfile          # Container Vite cho môi trường phát triển
│
├── docker-compose.yml      # Cấu hình các dịch vụ hạ tầng chạy local
├── start.sh                # Script khởi động nhanh môi trường dev
└── stop.sh                 # Script tắt nhanh môi trường dev
```

---

## 🔒 Quy tắc cấu hình & Bảo mật

- Không được hardcode các thông tin nhạy cảm trong mã nguồn. Hãy sử dụng file `.env` đặt tại thư mục `backend/` dựa trên file tham khảo `backend/.env.example`.
- Authentication được đảm nhiệm bởi **Firebase Authentication**. Frontend sẽ gửi JWT thông qua HTTP Header `Authorization: Bearer <token>`.
- Hệ thống sử dụng 3 Database vật lý chuyên biệt:
  1. `flae_db`: Quản lý metadata chính của app.
  2. `flae_agent_state_db`: Lưu trữ trạng thái hoạt động của Agent qua LangChain Persistent.
  3. `flae_knowledge_db`: Lưu trữ tri thức của Agents (áp dụng Tenant Partitioning cho vector database).
