# Backend Plan: Workspace & Organization Management

Tài liệu thiết kế kiến trúc Backend (FastAPI, SQLAlchemy, Redis, Temporal) cho tính năng quản lý Workspace và Thành viên (Organization) theo mô hình Logical Multi-tenancy chuẩn Enterprise.

---

## 1. Thiết kế Dữ liệu (Database Schema)

Chúng ta sẽ thực hiện di chuyển cấu trúc dữ liệu hiện tại bằng cách phân rã các trường thành viên dạng JSONB cũ (`admins`, `members` trong bảng `workspaces`) thành mối quan hệ chuẩn hóa 1-N và N-N với các bảng liên kết.

### A. Cấu trúc Bảng Database (`flae_db` - Main DB)

#### 1. Bảng `workspaces` (Chỉnh sửa)
Loại bỏ các trường JSONB `admins` và `members` để chuyển sang sử dụng bảng `workspace_members`.
```python
class Workspace(BaseModel):
    __tablename__ = "workspaces"

    name: Mapped[str] = mapped_column(String, nullable=False)
    owner_uid: Mapped[str] = mapped_column(String, index=True, nullable=False) # Firebase UID của Owner
```

#### 2. Bảng `workspace_members` (Tạo mới)
Lưu thông tin chi tiết về các thành viên tham gia vào từng không gian làm việc.
```python
class WorkspaceRole(str, Enum):
    owner = "owner"
    admin = "admin"
    member = "member"
    viewer = "viewer"

class WorkspaceMemberStatus(str, Enum):
    active = "active"
    suspended = "suspended"

class WorkspaceMember(BaseModel):
    __tablename__ = "workspace_members"

    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False)
    user_uid: Mapped[str] = mapped_column(String, ForeignKey("users.firebase_uid", ondelete="CASCADE"), index=True, nullable=False)
    role: Mapped[WorkspaceRole] = mapped_column(SQLEnum(WorkspaceRole), default=WorkspaceRole.member, nullable=False)
    status: Mapped[WorkspaceMemberStatus] = mapped_column(SQLEnum(WorkspaceMemberStatus), default=WorkspaceMemberStatus.active, nullable=False)

    # Đảm bảo một user chỉ có một bản ghi duy nhất trong một workspace
    __table_args__ = (
        UniqueConstraint("workspace_id", "user_uid", name="uq_workspace_member"),
    )
```

#### 3. Bảng `workspace_invitations` (Tạo mới)
Quản lý lời mời tham gia workspace thông qua email.
```python
class InvitationStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    expired = "expired"

class WorkspaceInvitation(BaseModel):
    __tablename__ = "workspace_invitations"

    workspace_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, nullable=False)
    email: Mapped[str] = mapped_column(String, index=True, nullable=False)
    role: Mapped[WorkspaceRole] = mapped_column(SQLEnum(WorkspaceRole), default=WorkspaceRole.member, nullable=False)
    token: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    invited_by: Mapped[str] = mapped_column(String, ForeignKey("users.firebase_uid", ondelete="CASCADE"), nullable=False)
    status: Mapped[InvitationStatus] = mapped_column(SQLEnum(InvitationStatus), default=InvitationStatus.pending, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
```

### B. Index & Constraints
- Tạo Index trên `workspace_members.workspace_id` và `workspace_members.user_uid` để tối ưu hóa việc kiểm tra quyền hạn khi có API request.
- Tạo Index trên `workspace_invitations.token` phục vụ cho việc kiểm tra nhanh khi người dùng click vào link chấp nhận lời mời.

---

## 2. Giao kèo API (API Contract)

Tất cả các API nghiệp vụ yêu cầu header `X-Workspace-ID` để thực hiện xác thực Multi-tenant. 

### A. FastAPI Dependencies

#### 1. `get_current_workspace_id`
- **Logic:**
  1. Đọc header `X-Workspace-ID` từ request. Nếu thiếu, trả về `400 Bad Request` ("Header X-Workspace-ID is missing").
  2. Xác thực user hiện tại bằng `get_current_user_uid`.
  3. Kiểm tra xem user có phải là thành viên hoạt động (`status == 'active'`) của workspace hay không. Để tối ưu hiệu năng, việc này sẽ đọc qua **Redis Membership Cache** trước, nếu không có mới query DB và ghi ngược lại cache.
  4. Nếu không hợp lệ hoặc không có quyền truy cập, trả về `403 Forbidden` ("You do not have access to this workspace").
  5. Trả về UUID `workspace_id`.

