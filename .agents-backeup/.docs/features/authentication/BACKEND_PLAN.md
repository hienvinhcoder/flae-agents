# BACKEND PLAN: Authentication (Login & Register)

## 1. Backend Objective

Mục tiêu của backend trong phạm vi tính năng này là xử lý luồng xác thực, đăng nhập và đăng ký cơ bản:
- Xác thực người dùng thông qua Firebase JWT Token từ Frontend truyền xuống (hỗ trợ Google Login, Facebook Login, Email/Password).
- Đồng bộ thông tin người dùng từ Firebase Auth vào Database Firestore (qua Firedantic).
- **Tự động tạo mới User** trong database nếu người dùng chưa tồn tại (áp dụng cho cả đăng nhập lần đầu bằng mạng xã hội hoặc đăng ký bằng email).
- Thiết lập tầng Middleware (Dependency Injection) làm cơ sở bảo mật cho các API sau này.
- *Lưu ý: Chức năng Workspace và phân quyền Role tạm thời được loại bỏ khỏi phạm vi triển khai của kế hoạch này.*

---

## 2. Context Reviewed

- `Agent.md` (Coding Rules & Architecture)
- `docs/project-context-backend.md`
- `docs/features/authentication/IDEA.md` (Đã được thu hẹp phạm vi)

### Backend Project Context Summary

- **Backend framework hiện tại**: FastAPI, Python >= 3.11.
- **Database hiện tại**: Firestore (Google Cloud) thông qua thư viện `firedantic`.
- **Auth/permission pattern**: Sử dụng Firebase Admin SDK để xác thực token JWT, Dependency Injection (`Depends`) của FastAPI để trích xuất `CurrentUser`.
- **API pattern**: Backend chỉ xử lý thay đổi dữ liệu (POST, PUT, PATCH, DELETE).
- **Coding rules quan trọng**: Pydantic Validation, Global Exception Handler, Logging chuẩn (tự format theo môi trường).

---

## 3. Existing Backend Impact

Tính năng này là bước thiết lập nền tảng bảo mật ban đầu.

- **Existing modules/services bị ảnh hưởng**: Xây dựng module `app/core/security.py` để verify JWT.
- **Existing data models bị ảnh hưởng**: Hoàn thiện Model `User` (lược bỏ các trường liên quan đến workspace cho đến khi cần thiết).
- Các module khác, background jobs, hoặc tests không bị ảnh hưởng trực tiếp.

---

## 4. Data Model Plan

Thiết lập schema cho Firestore thông qua `firedantic` models.

### Model: User
Purpose: Lưu trữ thông tin định danh của người dùng đồng bộ từ Firebase Auth.

Fields:
| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| id | str | Yes | (auto) | ID tài liệu Firestore tự sinh |
| firebase_uid | str | Yes | None | UID cấp bởi Firebase Auth |
| email | str | Yes | None | Email tài khoản |
| full_name | str | Yes | None | Tên hiển thị người dùng |
| login_providers | list[LoginProvider]| Yes | [] | Enum: EMAIL_PASSWORD, GOOGLE, FACEBOOK |
| is_active | bool | Yes | True | Trạng thái hoạt động tài khoản |
| avatar_url | str | No | None | Đường dẫn ảnh đại diện |
| created_at | datetime | Yes | (auto) | Thời điểm tạo tài khoản trong hệ thống |

Indexes needed: `firebase_uid`, `email`.

*(Lưu ý: Các khái niệm Workspace, Invitation, Role không thuộc phạm vi này)*

---

## 5. API Plan

### API: POST /api/v1/auth/sync-user
Purpose: Đồng bộ dữ liệu người dùng từ Firebase Auth vào Firestore. Đây là API Frontend sẽ gọi ngay sau khi nhận được thông báo login thành công từ Firebase SDK.
Auth required: Yes (Firebase JWT Token in Header)
Permission rule: Any valid authenticated user.
Request body:
```json
{
  "email": "user@example.com",
  "full_name": "Nguyen Van A",
  "avatar_url": "https://...",
  "login_provider": "GOOGLE"
}
```
Success response:
```json
{
  "id": "...",
  "firebase_uid": "...",
  "email": "user@example.com",
  "full_name": "Nguyen Van A",
  "avatar_url": "https://...",
  "is_active": true
}
```
Error responses:
```json
{
  "detail": "Invalid Firebase token"
}
```
Validation rules: Payload được validate qua Pydantic, `login_provider` phải thuộc Enum hợp lệ.
Backend handler/service: `auth_service.sync_firebase_user`
Notes: Phương thức Upsert. Nếu `firebase_uid` chưa có trong DB (đăng nhập lần đầu), hệ thống tạo mới User. Nếu đã có, hệ thống có thể cập nhật thêm `login_provider` (nếu user link thêm tài khoản) hoặc thông tin profile cơ bản.

