---
description: Tự động phân tích code vừa thay đổi và cập nhật các file tài liệu context (Index & Detail) để giữ cho hệ thống luôn đồng bộ.
---

# MỤC TIÊU
Đảm bảo các file tài liệu trong thư mục `.docs/` luôn phản ánh đúng 100% logic, kiến trúc và trạng thái của source code thực tế.

# QUY TRÌNH THỰC HIỆN

Agent cần thực hiện nghiêm ngặt các bước sau mà không cần hỏi lại Human, trừ khi gặp kiến trúc xung đột:

## Bước 1: Thu thập và Phân tích Thay đổi từ Mã nguồn Thực tế
- **BẮT BUỘC** phân tích trực tiếp mã nguồn thay đổi bằng cách kiểm tra lịch sử và các tệp tin thay đổi gần đây:
  - Sử dụng các công cụ/lệnh git (ví dụ: `git status`, `git diff --name-only HEAD~1` hoặc `git diff`) để xác định chính xác danh sách các tệp tin đã được chỉnh sửa hoặc tạo mới.
  - Đọc trực tiếp nội dung các file code thay đổi (Backend: Python, DB migrations, Schemas; Frontend: Angular components, Services, Routes) để tự tổng hợp thay đổi về kiến trúc, luồng hoạt động, DB schema hoặc API endpoints.
  - **KHÔNG** phụ thuộc vào các file tài liệu trung gian như `feature_done.md` (vì thông tin tài liệu có thể sai lệch hoặc chưa cập nhật so với code thực tế).
- **Phân tích ảnh hưởng chéo:** Kiểm tra xem các thay đổi có làm ảnh hưởng đến logic dùng chung (shared services, database connections, shared components) không.

## Bước 2: Xác định File Tài liệu Context cần cập nhật
- Đọc file gốc `.agents/AGENTS.md` (hoặc `AGENTS.md`), `.docs/ARCHITECTURE.md` và các file Index chính gồm [.docs/project-context-backend.md](file:///.docs/project-context-backend.md) và [.docs/project-context-frontend.md](file:///.docs/project-context-frontend.md).
- Xác định xem những thay đổi trong mã nguồn thuộc về phạm vi của file context con nào (ví dụ: `.docs/backend/data-models.md`, `.docs/backend/api-endpoints.md`, `.docs/frontend/state-signals.md`...).
- **Quy tắc:** Nếu đây là một module hoặc tính năng hoàn toàn mới chưa được ghi nhận trong các tài liệu hiện có, Agent phải tự động tạo một file `.md` mới trong thư mục tương ứng của `.docs/backend/` hoặc `.docs/frontend/`.

## Bước 3: Thực thi Cập nhật Tài liệu (Áp dụng tư duy Repo-Research)
- Cập nhật thông tin chi tiết vào các file context con tương ứng hoặc tạo mới. Đảm bảo cập nhật đủ: Luồng hoạt động, cấu trúc DB liên quan, API contracts, WebSockets, State/Signals, và bất kỳ quy tắc đặc thù mới nào.
- Nếu tạo file con mới, PHẢI cập nhật file Index tương ứng (`project-context-backend.md` hoặc `project-context-frontend.md`) để chèn liên kết đến file mới.
- Cập nhật [.docs/ARCHITECTURE.md](file:///.docs/ARCHITECTURE.md) nếu sự thay đổi ảnh hưởng đến kiến trúc tổng thể, mô hình dữ liệu lớn hoặc bổ sung thêm công nghệ/stack mới (ví dụ: tích hợp Temporal, RAG database mới).

## Bước 4: Tóm tắt & Báo cáo
- Cung cấp báo cáo ngắn gọn cho người dùng bao gồm:
  - Danh sách các tệp mã nguồn thực tế đã được phân tích.
  - Danh sách các tệp tài liệu trong thư mục `.docs/` đã được cập nhật hoặc tạo mới.
- Đánh dấu hoàn thành Workflow.