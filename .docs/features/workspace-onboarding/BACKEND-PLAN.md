# Backend Plan: Workspace Onboarding

## 1. Thiết kế Dữ liệu (Database Schema)

Tạo các bảng sau qua Alembic Migration, tuân thủ `asyncpg` và `SQLAlchemy`:

- **Bảng `workspaces`**:
  - `id`: UUID (Primary Key)
  - `name`: String (Tên cửa hàng)
  - `industry`: String (Ngành hàng, Nullable)
  - `owner_uid`: String (Firebase UID từ token)
  - `created_at`: DateTime (Mặc định: utcnow)
  - `updated_at`: DateTime (Cập nhật tự động)

- **Bảng `workspace_integrations`**: (Bảng quản lý liên kết nền tảng thứ 3)
  - `id`: UUID (Primary Key)
  - `workspace_id`: UUID (Foreign Key trỏ đến `workspaces.id`, Cascade Delete)
  - `provider`: String (Enum: `haravan`, `kiotviet`)
  - `external_store_id`: String (ID định danh trên hệ thống thứ 3)
  - `access_token`: String (Cần mã hóa - Encrypted)
  - `refresh_token`: String (Cần mã hóa - Encrypted, Nullable)
  - `created_at`: DateTime
  - `updated_at`: DateTime
  - **Ràng buộc (Constraints)**:
    - Bắt buộc phải có **Unique Constraint** trên bộ đôi `(provider, external_store_id)`. Bất kỳ hành động tạo liên kết nào vi phạm sẽ ném lỗi ngay từ DB, giải quyết hoàn toàn vấn đề race-condition.

*(Tuân thủ kiến trúc Logical Multi-tenancy: Dữ liệu luôn cần check theo `owner_uid` cho các truy vấn riêng tư của user)*

## 2. Giao kèo API (API Contract)

### 2.1. API: Tạo Workspace Thủ công
- **Method**: `POST /api/v1/workspaces/manual`
- **Auth Guard**: Yêu cầu xác thực JWT (Sử dụng FastAPI Dependency `Depends(verify_token)` hoặc `Depends(get_current_user_uid)`).
- **Request Payload** (Pydantic Schema):
  ```json
  {
    "name": "Tên Cửa Hàng",
    "industry": "Ngành hàng"
  }
  ```
- **Response** (HTTP 200 OK - bọc trong `DataResponse` schema):
  ```json
  {
    "data": {
      "id": "uuid-cua-workspace",
      "name": "Tên Cửa Hàng",
      "is_syncing": false
    }
  }
  ```

### 2.2. API: Xử lý Callback OAuth & Tạo Workspace
- **Method**: `POST /api/v1/workspaces/oauth`
- **Auth Guard**: Yêu cầu xác thực JWT.
- **Request Payload** (Pydantic Schema):
  ```json
  {
    "provider": "haravan",
    "code": "oauth_auth_code"
  }
  ```
- **Response** (HTTP 200 OK - Optimistic Return):
  ```json
  {
    "data": {
      "id": "uuid-cua-workspace",
      "name": "Tên Lấy Từ Haravan",
      "is_syncing": true
    }
  }
  ```
- **Xử lý Logic**:
  1. Đổi `code` lấy `access_token` từ bên thứ 3.
  2. Lấy profile cơ bản (Tên, ID cửa hàng) từ nền tảng thứ 3.
  3. Cố gắng thêm vào `workspace_integrations`. Nếu báo lỗi Unique Violation (400 Bad Request) -> Cửa hàng này đã được liên kết với một workspace khác.
  4. Nếu hợp lệ, khởi tạo dữ liệu ở bảng `workspaces`.
  5. Đẩy một công việc chạy nền (Background Job) có tên `SyncInitialData` vào hàng đợi (Redis Queue).
  6. Lập tức trả về Response HTTP 200 mà không đợi Job chạy xong.

## 3. Xử lý Bất đồng bộ & Caching (Architecture & Background Jobs)

- **Worker & Redis Queue**: Sử dụng Task Queue (vd: Celery, RQ hoặc Arq) trên nền Redis để tách biệt luồng chạy nền kéo dữ liệu (Sản phẩm, Khách hàng, Đơn hàng) từ Haravan/KiotViet. Tuyệt đối không làm block luồng I/O của FastAPI app.
- **WebSockets / Pub-Sub (Redis)**:
  - FastAPI cung cấp endpoint Websockets cho phía Frontend. Endpoint này sẽ lắng nghe trên Redis Pub/Sub channels.
  - Khi Background Worker ở trên thực hiện hoàn tất chuỗi đồng bộ dữ liệu `SyncInitialData`, nó sẽ Publish một sự kiện có tên (ví dụ) `WORKSPACE_SYNC_COMPLETED:{workspace_id}` qua kênh Redis.
  - FastAPI Node nhận được sự kiện này sẽ đẩy event payload xuống Frontend qua kết nối WebSockets tương ứng của User.