---

## 6. Business Logic Plan

1. **Verify Token**: Middleware (`Depends`) đọc Bearer Token từ Header, dùng Firebase Admin SDK để verify JWT. Trả ra `firebase_uid`.
2. **Logic Sync User**: Gọi service kiểm tra User trong Firestore bằng `firebase_uid`:
   - **Chưa tồn tại**: Tạo mới Document User sử dụng các thông tin gửi kèm request (email, full_name, avatar, provider).
   - **Đã tồn tại**: Trả về thông tin User hiện có. (Có thể append thêm provider vào mảng `login_providers` nếu provider gửi lên chưa tồn tại trong mảng để hỗ trợ account linking).

---

## 7. Auth & Permission Plan

- Toàn bộ cơ chế xác thực dựa trên việc verify Firebase JWT.
- Bất kỳ JWT hợp lệ nào cũng được cho phép thực hiện thao tác sync user.

---

## 8. Background Jobs / Async Tasks

- Không yêu cầu đối với luồng Login/Register cơ bản.

---

## 9. Observability & Logging

- **Info Log**: 
  - `User synced successfully: firebase_uid=..., action=created|updated`
- **Warning/Error Log**: 
  - `Unauthorized access attempt or invalid JWT token.`
  - Cần log nguyên nhân lỗi Firebase Token (hết hạn, sai chữ ký, v.v.) ở mức độ Debug/Warning để hỗ trợ trace.

---

## 10. Backend Testing Plan

### Unit Tests
- [ ] Test Pydantic validation cho schema `UserSyncRequest` (VD: truyền sai Enum provider).

### Integration Tests
- [ ] Test API `/auth/sync-user` với Mock Firebase Token (Trường hợp tạo mới User).
- [ ] Test API `/auth/sync-user` với Mock Firebase Token (Trường hợp User đã tồn tại).
- [ ] Test hệ thống từ chối Request (401) nếu không gửi Token hoặc Token không hợp lệ.

---

## 11. Files Likely To Be Created or Modified

| File/Folder | Action | Reason |
|---|---|---|
| `app/core/security.py` | Update | Viết dependency lấy/kiểm tra Token Firebase. |
| `app/models/user.py` | Update | Hoàn thiện Firedantic model `User` với các Enum LoginProvider phù hợp. |
| `app/schemas/auth.py` | Create | DTOs (Request/Response schemas) cho Auth. |
| `app/services/auth_service.py` | Create | Hàm thực thi logic Sync/Upsert User. |
| `app/api/endpoints/auth.py` | Create | FastAPI Router endpoints cho nhóm Auth. |
| `app/api/api_router.py` | Update | Include router `auth`. |
| `tests/api/test_auth.py` | Create | Các file tests tương ứng. |

*(Lưu ý: Không thực hiện sửa đổi mã nguồn ở bước lập kế hoạch này)*

---

## 12. Backend Implementation Tasks

Dành cho Implementation Agent:

- [ ] **Task 1:** Thiết lập Firebase Auth Dependency Injection tại `app/core/security.py`. Cấu hình Firebase Admin SDK và hàm verify JWT token.
- [ ] **Task 2:** Cập nhật Firedantic model `User` tại `app/models/user.py`. Định nghĩa Enum `LoginProvider` bao gồm `EMAIL_PASSWORD`, `GOOGLE`, `FACEBOOK`.
- [ ] **Task 3:** Tạo schemas `UserSyncRequest` và `UserResponse` bằng Pydantic tại `app/schemas/auth.py`.
- [ ] **Task 4:** Xây dựng service logic tại `app/services/auth_service.py` xử lý việc Upsert thông tin người dùng dựa trên `firebase_uid`.
- [ ] **Task 5:** Viết router `POST /api/v1/auth/sync-user` tại `app/api/endpoints/auth.py` và tích hợp vào `api_router.py`.
- [ ] **Task 6:** Cấu hình thư viện test và viết mock integration test cho quá trình sync user.

---

## 13. Risks & Open Questions

### Risks
- **Firebase Emulator Configuration**: Trong quá trình phát triển (Local/Docker), cần đảm bảo biến môi trường `FIREBASE_AUTH_EMULATOR_HOST` được thiết lập chính xác để backend không gọi ra API thật của Firebase, tránh gây lỗi kết nối hoặc sai lệch data.
