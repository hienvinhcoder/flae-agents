# 🎯 ĐẶC TẢ YÊU CẦU: RAG DATABASE INTEGRATION (LANGCHAIN + PGVECTOR)

## 1. Mục tiêu kiến trúc (Architectural Goals)
Tích hợp thêm một database PostgreSQL có hỗ trợ `pgvector` vào hệ thống Backend (FastAPI) để phục vụ tính năng RAG. 
Giữ lại luồng phát triển nhanh gọn trong giai đoạn đầu bằng cách chạy chung Container, nhưng đảm bảo tổ chức logic (Logical DB, Schema, Backend Architecture) tuân thủ chuẩn để dễ dàng tách thành Cluster độc lập trong tương lai.

## 2. Các quyết định kỹ thuật đã chốt (Technical Decisions)

| Hạng mục | Quyết định đã chốt | Phân tích & Lý do |
| :--- | :--- | :--- |
| **1. Docker & Database Infra** | Dùng chung 1 Container, custom image | Build custom image từ `postgres:15-alpine` có cài `pgvector`. Bên trong container khởi tạo 2 logical databases: `flae_db` (chính) và `rag_db` (RAG). Giúp dev nhanh trên local nhưng tách bạch dữ liệu hoàn toàn. |
| **2. Backend Framework** | `langchain-postgres` (PGVectorStore) | Tích hợp sâu với hệ sinh thái LangChain hiện tại của dự án. Giao tiếp qua giao thức `postgresql+asyncpg://` chuẩn bất đồng bộ. |
| **3. Data Isolation** | Table-per-tenant (Mỗi khách 1 bảng) | Phân tách dữ liệu triệt để (Hard isolation) ở cấp độ bảng. Mỗi tenant sẽ có một bảng riêng biệt (vd: `vector_tenant_1`), đảm bảo truy vấn tốc độ cao nhất và bảo mật tuyệt đối. |
| **4. Database Connection** | Tối ưu với Async Connection Pool | FastAPI khởi tạo `AsyncEngine` riêng tới `rag_db`. Dùng LangChain Async API (`aadd_texts`, `asimilarity_search`) để không làm nghẽn Event Loop. |
| **5. Quản lý Schema / Bảng** | Auto-Creation trên Runtime | Bỏ qua Alembic cho bảng vector. Tầng Backend sẽ tự động gọi hàm tạo bảng (vd: `init_vectorstore_table`) khi có tenant mới truy cập, loại bỏ sự phức tạp khi migration trên hàng trăm bảng. |

## 3. Thiết kế luồng thực thi (Implementation Flow)

### 3.1. Infrastructure (Docker)
1. Cập nhật `docker-compose.yml`:
   - Thay thế image postgres hiện tại bằng block build từ thư mục `postgres-rag/Dockerfile`.
   - Thêm environment biến `POSTGRES_MULTIPLE_DATABASES=flae_db,rag_db`.
2. Tạo bash script (`init-multiple-db.sh`) mount vào `/docker-entrypoint-initdb.d` để PostgreSQL tự động tạo 2 DB và chạy lệnh `CREATE EXTENSION vector;` bên trong `rag_db` ngay khi lần đầu khởi chạy.

### 3.2. Backend Configuration (`app/core/config.py`)
- Thêm biến môi trường `RAG_POSTGRES_URL` dạng `postgresql+asyncpg://postgres:postgres@localhost:5432/rag_db`.

### 3.3. Tầng Database Connection (`app/db/rag_database.py`)
- Khởi tạo riêng một `rag_engine` sử dụng `create_async_engine` của SQLAlchemy trỏ vào RAG DB.
- Định nghĩa hàm Dependency Factory: `get_tenant_vector_store(tenant_id: str)`. Hàm này sẽ chịu trách nhiệm:
  1. Kiểm tra/khởi tạo bảng có tên `vector_{tenant_id}`.
  2. Khởi tạo đối tượng `PGVectorStore` (từ `langchain-postgres`) gắn vào bảng đó và trả về cho Service.

### 3.4. RAG Service Layer (`app/services/rag_service.py`)
- Nơi gọi các function async (`aadd_documents`, `asimilarity_search`) thông qua Vector Store nhận được từ Dependency.
- Pipeline xử lý hoàn toàn theo chuẩn Non-blocking (async/await).

## 4. Tác động tới hệ thống (System Impact)
- Phải xóa volume DB cũ (nếu có) khi chạy `docker-compose down -v` để script entrypoint có thể thiết lập lại từ đầu (đối với môi trường dev local).
- Khuyến nghị sử dụng Connection Pooling (như pgbouncer) ở tương lai nếu số lượng kết nối từ FastAPI lớn hơn sức chịu tải mặc định của Postgres.
