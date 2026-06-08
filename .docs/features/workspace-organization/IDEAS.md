# Đặc tả Yêu cầu: Workspace & Organization Management (Advanced Enterprise)

## 1. Mục tiêu
Xây dựng nền tảng quản lý Workspace/Organization theo mô hình SaaS Logical Multi-tenancy (Đa doanh nghiệp) nhằm cô lập tuyệt đối dữ liệu, quản lý thành viên, phân quyền chặt chẽ, tối ưu hóa hiệu năng truy vấn và bảo vệ tài nguyên hệ thống.

---

## 2. Các Luồng Nghiệp vụ Chính

### A. Tự động khởi tạo Workspace khi đăng ký
- Khi một người dùng mới đăng nhập lần đầu tiên qua Firebase Auth, Frontend sẽ gọi API `/api/v1/auth/sync-user`.
- Tại Backend, nếu phát hiện User này chưa thuộc về bất kỳ Workspace nào:
  1. Tự động tạo một Workspace mặc định với tên dạng: `[Tên người dùng]'s Workspace`.
  2. Tạo một bản ghi liên kết trong bảng `workspace_members` thiết lập User làm `Owner` của Workspace này.
  3. Cập nhật trường `current_workspace_id` của User trỏ đến Workspace mới tạo.
- API trả về thông tin User kèm theo `current_workspace_id`.

### B. Mời thành viên tham gia Workspace (Email Invitation Flow)
- **Gửi lời mời:**
  1. Admin/Owner của Workspace nhập email người được mời và chọn vai trò (`admin`, `member`, `viewer`).
  2. Backend tạo bản ghi trong bảng `workspace_invitations` ở trạng thái `pending` kèm mã `token` bảo mật ngẫu nhiên và thời gian hết hạn (ví dụ: 7 ngày).
  3. Kích hoạt một **Temporal Workflow** để gửi email tự động (sử dụng SMTP hoặc API của Resend/SendGrid) chứa đường dẫn chấp nhận lời mời (ví dụ: `https://flae.ai/invite?token=xxx`).
- **Chấp nhận lời mời:**
  1. Người nhận click vào link, được điều hướng về trang đăng ký/đăng nhập nếu chưa có tài khoản.
  2. Sau khi xác thực, Frontend gọi API chấp nhận lời mời kèm theo `token`.
  3. Backend xác thực token, thêm người dùng vào bảng `workspace_members` với vai trò tương ứng, cập nhật trạng thái lời mời thành `accepted`, và tự động chuyển `current_workspace_id` của người dùng sang workspace mới.

### C. Quản lý vai trò thành viên (Role-Based Access Control - RBAC)
- Các vai trò cơ bản trong Workspace:
  - **Owner (Chủ sở hữu):** Có toàn quyền (xóa workspace, quản lý thanh toán, phân quyền Admin, quản lý thành viên, quản lý tài nguyên).
  - **Admin (Quản trị viên):** Có quyền cấu hình Agent, quản lý tri thức, mời/xóa thành viên (Member/Viewer), chỉnh sửa các tài nguyên nghiệp vụ.
  - **Member (Thành viên):** Có quyền tạo Agent, chạy hội thoại, xem và cập nhật tài nguyên nghiệp vụ được phân công.
  - **Viewer (Người xem):** Chỉ có quyền xem tài nguyên, chạy thử nghiệm Agent, không có quyền chỉnh sửa hay cấu hình hệ thống.

---

## 3. Kiến trúc kỹ thuật chi tiết

### A. Database Schema
- **Bảng `workspaces`**:
  - `id` (UUID, Primary Key)
  - `name` (String)
  - `owner_uid` (String, FK - users)
- **Bảng `workspace_members`**:
  - `id` (UUID, Primary Key)
  - `workspace_id` (UUID, FK - workspaces, Index)
  - `user_uid` (String, FK - users, Index)
  - `role` (Enum: owner, admin, member, viewer)
  - `status` (Enum: active, suspended)
  - *Unique Constraint:* `(workspace_id, user_uid)`
- **Bảng `workspace_invitations`**:
  - `id` (UUID, Primary Key)
  - `workspace_id` (UUID, FK - workspaces)
  - `email` (String, Index)
  - `role` (Enum: admin, member, viewer)
  - `token` (String, Unique, Index)
  - `invited_by` (String, FK - users)
  - `status` (Enum: pending, accepted, expired)
  - `expires_at` (DateTime)