#### 2. `require_roles(roles: list[WorkspaceRole])`
- **Logic:** Helper function sinh dependency để kiểm tra xem vai trò của user trong workspace hiện tại có nằm trong danh sách được cho phép hay không. Trả về `403 Forbidden` nếu không đủ quyền.

### B. API Endpoints

#### 1. Đồng bộ người dùng khi đăng ký / đăng nhập
- **Method & Route:** `POST /api/v1/auth/sync-user`
- **Auth:** `Depends(get_current_user_uid)`
- **Request Body (UserSyncRequest):**
  ```json
  {
    "email": "user@example.com",
    "full_name": "Nguyen Van A",
    "avatar_url": "https://...",
    "login_provider": "google"
  }
  ```
- **Logic:**
  1. Đồng bộ thông tin user vào bảng `users`.
  2. Nếu phát hiện user chưa thuộc bất kỳ Workspace nào (tức là mới tạo hoặc `current_workspace_id` rỗng):
     - Tạo mới một Workspace: `name = f"{user.full_name}'s Workspace"`, `owner_uid = user.firebase_uid`.
     - Tạo bản ghi liên kết trong `workspace_members`: `role = owner`, `status = active`.
     - Cập nhật `user.current_workspace_id = new_workspace.id`.
     - Kích hoạt tạo phân vùng RAG trong `flae_knowledge_db` cho workspace mới này.
  3. Trả về thông tin user bao gồm `current_workspace_id`.
- **Response Structure (DataResponse[UserItemResponse]):**
  ```json
  {
    "status": "success",
    "data": {
      "id": "user-uuid",
      "email": "user@example.com",
      "full_name": "Nguyen Van A",
      "current_workspace_id": "workspace-uuid"
    }
  }
  ```

#### 2. Tạo Workspace Thủ công
- **Method & Route:** `POST /api/v1/workspaces/manual`
- **Auth:** `Depends(get_current_user)`
- **Request Body:**
  ```json
  {
    "name": "Workspace Project Alpha"
  }
  ```
- **Logic:**
  1. Tạo workspace mới trong database.
  2. Tạo bản ghi `workspace_members` thiết lập người tạo làm `owner`.
  3. Tự động khởi tạo phân vùng dữ liệu RAG (`flae_knowledge_db`) cho workspace mới này.
  4. Nếu user chưa cấu hình `current_workspace_id`, cập nhật trường này trỏ đến workspace vừa tạo.
- **Response:** `DataResponse[WorkspaceItemResponse]`

#### 3. Lấy danh sách Workspace của User
- **Method & Route:** `GET /api/v1/workspaces`
- **Auth:** `Depends(get_current_user)`
- **Response:** `DataResponse[list[WorkspaceItemResponse]]`

#### 4. Thay đổi Workspace hoạt động hiện tại
- **Method & Route:** `PUT /api/v1/users/current-workspace`
- **Auth:** `Depends(get_current_user)`
- **Request Body:**
  ```json
  {
    "workspace_id": "workspace-uuid"
  }
  ```
- **Logic:**
  1. Xác thực user có thuộc workspace này không.
  2. Cập nhật `current_workspace_id` của user trong database.
- **Response:** `DataResponse[UserItemResponse]`

#### 5. Mời thành viên mới
- **Method & Route:** `POST /api/v1/workspaces/{workspace_id}/invitations`
- **Auth:** `Depends(get_current_user)` + `require_roles(['owner', 'admin'])`
- **Request Body:**
  ```json
  {
    "email": "invited_user@example.com",
    "role": "member"
  }
  ```
- **Logic:**
  1. Tạo bản ghi `workspace_invitations` ở trạng thái `pending`, kèm mã `token` bảo mật ngẫu nhiên và `expires_at = now + 7 ngày`.
  2. Kích hoạt **Temporal Workflow** gửi email mời: `WorkspaceInvitationWorkflow`.
- **Response:** `DataResponse[WorkspaceInvitationResponse]`

#### 6. Chấp nhận lời mời tham gia
- **Method & Route:** `POST /api/v1/workspaces/invitations/accept`
- **Auth:** `Depends(get_current_user)` (Yêu cầu đăng nhập trước khi accept)
- **Request Body:**
  ```json
  {
    "token": "invitation-token-uuid-or-string"
  }
  ```
- **Logic:**
  1. Xác thực token lời mời (trạng thái `pending`, chưa hết hạn).
  2. Thêm user đang đăng nhập vào bảng `workspace_members` với `role` định nghĩa trong lời mời, `status = active`.
  3. Chuyển trạng thái lời mời sang `accepted`.
  4. Cập nhật `current_workspace_id` của user sang workspace mới này.
  5. Xóa Redis membership cache của user.
