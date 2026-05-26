# Đặc tả Yêu cầu Kỹ thuật: Workspace Onboarding

## 1. Tổng quan
Tính năng Onboarding dành cho Chủ cửa hàng khi lần đầu tiên vào hệ thống chưa có Workspace. Hỗ trợ 2 luồng khởi tạo:
1. Tạo thủ công qua Form (Progressive Onboarding).
2. Tích hợp tự động qua hệ thống thứ 3 (OAuth Haravan/KiotViet).

## 2. Kiến trúc Giải pháp Tổng thể
Áp dụng mô hình **Asynchronous Task Queue** (Ví dụ: Redis kết hợp với Celery ở Python). 
Tách biệt luồng phục vụ User (API Server) và luồng xử lý tác vụ nặng (Worker) để đảm bảo hệ thống mượt mà (Non-blocking UX) và chịu tải tốt.

## 3. Quyết định Kỹ thuật Cốt lõi (Decision Records)

### 3.1. Quản lý Liên kết & Chống trùng lặp (Data Integrity)
- **Chiến lược:** Không lưu trực tiếp ID nền tảng thứ 3 vào bảng `Workspaces`.
- **Thực thi:** Tạo bảng riêng biệt `WorkspaceIntegrations` (các trường: `workspace_id`, `provider`, `external_store_id`).
- **Database Rules:** Đặt **Unique Constraint** bắt buộc trên cặp `(provider, external_store_id)`.
- **Giá trị:** Giải quyết triệt để rủi ro race-condition (tạo trùng workspace) và là nền tảng chuẩn mực để hệ thống mở rộng thành Omnichannel sau này (1 Workspace liên kết nhiều platform).

### 3.2. Trải nghiệm Nhập liệu Thủ công (Form UX)
- **Chiến lược:** Khởi tạo tinh gọn (Progressive Onboarding).
- **Thực thi:** Form Onboarding chỉ yêu cầu thông tin tối giản nhất (VD: "Tên cửa hàng" và "Ngành hàng") để khởi tạo Workspace thành công và chuyển ngay vào giao diện làm việc chính.
- **Giá trị:** Tối ưu hóa Conversion Rate, giúp user đạt được "Aha moment" nhanh nhất. Dữ liệu rườm rà sẽ thu thập sau bằng banner nhắc nhở trong Admin.

### 3.3. Vòng đời Kết nối OAuth
- **Chiến lược:** Đồng bộ dữ liệu liên tục 1 chiều (Continuous Data Sync).
- **Thực thi:** Lưu trữ an toàn Access/Refresh Token. Hệ thống liên tục kéo (pull) dữ liệu Đơn hàng, Sản phẩm, Tồn kho... từ Haravan/KiotViet về hệ thống của bạn.
- **Giá trị:** Tạo ra Data Context/Knowledge Base realtime phong phú, là "mạch máu" để các Agent AI trên hệ thống của bạn phát huy sức mạnh phân tích và hỗ trợ.

### 3.4. Xử lý Độ trễ Đồng bộ (Initial Sync Latency)
- **Chiến lược:** Optimistic Redirect & Background Processing.
- **Thực thi:** Sau khi OAuth trả về token, Backend tạo `Workspace`, ném một job `SyncInitialData` vào Redis Queue và lập tức trả HTTP 200 OK. Frontend lập tức Redirect vào Admin Layout.
- **Hiển thị:** Admin Layout hiển thị một Global Banner thông báo quá trình đồng bộ đang diễn ra ngầm, người dùng vẫn có thể thao tác bình thường. Khi Worker xử lý xong sẽ cập nhật trạng thái cờ `is_syncing` để tắt Banner.
- **Giá trị:** Trải nghiệm tốc độ ánh sáng, che giấu hoàn toàn độ trễ của việc gọi API kéo dữ liệu bên thứ 3.
