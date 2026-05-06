# Project Context - Backend

## 1. Project Identity
- **Name**: FLAE Agent Backend
- **Type**: API Server & Background Workers
- **Purpose**: Đóng vai trò xử lý logic nghiệp vụ, tích hợp dữ liệu, xác thực (Auth) và quản lý tương tác ghi với Firestore cho nền tảng FLAE Agent. Backend chỉ đảm nhận các API thay đổi dữ liệu/trạng thái (POST, PUT, PATCH, DELETE) hoặc các logic nghiệp vụ phức tạp.
- **Domain**: Conversational AI for SMBs (AI Workforce)

## 2. Technology Stack
- **Language**: Python >= 3.11
- **Framework**: FastAPI (>=0.136.1)
- **Database**: Firestore (Google Cloud) thông qua thư viện `firedantic` (>=0.12.0)
- **Authentication**: Firebase Admin SDK (>=7.4.0)
- **Package Manager**: `uv`
- **Other Core Libs**: `pydantic-settings`, `python-dotenv`, `uvicorn`

## 3. Project Structure
```text
backend/
├── app/
|   |-- agents/       # Chứa các agents viết bằng langgraph, langchain.
│   ├── api/          # API Routers và Endpoints
│   │   └── v1/       # Thư mục quản lý API version 1
│   │       ├── api_router.py
│   │       └── endpoints/
│   ├── core/         # Cấu hình cốt lõi (config.py, security.py, logger.py)
│   ├── db/           # Thiết lập kết nối database (database.py)
│   ├── helpers/      # Exception handlers, các tiện ích xử lý lỗi chung
│   ├── models/       # Firedantic database models (ví dụ: user.py, base.py)
│   ├── schemas/      # Pydantic schemas dành cho Request/Response API
│   └── services/     # Business logic services
├── migrations/       # Các file định nghĩa script migrations database
├── scripts/          # Các script tiện ích khởi chạy (migrate.py)
├── Dockerfile        # Cấu hình containerization cho backend
├── pyproject.toml    # Cấu hình dependencies, version và scripts quản lý bằng uv
└── main.py           # Application entry point khởi chạy FastAPI
```

## 4. Configuration
- Sử dụng `pyproject.toml` để quản lý định nghĩa dự án và dependency qua `uv`.
- File môi trường mẫu `.env.example`:
  - `PROJECT_NAME`: Tên hệ thống ("FLAE Agents")
  - `GOOGLE_APPLICATION_CREDENTIALS`: Cấu hình chứng chỉ Firebase/GCP
  - `FIRESTORE_EMULATOR_HOST`: Host cho Firestore emulator (local dev)
  - `FIREBASE_AUTH_EMULATOR_HOST`: Host cho Firebase Auth emulator (local dev)
  - `ENVIRONMENT`: Định danh môi trường (local, production) để ứng xử log phù hợp.

## 5. Architecture Patterns
- **API Architecture**: FastAPI. **NGUYÊN TẮC QUAN TRỌNG: KHÔNG tạo các API GET**. Frontend sẽ tự query trực tiếp từ Firestore qua Firebase SDK để tận dụng realtime.
- **API Versioning**: Tất cả các API endpoints được đặt dưới prefix `/api/v1` để quản lý version.
- **Data Access**: Sử dụng `firedantic` (Pydantic models) ánh xạ trực tiếp sang Firestore Collection/Document.
- **Dependency Injection**: Tận dụng `Depends` của FastAPI để quản lý phiên Auth, chia sẻ Session, Services.
- **Error Handling**: Hệ thống bắt lỗi tập trung (Global Exception Handler) quy chuẩn response đầu ra cho lỗi `CustomException`, `RequestValidationError` và `Exception` chưa lường trước.
- **Logging**: Khai báo qua module `logging` chuẩn (`app.core.logger.get_logger`), xuất text ở dev và JSON structured log ở production.
- **Database Migration**: Cơ chế Lazy Migration và Custom Migration Runner với script tự build (`uv run migrate`).

## 6. Development Workflow
- **Package Management**: Bắt buộc dùng lệnh `uv` (VD: `uv run`, `uv add`) thay vì `pip` hay `poetry`.
- **Run Local Server**: Khởi chạy qua lệnh `uvicorn main:app --host 0.0.0.0 --port 8000 --reload` (trong container hoặc ở host).
- **Run Migrations**: Thực thi tập lệnh migrate bằng `uv run migrate`.

