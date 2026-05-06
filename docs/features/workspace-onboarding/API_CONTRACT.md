# API CONTRACT: Workspace Onboarding & Tenant Setup

## 1. Overview
Tài liệu định nghĩa các API giao tiếp giữa Frontend và Backend cho luồng Workspace Onboarding. Các API đảm nhận việc tạo workspace thủ công, khởi tạo luồng xác thực qua OAuth (Haravan/KiotViet) và xử lý callback để tạo Workspace tự động.

---

## 2. Shared Enums/Models

```typescript
// Các loại nền tảng được hỗ trợ
enum PlatformType {
  MANUAL = "manual",
  HARAVAN = "haravan",
  KIOTVIET = "kiotviet"
}

// Model Response Workspace
interface WorkspaceResponse {
  id: string; // Đây chính là tenant_id
  name: string;
  industry?: string;
  platform: PlatformType;
  owner_uid: string;
}
```

---

## 3. API Endpoints

### `POST /api/v1/workspaces/manual`

**Description:**
Tạo một Workspace mới thủ công (dành cho người dùng không liên kết nền tảng thứ ba). Hệ thống sẽ tự động seed các Agent mặc định và trả về thông tin Workspace (chứa `tenant_id`).

**Request Headers:**
- `Authorization: Bearer <Firebase ID Token>`

**Request Body (`application/json`):**
```json
{
  "name": "Tên doanh nghiệp",
  "industry": "Thời trang", 
  "description": "Mô tả ngắn (tùy chọn)",
  "website": "https://example.com" 
}
```

**Success Response (`201 Created`):**
```json
{
  "code": "201",
  "message": "Workspace created successfully",
  "data": {
    "id": "tenant_123456",
    "name": "Tên doanh nghiệp",
    "industry": "Thời trang",
    "platform": "manual",
    "owner_uid": "user_firebase_uid"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Thiếu thông tin bắt buộc hoặc sai định dạng.
- `401 Unauthorized`: Token không hợp lệ.

---

### `POST /api/v1/workspaces/oauth/url`

**Description:**
Yêu cầu Backend trả về URL ủy quyền của Haravan hoặc KiotViet để Frontend chuyển hướng người dùng sang trang đăng nhập của bên thứ ba.

**Request Headers:**
- `Authorization: Bearer <Firebase ID Token>`

**Request Body (`application/json`):**
```json
{
  "platform": "haravan", // "haravan" hoặc "kiotviet"
  "shop_domain": "shop-name.myharavan.com" // Bắt buộc nếu là haravan
}
```

**Success Response (`200 OK`):**
```json
{
  "code": "200",
  "message": "Success",
  "data": {
    "auth_url": "https://accounts.haravan.com/connect/authorize?client_id=...&response_type=code&redirect_uri=..."
  }
}
```

**Error Responses:**
- `400 Bad Request`: Nền tảng không hỗ trợ.
- `401 Unauthorized`: Token không hợp lệ.

---

### `POST /api/v1/workspaces/oauth/callback`

**Description:**
Endpoint để Frontend gửi thông tin (Authorization code) lấy được từ redirect callback của nền tảng về cho Backend. Backend sẽ tiến hành đổi token, fetch thông tin shop và khởi tạo Workspace.

**Request Headers:**
- `Authorization: Bearer <Firebase ID Token>`

**Request Body (`application/json`):**
```json
{
  "platform": "haravan",
  "code": "auth_code_from_url_param",
  "shop_domain": "shop-name.myharavan.com" // Cần truyền lại từ trạng thái của Frontend
}
```

**Success Response (`201 Created`):**
```json
{
  "code": "201",
  "message": "Workspace integrated and created successfully",
  "data": {
    "id": "tenant_78910",
    "name": "Tên Shop trên Haravan",
    "platform": "haravan",
    "owner_uid": "user_firebase_uid"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Code không hợp lệ hoặc đã hết hạn.
- `401 Unauthorized`: Token người dùng không hợp lệ.
- `502 Bad Gateway`: Lỗi giao tiếp với API của nền tảng thứ ba (Haravan/KiotViet timeout hoặc reject).
