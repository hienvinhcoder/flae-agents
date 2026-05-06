# Project Context - Backend

> **Last Updated**: 2026-05-06

## 1. Stack
Python ≥ 3.11 · FastAPI · Uvicorn · Firestore · firedantic · Firebase Admin SDK · pydantic v2 · `uv` (package manager)

## 2. Project Structure

```text
backend/
├── app/
│   ├── agents/           # LangGraph/LangChain agents (reserved)
│   ├── api/v1/
│   │   ├── api_router.py
│   │   └── endpoints/
│   │       ├── auth.py   # POST /auth/sync-user
│   │       └── user.py   # POST/PUT/DELETE /users
│   ├── core/
│   │   ├── config.py     # Settings, load .env, API_V1_STR="/api/v1"
│   │   ├── logger.py     # get_logger()
│   │   └── security.py   # verify_token, get_current_user_uid, get_current_user (Depends)
│   ├── db/database.py    # setup_database() → firedantic.configure()
│   ├── helpers/exception_handler.py  # CustomException + global handlers
│   ├── models/
│   │   ├── base.py       # BaseModel(firedantic.Model): id, created_at, updated_at
│   │   └── user.py       # User + LoginProvider enum
│   ├── schemas/
│   │   ├── sche_base.py  # ResponseSchemaBase, DataResponse[T]
│   │   ├── auth.py       # UserSyncRequest
│   │   └── sche_user.py  # UserItemResponse, UserCreateRequest, UserUpdateRequest
│   └── services/
│       ├── auth_service.py  # AuthService.sync_firebase_user()
│       └── srv_user.py      # UserService.create_user()
├── migrations/           # Script files
├── scripts/migrate.py    # uv run migrate
├── tests/api/test_auth.py
└── main.py               # Entry point
```

## 3. Quy tắc kiến trúc (BẮT BUỘC)

- **KHÔNG tạo API GET.** Frontend query trực tiếp từ Firestore realtime. Backend chỉ nhận POST/PUT/PATCH/DELETE và business logic phức tạp.
- **API prefix**: `/api/v1` (cấu hình tại `settings.API_V1_STR`).
- **firedantic là synchronous**: `.save()`, `.get_by_doc_id()` KHÔNG dùng `await`.
- **Package manager**: luôn dùng `uv add`, `uv run`, `uv sync` — không dùng `pip`.
- **Logging**: luôn dùng `get_logger(__name__)` — tuyệt đối không dùng `print()`.

## 4. Schema & Response Pattern

### Kế thừa Schema
Mọi schema **phải** kế thừa từ `ResponseSchemaBase`, không phải `pydantic.BaseModel`:
```python
from app.schemas.sche_base import ResponseSchemaBase
class XxxItemResponse(ResponseSchemaBase): ...  # ✅
class XxxRequest(ResponseSchemaBase): ...       # ✅
```

### DataResponse Wrapper
Mọi endpoint trả về dữ liệu phải bọc bằng `DataResponse[T]`:
```python
from app.schemas.sche_base import DataResponse

return DataResponse[UserItemResponse].success_response(data=UserItemResponse(...))  # code=200
return DataResponse[UserItemResponse].custom_response(code="201", message="Created", data=...)
```

**Response shape**: `{"code": "200", "message": "Success", "data": {...}}`

### Naming Convention
- Request: `XxxRequest` — Response item: `XxxItemResponse` — Response list: `XxxListResponse`

## 5. Data Models

### BaseModel (`app/models/base.py`)
- Kế thừa `firedantic.Model`. Fields: `id: Optional[str]`, `created_at`, `updated_at`.
- `id=None` → Firestore auto-generate ID; `id=<value>` → dùng custom document ID.

### User (`users` collection)
Fields: `firebase_uid: str`, `email: EmailStr`, `full_name: str`, `is_active: bool = True`, `login_providers: list[LoginProvider] = []`, `avatar_url: Optional[str]`

`LoginProvider` enum values: `"email_password"` | `"google"` | `"facebook"`