- **Response:** `DataResponse[UserItemResponse]`

#### 7. Cập nhật vai trò thành viên
- **Method & Route:** `PUT /api/v1/workspaces/{workspace_id}/members/{user_uid}`
- **Auth:** `Depends(get_current_user)` + `require_roles(['owner', 'admin'])`
- **Request Body:**
  ```json
  {
    "role": "admin",
    "status": "active"
  }
  ```
- **Logic:**
  1. Chỉ có `owner` mới sửa đổi quyền của một `admin` hoặc `owner` khác. `admin` chỉ sửa đổi quyền của `member` hoặc `viewer`.
  2. Cập nhật bảng `workspace_members`.
  3. Xóa Redis membership cache của user bị tác động để áp dụng quyền mới lập tức.
- **Response:** `DataResponse[WorkspaceMemberResponse]`

#### 8. Xóa thành viên khỏi Workspace
- **Method & Route:** `DELETE /api/v1/workspaces/{workspace_id}/members/{user_uid}`
- **Auth:** `Depends(get_current_user)` + `require_roles(['owner', 'admin'])`
- **Logic:**
  1. Thực hiện xóa hoặc chuyển trạng thái sang `suspended` tùy theo nghiệp vụ.
  2. Xóa Redis membership cache của user bị tác động.
- **Response:** `DataResponse[bool]`

---

## 3. Xử lý Bất đồng bộ, Caching & Cô lập dữ liệu

### A. Redis Membership Cache (Tối ưu truy vấn quyền hạn)
- **Cấu trúc lưu trữ:**
  - Key: `user:membership:{user_uid}`
  - Value (JSON):
    ```json
    {
      "workspaces": [
        {
          "workspace_id": "ws-uuid-1",
          "role": "owner",
          "status": "active"
        },
        {
          "workspace_id": "ws-uuid-2",
          "role": "viewer",
          "status": "active"
        }
      ]
    }
    ```
  - TTL (Time To Live): 24 giờ (`86400` giây).
- **Cơ chế Invalidation (Xóa cache):**
  - Thực hiện xóa key `user:membership:{user_uid}` ngay lập tức khi:
    - User chấp nhận lời mời mới.
    - Admin cập nhật vai trò hoặc đình chỉ/xóa User khỏi Workspace.

### B. Workspace-level Rate Limiting
- **Cơ chế:** Sử dụng thư viện FastAPI-Limiter kết hợp với Redis để giới hạn API rate limit theo `workspace_id` (được đọc từ Header `X-Workspace-ID`).
- **Phân loại:**
  - Free Tier: tối đa 10 req/s.
  - Enterprise Tier: tối đa 100 req/s.

### C. Gửi Email Lời mời qua Temporal Workflow
Chúng ta triển khai một Temporal Workflow chuyên biệt để thực hiện việc gửi email bất đồng bộ:

- **Workflow:** `WorkspaceInvitationWorkflow`
- **Activity:** `send_invitation_email`
- **Luồng xử lý:**
  1. API endpoint nhận request mời -> tạo record invitation ở DB -> gọi `client.execute_workflow` gửi `invitation_id`.
  2. Worker nhận task -> chạy activity `send_invitation_email`.
  3. Activity truy vấn thông tin email người nhận, người mời và tên Workspace.
  4. Tạo template email bằng tiếng Việt, thực hiện gửi qua SMTP / Resend API.
  5. Nếu gửi lỗi, Temporal sẽ tự động cơ chế retry (exponential backoff) giúp tăng tính tin cậy tuyệt đối của hệ thống.

### D. Khởi tạo phân vùng dữ liệu RAG (`flae_knowledge_db`)
Khi có một Workspace mới được tạo ra ở `flae_db` (dù là do sync-user hay tạo manual):
1. Backend gọi phương thức khởi tạo phân vùng từ `DBManager` trong `app/db/rag_db.py`.
2. Thực hiện lệnh SQL DDL để tạo các phân vùng con cho Workspace:
   - `chunks_{workspace_safe}` phân vùng của `chunks`
   - `entities_{workspace_safe}` phân vùng của `entities`
   - `relationships_{workspace_safe}` phân vùng của `relationships`
   Điều này đảm bảo khi người dùng tải tài liệu lên RAG, dữ liệu vector của họ được cô lập và lưu trữ tại phân vùng riêng biệt ngay lập tức.
