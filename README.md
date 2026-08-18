# FLAE

FLAE là nền tảng **AI Company Memory** giúp doanh nghiệp kết nối, tổ chức và khai thác tri thức đang phân tán trong tài liệu, mã nguồn và các công cụ làm việc.

Hệ thống biến dữ liệu từ Google Drive, Notion, Slack, GitHub và các nguồn nội bộ thành một **bộ nhớ công ty sống** — liên tục được cập nhật, có khả năng hiểu mối quan hệ giữa dự án, con người, quyết định, tài liệu, mã nguồn và rủi ro.

Với FLAE, người dùng có thể:

- Hỏi đáp về dữ liệu công ty với câu trả lời có trích dẫn nguồn.
- Tìm lại các quyết định, tài liệu và ngữ cảnh liên quan đến dự án.
- Hiểu mối quan hệ giữa con người, dự án, tài liệu và mã nguồn.
- Phát hiện tài liệu có khả năng lỗi thời khi code thay đổi.
- Cung cấp business context chính xác cho AI coding agents.
- Tạo và vận hành các agent tự động như weekly digest, stale-document detector và project risk monitor.

FLAE được xây dựng theo kiến trúc **Multi-tenant SaaS**, hướng đến khả năng mở rộng, cô lập dữ liệu giữa các workspace và đáp ứng các yêu cầu bảo mật của doanh nghiệp.

> **FLAE là bộ nhớ AI sống cho công ty, giúp team hỏi đáp, hiểu quyết định, theo dõi dự án và phát hiện tài liệu lỗi thời khi code thay đổi.**

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

- **Backend, Firebase Emulator, Databases, Redis, Temporal**: Chạy trong môi trường ảo hóa Docker Compose.
- **Frontend (React/Vite)**: Chạy trực tiếp ở máy host qua Vite để hỗ trợ hot reload.

Chúng tôi đã chuẩn bị sẵn 2 script để bạn dễ dàng quản lý việc khởi động và tắt hệ thống.

### 1. Khởi động hệ thống

Từ thư mục gốc của dự án, chạy lệnh:

```bash
./start.sh
```

**Script này sẽ tự động:**

- Khởi chạy Firebase Authentication/Storage Emulator, Postgres, Redis, Backend API, Worker, Temporal và Temporal UI dưới dạng container chạy ngầm (`docker compose up -d`).
- Tạo `frontend/.env` từ `frontend/.env.example` nếu file cấu hình local chưa tồn tại. Cấu hình mẫu bật emulator và dùng project local `flae-agents`.
- Theo dõi và hiển thị log của Firebase Emulator, Backend API và Worker ngay trong terminal đang chạy script.
- Kiểm tra thư mục `frontend/`, tự động chạy `npm ci` khi `node_modules/` chưa tồn tại hoặc `npm ls --depth=0` phát hiện cây dependency trực tiếp đã cài không hợp lệ, cũ hoặc chưa đầy đủ.
- Khởi chạy frontend React ở chế độ foreground (`npm run dev` tức Vite dev server). Log Vite và các dịch vụ ứng dụng sẽ cùng hiển thị trong terminal này.

👉 **Địa chỉ truy cập**:

- **Frontend Web App**: [http://localhost:4200](http://localhost:4200)
- **Firebase Emulator UI**: [http://localhost:4000](http://localhost:4000)
- **Firebase Authentication Emulator**: [http://localhost:9099](http://localhost:9099)
- **Firebase Storage Emulator**: [http://localhost:9199](http://localhost:9199)
- **Backend API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Temporal Web Console**: [http://localhost:8233](http://localhost:8233) (để giám sát và quản lý các workflows)

---

### 2. Dừng hệ thống

Khi bạn muốn dừng hoàn toàn dự án, nhấn `Ctrl+C` tại terminal để thoát Vite và dừng tiến trình theo dõi log, sau đó chạy:

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
- Local development đặt `VITE_USE_FIREBASE_EMULATORS=true`. Production phải đặt cờ này thành `false` và cung cấp Firebase Web SDK config thực tế; không bật các biến emulator cho Backend/Worker.
- Hệ thống sử dụng 3 Database vật lý chuyên biệt:
  1. `flae_db`: Quản lý metadata chính của app.
  2. `flae_agent_state_db`: Lưu trữ trạng thái hoạt động của Agent qua LangChain Persistent.
  3. `flae_knowledge_db`: Lưu trữ tri thức của Agents (áp dụng Tenant Partitioning cho vector database).
