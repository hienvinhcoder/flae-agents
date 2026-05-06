# API CONTRACT: Authentication (Login & Register)

## 1. Overview
Tài liệu định nghĩa API contract cho tính năng Xác thực, bao gồm API dùng để đồng bộ dữ liệu người dùng từ Firebase Auth vào hệ thống database Firestore của backend.

## 2. API Endpoints

### POST `/api/v1/auth/sync-user`

**Description:** Đồng bộ dữ liệu người dùng từ Firebase Auth vào Firestore. API này được gọi từ Frontend ngay sau khi Frontend xác thực thành công với Firebase SDK và có được Firebase JWT token. Nếu user đăng nhập lần đầu, backend sẽ tạo mới tài khoản. Nếu user đã tồn tại, backend sẽ trả về thông tin user và cập nhật thêm `login_provider` nếu cần để hỗ trợ account linking.

**Request Headers:**
- `Authorization: Bearer <firebase_jwt_token>`

**Path Parameters:**
- *None*

**Query Parameters:**
- *None*

**Request Body (`application/json`):**
```json
{
  "email": "user@example.com", // required
  "full_name": "Nguyen Van A", // required
  "avatar_url": "https://...", // optional
  "login_provider": "GOOGLE"   // required, LoginProvider enum: EMAIL_PASSWORD, GOOGLE, FACEBOOK
}
```

**Success Response (`200 OK` / `201 Created`):**
```json
{
  "id": "string",            // ID tài liệu Firestore của User
  "firebase_uid": "string",  // UID được cấp bởi Firebase Auth
  "email": "string",         // Email của tài khoản
  "full_name": "string",     // Tên hiển thị người dùng
  "avatar_url": "string",    // URL ảnh đại diện (có thể null)
  "is_active": true          // Trạng thái hoạt động tài khoản
}
```

**Error Responses:**
- `400 Bad Request`: Validation error (ví dụ: thiếu required fields, `login_provider` không hợp lệ).
  ```json
  {
    "detail": [
      {
        "loc": ["body", "login_provider"],
        "msg": "Input should be 'EMAIL_PASSWORD', 'GOOGLE' or 'FACEBOOK'",
        "type": "enum"
      }
    ]
  }
  ```
- `401 Unauthorized`: Token bị thiếu, hết hạn, hoặc không hợp lệ.
  ```json
  {
    "detail": "Invalid Firebase token"
  }
  ```

---

## 3. Shared Enums/Models

**Enum: `LoginProvider`**
Dùng để xác định phương thức đăng nhập mà người dùng sử dụng.
- `EMAIL_PASSWORD`
- `GOOGLE`
- `FACEBOOK`

**Schema: `User`**
Cấu trúc object User chung trả về cho Frontend.
```typescript
interface User {
  id: string;
  firebase_uid: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  is_active: boolean;
}
```