## 7. Schema & Response Pattern (Quan trọng)

### 7.1. Phân cấp Schema
Tất cả các schema trong `app/schemas/` **phải** kế thừa từ `ResponseSchemaBase` (định nghĩa tại `app/schemas/sche_base.py`), KHÔNG kế thừa trực tiếp từ `pydantic.BaseModel`.

```python
# ❌ SAI - không được làm thế này
class UserItemResponse(BaseModel):
    ...

# ✅ ĐÚNG - kế thừa từ ResponseSchemaBase
from app.schemas.sche_base import ResponseSchemaBase
class UserItemResponse(ResponseSchemaBase):
    ...
```

### 7.2. DataResponse Wrapper
**MỌI** API endpoint trả về dữ liệu phải dùng `DataResponse[T]` để bọc kết quả. Không bao giờ trả về schema object trực tiếp.

```python
from app.schemas.sche_base import DataResponse
from app.schemas.sche_user import UserItemResponse

# ❌ SAI
return UserItemResponse(...)

# ✅ ĐÚNG - thành công chuẩn
return DataResponse[UserItemResponse].success_response(data=UserItemResponse(...))

# ✅ ĐÚNG - custom code/message
return DataResponse[UserItemResponse].custom_response(
    code="201",
    message="Created successfully",
    data=UserItemResponse(...)
)
```

### 7.3. Cấu trúc Response Chuẩn
Mọi API response sẽ có dạng:

```json
{
  "code": "200",
  "message": "Success",
  "data": { ... }
}
```

### 7.4. Naming Convention cho Schema
- **Request schemas**: `XxxRequest` (VD: `UserSyncRequest`, `UserCreateRequest`)
- **Response schemas (item)**: `XxxItemResponse` (VD: `UserItemResponse`)
- **Response schemas (list)**: `XxxListResponse` nếu cần

### 7.5. Logging trong Endpoints
Mỗi endpoint phải dùng `get_logger(__name__)` thay vì `print()` hay `logging.getLogger(...)` trực tiếp:

```python
from app.core.logger import get_logger
logger = get_logger(__name__)

logger.info("User synced: firebase_uid=xxx")
logger.debug("Payload: ...")
logger.warning("Retry attempt...")
logger.error("Failed to process")
```

## 8. Data Model Overview
- **BaseModel** (`app/models/base.py`): Kế thừa từ `firedantic.Model`. Có các trường chung: `id`, `created_at`, `updated_at`.
- **User** (`users` collection):
  - **Document ID**: Sử dụng trực tiếp `firebase_uid` để làm ID của document.
  - **Fields**: `firebase_uid`, `email`, `full_name`, `login_providers`, `is_active`, `avatar_url`.
  - **Enums**: `LoginProvider` (`EMAIL_PASSWORD`, `GOOGLE`, `FACEBOOK`).

## 9. API Endpoints hiện tại

| Method | Path | Schema Request | Schema Response | Mô tả |
|--------|------|---------------|-----------------|-------|
| POST | `/api/v1/auth/sync-user` | `UserSyncRequest` | `DataResponse[UserItemResponse]` | Sync user Firebase vào Firestore |
| POST | `/api/v1/users` | `UserCreateRequest` | `DataResponse[UserItemResponse]` | Tạo user profile mới |
| PUT | `/api/v1/users/{user_id}` | _(TBD)_ | `DataResponse[dict]` | Cập nhật user |
| DELETE | `/api/v1/users/{user_id}` | — | `DataResponse[dict]` | Xoá user |

## 10. Frontend Integration

### Typing response trên Frontend (Angular/TypeScript)
Frontend phải khai báo generic type `ApiResponse<T>` tương ứng với `DataResponse[T]` của backend:

```typescript
// core/models/auth.model.ts
export interface ApiResponse<T> {
  code: string;
  message: string;
  data: T | null;
}
```

### Unwrap response trong service
```typescript
// Luôn dùng map() để unwrap data trước khi trả về consumer
this.http
  .post<ApiResponse<User>>(`${this.apiUrl}/sync-user`, payload, { headers })
  .pipe(map((res) => res.data as User));
```