**Document ID = `firebase_uid`** (tạo bằng `User(id=firebase_uid, firebase_uid=firebase_uid, ...)`).

Truy vấn: `User.get_by_doc_id(firebase_uid)` → ném `ModelNotFoundError` nếu không tồn tại.

### Workspace (`workspaces` collection)
Fields: `name: str`, `industry: Optional[str]`, `description: Optional[str]`, `website: Optional[str]`, `platform: PlatformEnum`, `platform_store_id: Optional[str]`, `owner_uid: str`

### IntegrationConfig (`integration_configs` collection)
Fields: `workspace_id: str`, `platform: PlatformEnum`, `access_token: str`, `refresh_token: Optional[str]`, `expires_at: Optional[str]`, `meta_data: Dict[str, Any]`
**Lưu ý:** Document ID của collection này luôn được đặt bằng `workspace_id` để đảm bảo mối quan hệ 1-1 (một workspace chỉ integrate với duy nhất một nền tảng).

### UserWorkspace (`user_workspaces` collection)
Fields: `user_uid: str`, `workspace_id: str`, `role: WorkspaceRole`

### BriefingItem (`briefing_items` collection)
Fields: `workspace_id: str`, `title: str`, `content: str`, `type: str`, `is_read: bool`

## 6. Security Dependencies (`app/core/security.py`)

| Depends | Returns | Dùng khi |
|---------|---------|----------|
| `verify_token` | `dict` (decoded JWT) | Cần xác thực cơ bản |
| `get_current_user_uid` | `str` (firebase_uid) | Chỉ cần UID |
| `get_current_user` | `User` (Firestore object) | Cần full User object (đã sync) |

Tất cả endpoints yêu cầu `Authorization: Bearer <Firebase ID Token>`.

## 7. Error Handling

Raise `CustomException` để trả về lỗi có cấu trúc:
```python
from app.helpers.exception_handler import CustomException
raise CustomException(http_code=404, code="404", message="User not found")
```

Global handlers đã đăng ký trong `main.py` cho: `CustomException`, `RequestValidationError`, `Exception`.

## 8. API Endpoints hiện tại

| Method | Path | Request Schema | Response | Mô tả |
|--------|------|---------------|----------|-------|
| `POST` | `/api/v1/auth/sync-user` | `UserSyncRequest` | `DataResponse[UserItemResponse]` | Upsert user Firebase → Firestore |
| `POST` | `/api/v1/users` | `UserCreateRequest` | `DataResponse[UserItemResponse]` | Tạo user profile (201) |
| `PUT` | `/api/v1/users/{user_id}` | _(chưa implement)_ | `DataResponse[dict]` | Cập nhật user |
| `DELETE` | `/api/v1/users/{user_id}` | — | `DataResponse[dict]` | Xoá user |
| `POST` | `/api/v1/workspaces/manual` | `WorkspaceManualCreateRequest` | `DataResponse[WorkspaceItemResponse]` | Tạo workspace thủ công và seed dữ liệu |
| `POST` | `/api/v1/workspaces/oauth/url` | `OAuthUrlRequest` | `DataResponse[OAuthUrlResponse]` | Lấy URL OAuth cho platform tích hợp |
| `POST` | `/api/v1/workspaces/oauth/callback` | `OAuthCallbackRequest` | `DataResponse[WorkspaceItemResponse]` | Callback xử lý OAuth (tạo workspace & lưu config) |

> **Lưu ý:** Chức năng tích hợp nền tảng thứ ba (OAuth URL và OAuth Callback) hiện tại đang được **mock (giả lập)** để hoàn thiện luồng người dùng (UX) và sẽ được implement logic gọi API thực tế ở các phase sau.

## 9. Dev Commands

```bash
uv run python main.py   # Chạy server (port 8000, hot-reload)
uv add <pkg>            # Thêm dependency
uv run migrate          # Chạy migrations
uv run pytest tests/    # Chạy tests
```
