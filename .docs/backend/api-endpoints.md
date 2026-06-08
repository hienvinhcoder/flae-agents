# 🔌 API Endpoints (v1)

Tài liệu này chi tiết hóa danh sách API Endpoints trong phiên bản `v1` của hệ thống FLAE Backend, các quy định định tuyến đặc thù, và lưu ý quan trọng về thiết kế.

## 1. User API (`/api/v1/users`)

Định nghĩa tại: [backend/app/api/v1/endpoints/user.py](../../backend/app/api/v1/endpoints/user.py)

> [!IMPORTANT]
> **Thứ tự định tuyến (Routing Order Matters)**
> Trong FastAPI, các đường dẫn được so khớp theo thứ tự khai báo. Do đó, endpoint tĩnh `PUT /api/v1/users/current-workspace` bắt buộc phải được khai báo **trước** endpoint động `PUT /api/v1/users/{user_id}` để tránh bị matching nhầm thành tham số `user_id == "current-workspace"`.

### POST `/api/v1/users`
* **Mô tả:** Tạo profile người dùng mới sau khi đăng nhập Firebase thành công.
* **Xác thực:** Yêu cầu header `Authorization: Bearer <JWT>` (Verify Firebase Token).
* **Request Body:** [UserCreateRequest](../../backend/app/schemas/sche_user.py)
  ```json
  {
    "full_name": "Nguyen Van A",
    "avatar_url": "https://example.com/avatar.png",
    "login_provider": "google"
  }
  ```
* **Response:** `DataResponse[UserItemResponse]`

### PUT `/api/v1/users/current-workspace`
* **Mô tả:** Thay đổi Workspace hoạt động hiện tại của user.
* **Xác thực:** Yêu cầu header `Authorization: Bearer <JWT>` (Firebase Authentication + load User Object từ DB).
* **Request Body:** [UserCurrentWorkspaceUpdateRequest](../../backend/app/schemas/sche_user.py)
  ```json
  {
    "workspace_id": "99999999-8888-7777-6666-555555555555"
  }
  ```
* **Response:** `DataResponse[UserItemResponse]`

### PUT `/api/v1/users/{user_id}`
* **Mô tả:** Cập nhật thông tin profile của user.
* **Response:** `DataResponse[dict]`

### DELETE `/api/v1/users/{user_id}`
* **Mô tả:** Xóa profile user khỏi hệ thống.
* **Response:** `DataResponse[dict]`

---

## 2. Workspace API (`/api/v1/workspaces`)

Định nghĩa tại: [backend/app/api/v1/endpoints/workspace.py](../../backend/app/api/v1/endpoints/workspace.py)

### GET `/api/v1/workspaces`
* **Mô tả:** Lấy danh sách Workspace của User hiện tại (các Workspace mà User sở hữu hoặc tham gia).
* **Response:** `DataResponse[list[WorkspaceItemResponse]]`

### POST `/api/v1/workspaces/manual`
* **Mô tả:** Tạo một Workspace thủ công mới và tự động sinh dữ liệu mặc định.
* **Request Body:**
  ```json
  {
    "name": "My New Workspace"
  }
  ```
* **Response:** `DataResponse[WorkspaceItemResponse]`

### PUT `/api/v1/workspaces/{workspace_id}`
* **Mô tả:** Cập nhật thông tin tên Workspace (chỉ dành cho Owner hoặc Admin).
* **Request Body:**
  ```json
  {
    "name": "Updated Workspace Name"
  }
  ```
* **Response:** `DataResponse[WorkspaceItemResponse]`

### GET `/api/v1/workspaces/{workspace_id}/members`
* **Mô tả:** Lấy danh sách thành viên kèm vai trò và profile trong Workspace.
* **Quyền hạn:** Owner, Admin, Member, Viewer.
* **Response:** `DataResponse[list[WorkspaceMemberResponse]]`

### POST `/api/v1/workspaces/{workspace_id}/invitations`
* **Mô tả:** Gửi lời mời thành viên mới tham gia Workspace qua email.
* **Quyền hạn:** Chỉ Owner hoặc Admin.
* **Request Body:**
  ```json
  {
    "email": "member@example.com",
    "role": "member"
  }
  ```
* **Response:** `DataResponse[WorkspaceInvitationResponse]`

### GET `/api/v1/workspaces/{workspace_id}/invitations`
* **Mô tả:** Lấy danh sách lời mời đang ở trạng thái pending (chờ xử lý).
* **Quyền hạn:** Owner hoặc Admin.
* **Response:** `DataResponse[list[WorkspaceInvitationResponse]]`

### POST `/api/v1/workspaces/invitations/accept`
* **Mô tả:** Chấp nhận lời mời tham gia workspace thông qua invitation token.
* **Request Body:**
  ```json
  {
    "token": "invitation_token_string"
  }
  ```
* **Response:** `DataResponse[WorkspaceItemResponse]` (Thông tin workspace vừa gia nhập).

### PUT `/api/v1/workspaces/{workspace_id}/members/{user_uid}`
* **Mô tả:** Thay đổi vai trò (Owner, Admin, Member, Viewer) hoặc trạng thái (Active, Suspended) của thành viên.
* **Quyền hạn:** Owner hoặc Admin.
* **Request Body:**
  ```json
  {
    "role": "admin",
    "status": "active"
  }
  ```
* **Response:** `DataResponse[WorkspaceMemberResponse]`

### DELETE `/api/v1/workspaces/{workspace_id}/members/{user_uid}`
* **Mô tả:** Xóa/trục xuất thành viên ra khỏi Workspace.
* **Quyền hạn:** Owner hoặc Admin.
* **Response:** `DataResponse[bool]`
