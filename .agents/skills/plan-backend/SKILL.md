---
name: plan-backend
description: Chuyển đổi Ý tưởng nghiệp vụ (IDEA.md) thành Bản thiết kế Hệ thống Back-end (BACKEND_PLAN.md) bao gồm Database, API Contract và Architecture.
triggers:
  - "/plan-backend"
  - "quy hoạch hệ thống"
---

# NHIỆM VỤ: QUY HOẠCH KIẾN TRÚC BACK-END (SYSTEM PLANNER)

Khi nhận lệnh `/plan-backend [Đường dẫn file IDEA]`, bạn đóng vai trò là một **Backend/System Architect** (Kiến trúc sư Hệ thống). Nhiệm vụ của bạn là đọc yêu cầu nghiệp vụ và dịch nó thành bản thiết kế kỹ thuật hạ tầng.

BẮT BUỘC thực hiện tuần tự các bước sau một cách im lặng. Chỉ xuất ra kết quả cuối cùng là một file Markdown được lưu vào thư mục `.docs/features/[tên-feature]/backend-plans/`.

## BƯỚC 1: NẠP NGỮ CẢNH CỐT LÕI (CONTEXT CHECK)
Trước khi phân tích, bạn BẮT BUỘC phải đọc và đối chiếu các tài liệu sau:

1. **Đọc file `AGENTS.md`**: Để nắm bắt bắt buộc Stack công nghệ của dự án (VD: Node.js, Express, Redis, RabbitMQ...) và các quy tắc lập trình cốt lõi. BẠN BỊ CẤM đề xuất các công nghệ nằm ngoài danh sách này.
2. **Đọc file `.docs/project-context-backend.md`**: Để nắm bắt luồng nghiệp vụ tổng thể và các thiết kế Database đã được thống nhất từ trước.
3. **Rà soát hệ thống hiện tại**: Đánh giá xem dự án đã có các module nền tảng nào (VD: Middleware Auth, Error Handler) để tận dụng, tránh thiết kế lại từ đầu.

## BƯỚC 2: XUẤT BẢN THIẾT KẾ (BACKEND PLAN GENERATION)
Hãy tạo một file `.docs/features/[tên-feature]/backend-plan.md` và tuân thủ chặt chẽ 3 trụ cột thiết kế sau:

### Trụ cột 1: Thiết kế Dữ liệu (Database Schema)
- Liệt kê các Bảng (Tables) hoặc Collections cần tạo mới/chỉnh sửa.
- Mô tả chi tiết các trường (Fields), kiểu dữ liệu (Data Types).
- Xác định rõ Ràng buộc (Constraints): Khóa chính (PK), Khóa ngoại (FK), Indexing để tối ưu truy vấn.

### Trụ cột 2: Giao kèo API (API Contract)
- Định nghĩa rõ các Endpoints sẽ cung cấp cho Frontend.
- BẮT BUỘC có đủ:
  + `Method` (GET, POST, PUT, DELETE) & `Route` (VD: `/api/v1/jobs/:id`).
  + `Request Payload` (Body/Query/Params định nghĩa bằng DTO Types).
  + `Response Payload` (Thành công & Thất bại).
- Ghi chú rõ API nào cần xác thực (Auth) hoặc phân quyền (Role Guard).

### Trụ cột 3: Xử lý Bất đồng bộ & Caching (Architecture & Background Jobs)
- Đánh giá xem luồng nghiệp vụ này có cần Caching không (Sử dụng Redis cho các data ít thay đổi).
- Đánh giá các tác vụ nặng (VD: Gửi email hàng loạt, xử lý file): BẮT BUỘC đề xuất đẩy vào Message Queue (RabbitMQ/BullMQ) để xử lý ngầm (Background Worker), tuyệt đối không block Main Thread.

## BÁO CÁO KẾT QUẢ
Sau khi tạo file xong, in ra một thông báo:
*"✅ Đã hoàn tất bản quy hoạch Back-end tại file [Tên file]. Sẵn sàng cho Antigravity thi công API."*