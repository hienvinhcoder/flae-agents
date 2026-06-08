# Feature Done: Workspace & Organization Management

Tính năng quản lý Không gian làm việc (Workspace) và Thành viên/Tổ chức (Organization) theo mô hình Logical Multi-tenancy đã được xây dựng và tích hợp thành công trên cả Backend và Frontend.

## 🗂️ Danh sách file bị ảnh hưởng & thay đổi chính

### 1. Database & Models (PostgreSQL)
* **[MODIFY] [workspace.py](file:///Users/nguyenhienvinh/projects/flae-agents/backend/app/models/workspace.py)**: Phân rã cấu trúc JSONB `admins` và `members` cũ thành các bảng chuẩn hoá mối quan hệ 1-N và N-N.
  - Tạo mới model `WorkspaceMember` quản lý vai trò (`owner`, `admin`, `member`, `viewer`) và trạng thái (`active`, `suspended`).
  - Tạo mới model `WorkspaceInvitation` quản lý lời mời tham gia qua email kèm token ngẫu nhiên.
* **[NEW] Alembic Migration**: Tạo thành công script migration và cập nhật database schema lên Postgres cluster.

### 2. Backend Security & Core Logic
* **[MODIFY] [security.py](file:///Users/nguyenhienvinh/projects/flae-agents/backend/app/core/security.py)**:
  - Thêm `get_current_workspace_id` dependency: kiểm tra sự tồn tại của header `X-Workspace-ID` và xác thực quyền truy cập thông qua **Redis Membership Cache** (TTL 24h) hoặc query DB (nếu cache miss).
  - Thêm `require_roles` helper decorator cho phân quyền vai trò (RBAC).
* **[MODIFY] [rag_db.py](file:///Users/nguyenhienvinh/projects/flae-agents/backend/app/db/rag_db.py)**: Bổ sung phương thức async `create_workspace_partition` khởi tạo phân vùng RAG (chunks, entities, relationships) cho workspace mới bất đồng bộ.
* **[MODIFY] [auth_service.py](file:///Users/nguyenhienvinh/projects/flae-agents/backend/app/services/auth_service.py)**: Tự động khởi tạo workspace mặc định và phân vùng RAG khi đồng bộ user mới từ Firebase Auth.

### 3. API Endpoints & Services (FastAPI)
* **[MODIFY] [workspace_srv.py](file:///Users/nguyenhienvinh/projects/flae-agents/backend/app/services/workspace_srv.py)**: Triển khai các phương thức nghiệp vụ: tạo workspace, lấy danh sách, gửi lời mời, đồng ý lời mời, cập nhật thành viên, xóa thành viên. Tích hợp trực tiếp việc xoá Redis cache và gọi Temporal Client.
* **[MODIFY] [workspace.py](file:///Users/nguyenhienvinh/projects/flae-agents/backend/app/api/v1/endpoints/workspace.py)**: Cập nhật các API endpoints RESTful quản lý không gian làm việc.
* **[MODIFY] [user.py](file:///Users/nguyenhienvinh/projects/flae-agents/backend/app/api/v1/endpoints/user.py)**: Thêm route `PUT /current-workspace` cập nhật workspace hoạt động cho người dùng.

### 4. Background Workers (Temporal)
* **[NEW] [invitation.py (Workflow)](file:///Users/nguyenhienvinh/projects/flae-agents/backend/app/temporal/workflows/invitation.py)**: `WorkspaceInvitationWorkflow` điều phối activity gửi thư.
* **[NEW] [invitation.py (Activity)](file:///Users/nguyenhienvinh/projects/flae-agents/backend/app/temporal/activities/invitation.py)**: `send_invitation_email` activity giả lập gửi email lời mời bằng tiếng Việt từ DB.
* **[MODIFY] [flae_worker.py](file:///Users/nguyenhienvinh/projects/flae-agents/backend/workers/flae_worker.py)**: Đăng ký workflow và activity mới vào Temporal worker.

### 5. Frontend Integration (Angular 20)
* **[MODIFY] [workspace-api.service.ts](file:///Users/nguyenhienvinh/projects/flae-agents/frontend/src/app/core/services/api/workspace-api.service.ts)**: Cập nhật giao diện REST API đầy đủ.
* **[MODIFY] [workspace-general.component.ts](file:///Users/nguyenhienvinh/projects/flae-agents/frontend/src/app/features/dashboard/pages/settings/tabs/workspace-general/workspace-general.component.ts)**: Gỡ mock data, thay thế update tên workspace bằng API call.
* **[MODIFY] [workspace-members.component.ts](file:///Users/nguyenhienvinh/projects/flae-agents/frontend/src/app/features/dashboard/pages/settings/tabs/workspace-members/workspace-members.component.ts)**: Đồng bộ danh sách members, invitations, các logic phân quyền (RBAC), sửa đổi trạng thái, xóa thành viên qua API thật.
* **[MODIFY] [invite-accept.component.ts](file:///Users/nguyenhienvinh/projects/flae-agents/frontend/src/app/features/dashboard/pages/invite-accept/invite-accept.component.ts)**: Tích hợp logic acceptLời mời thông qua API và cập nhật store, redirect.
* **[MODIFY] [sidebar.component.ts](file:///Users/nguyenhienvinh/projects/flae-agents/frontend/src/app/core/layout/admin-layout/ui/sidebar.component.ts)**: Đồng bộ thay đổi active workspace lên database khi người dùng đổi lựa chọn.

## 🧪 Kết quả kiểm thử
* Đã chạy bộ unit test suite `uv run pytest tests/` của backend.
* Toàn bộ **9/9 test cases** (bao gồm test auth sync, test tạo manual workspace, test gửi lời mời, cập nhật vai trò, xem danh sách lời mời) đều **Passed 100%**.