### B. Cơ chế đính kèm Workspace Context (X-Workspace-ID Header)
- **Frontend (Angular):**
  - Lưu trữ `current_workspace_id` trong ứng dụng (sử dụng Angular Signal).
  - Triển khai một HTTP Interceptor (`WorkspaceInterceptor`) để tự động chèn header `X-Workspace-ID: <current_workspace_id>` vào tất cả các API requests (ngoại trừ các endpoint public hoặc auth/sync-user).
- **Backend (FastAPI):**
  - Định nghĩa một Dependency `get_current_workspace_id` hoặc `get_current_workspace`:
    1. Đọc header `X-Workspace-ID`.
    2. Xác thực xem User hiện tại (từ Firebase JWT) có thuộc về Workspace này hay không bằng cách kiểm tra quyền trong bảng `workspace_members`.
    3. Nếu không hợp lệ hoặc không có quyền truy cập, trả về lỗi `403 Forbidden`.

### C. Bảo mật PostgreSQL Row Level Security (RLS)
- Áp dụng trên toàn bộ các bảng nghiệp vụ có chứa cột `workspace_id` (ví dụ: `agents`, `conversations`, `documents`).
- **Cấu hình Policy trên Database:**
  ```sql
  ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
  CREATE POLICY agents_workspace_isolation ON agents
    FOR ALL
    USING (workspace_id::text = current_setting('app.current_workspace_id', true));
  ```
- **Kích hoạt tại FastAPI + SQLAlchemy:**
  - Viết một AsyncSession Dependency hoặc Middleware. Khi lấy kết nối từ Connection Pool, thực hiện lệnh SQL:
    ```sql
    SET LOCAL app.current_workspace_id = :workspace_id;
    ```
  - Lệnh này chỉ có hiệu lực trong phạm vi Transaction hiện tại, đảm bảo an toàn tuyệt đối và không gây rò rỉ chéo kết nối.

### D. Tối ưu hóa hiệu năng với Redis Cache & Rate Limiting
- **Redis Membership Cache:**
  - Để tránh truy vấn SQL lặp đi lặp lại ở mỗi API request khi Dependency kiểm tra header `X-Workspace-ID`, thông tin membership của User sẽ được lưu vào Redis dưới dạng:
    - Key: `user:membership:{user_uid}`
    - Value: JSON chứa danh sách `workspace_id` và `role` tương ứng.
  - Khi có cập nhật vai trò hoặc xóa thành viên, Backend sẽ tự động xóa key tương ứng trên Redis (Cache Invalidation).
- **Workspace-level Rate Limiting:**
  - Triển khai Middleware sử dụng Redis Cell hoặc Redis Token Bucket để giới hạn số lượng request tối đa trên giây (RPS) cho từng `workspace_id` (ví dụ: Workspace miễn phí tối đa 10 req/s, Enterprise tối đa 100 req/s).

### E. Dynamic Partitioning cho Vector Tri thức (`flae_knowledge_db`)
- Bảng lưu trữ tri thức (Knowledge Base) chứa Vector Embeddings và Chunk Text sẽ được phân vùng (Partition Table) theo cột `workspace_id`.
- Khi một Workspace mới được tạo ra, Backend sẽ tự động chạy lệnh DDL tạo phân vùng (Partition Partition) tương ứng cho workspace đó để đảm bảo tốc độ tìm kiếm Vector RAG luôn ở mức tối ưu nhất khi dữ liệu phình to.

---

## 4. Kế hoạch xác thực (Verification Plan)
- **Kiểm thử tự động (Unit/Integration Tests):**
  - Viết test case xác nhận RLS hoạt động: Truy vấn dữ liệu của Workspace A bằng connect session của Workspace B phải trả về kết quả rỗng.
  - Kiểm tra tính hợp lệ của Token mời thành viên.
  - Kiểm tra cơ chế ghi/xóa cache Redis khi cập nhật quyền.
- **Kiểm thử thủ công:**
  - Mở hai cửa sổ trình duyệt (hoặc 2 tab ẩn danh) đăng nhập bằng hai tài khoản thuộc hai Workspace khác nhau, thao tác đổi dữ liệu để đảm bảo không bị ảnh hưởng chéo.
