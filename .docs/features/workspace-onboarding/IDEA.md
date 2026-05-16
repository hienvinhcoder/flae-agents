# IDEA: Workspace Onboarding & Tenant Setup

## 1. Context & Goal
- **Vấn đề:** Sau khi đăng ký và đăng nhập, tài khoản người dùng chưa được gắn với một không gian làm việc (workspace) hay dữ liệu doanh nghiệp nào. Hệ thống FLAE Agent cần ngữ cảnh và dữ liệu kinh doanh thật (từ nền tảng quản lý) để vận hành.
- **Mục tiêu:** Cung cấp trải nghiệm onboarding liền mạch giúp chủ doanh nghiệp dễ dàng khởi tạo Workspace (thủ công hoặc tự động qua việc kết nối nền tảng bán hàng), thiết lập định danh (Tenant ID) và chuẩn bị sẵn đội ngũ Agent mặc định.

## 2. Users & Scope
- **Đối tượng:** Chủ shop, Quản lý doanh nghiệp (người dùng mới).
- **In-scope:**
  - Luồng tạo workspace tự động thông qua việc liên kết tài khoản Haravan hoặc KiotViet.
  - Luồng tạo workspace thủ công qua form (dành cho người chưa dùng 2 nền tảng trên).
  - Tự động sinh `tenant_id` để đảm bảo data isolation.
  - Tự động khởi tạo đội ngũ 3 Agents mặc định (Chat Agent, Analyst Agent, Voice Agent) cùng Agent Contracts.
  - Tạo mẫu báo cáo/hướng dẫn đầu tiên (Welcome Briefing / Setup Checklist).
- **Out-of-scope:**
  - Mời thêm thành viên (Invite Members) vào workspace (sẽ thuộc feature khác).
  - Quản lý billing & subscription.
  - Tự động đồng bộ toàn bộ lịch sử đơn hàng sâu (việc đồng bộ data lớn sẽ chạy background worker riêng sau khi onboarding xong).
- **Giả định:** Người dùng bắt buộc phải hoàn thành bước này mới có thể vào Dashboard chính của FLAE. Ban đầu, mỗi người dùng mặc định sẽ tạo và quản lý 1 Workspace.

## 3. User Flow
- **Bắt đầu:** User vừa đăng nhập thành công và chưa có workspace. Router điều hướng tới `/onboarding`.
1. **Màn hình chọn phương thức:** Giao diện hỏi "Bạn đang quản lý bán hàng trên nền tảng nào?".
2. **Nhánh A (Kết nối Nền tảng - Haravan/KiotViet):**
   - User chọn nền tảng và bấm "Kết nối ngay".
   - Hệ thống chuyển hướng sang trang đăng nhập/ủy quyền của nền tảng (OAuth 2.0).
   - Sau khi user đồng ý, nền tảng redirect về FLAE kèm mã code.
   - FLAE tự động lấy token, truy xuất thông tin cửa hàng và dùng dữ liệu đó để sinh Workspace.
3. **Nhánh B (Thiết lập Thủ công):**
   - User chọn "Nhập thông tin thủ công".
   - User điền form gồm: Tên doanh nghiệp, Ngành hàng, Mô tả ngắn, Website (tùy chọn).
   - User bấm "Hoàn tất". FLAE tạo Workspace từ dữ liệu form.
4. **Khởi tạo ngầm (Hệ thống thực hiện):**
   - Cấp `tenant_id` cho workspace.
   - Gắn `role = owner` cho user hiện tại vào workspace này.
   - Sinh các bản ghi mặc định cho Chat, Analyst, Voice Agent và Agent Contracts tương ứng.
   - Tạo item "Welcome" trong Morning Briefing.
5. **Kết thúc:** Chuyển hướng người dùng vào `/dashboard` (hoặc trang Checklist setup tiếp theo).

## 4. UX & Data (Conceptual)
- **Định hướng UX:** 
  - Phong cách "Green Growth": Hiện đại, tinh gọn, tạo cảm giác đáng tin cậy.
  - Dùng visual/logo to, rõ ràng cho Haravan và KiotViet để tăng tỉ lệ click (call-to-action).
  - Form thủ công chia thành các step (hoặc giao diện một trang cuộn mượt mà) để tránh ngợp.
  - Có màn hình loading "Đang khởi tạo đội ngũ AI của bạn..." tạo cảm giác Premium.
- **Dữ liệu & Logic (Khái niệm):**
  - **Input:** Token ủy quyền (OAuth) hoặc Form data.
  - **Output:** Dữ liệu cốt lõi (Workspace, Tenant, User-Workspace Mapping, Integration record, Agents list).
- **Trạng thái (States):**
  - *Selecting:* Đang chọn cách thiết lập.
  - *Authorizing:* Đang chuyển hướng đi/về từ nền tảng thứ ba.
  - *Building:* Đang xử lý data và tạo agents (Loading state).
  - *Done:* Sẵn sàng vào ứng dụng.
- **Edge Cases (Ngoại lệ):**
  - User bấm hủy trong lúc ủy quyền nền tảng -> Quay lại bước chọn phương thức.
  - Cửa hàng nền tảng đã được liên kết với một tài khoản FLAE khác -> Báo lỗi "Cửa hàng này đã được đăng ký, vui lòng liên hệ admin...".
  - Mất kết nối mạng khi đang submit form thủ công.

## 5. Constraints & Notes
- **Ràng buộc:** 
  - Tính năng Tenant Isolation cực kỳ quan trọng: `tenant_id` phải là khóa gốc cho mọi truy vấn dữ liệu sau này của user và agent.
  - Token truy cập của bên thứ ba (Access/Refresh token) phải được lưu trữ an toàn.
- **Lưu ý:**
  - Cần thống nhất Redirect URI cho callback của Haravan và KiotViet trên frontend (`/auth/callback` hoặc `/onboarding/callback`).
  - Frontend hiện đang có `MockWorkspaceService`, sẽ cần loại bỏ để thay bằng API REST gọi về Backend FastAPI thực tế.
