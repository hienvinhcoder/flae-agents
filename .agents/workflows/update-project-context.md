---
description: Tự động phân tích code vừa thay đổi và cập nhật các file tài liệu context (Index & Detail) để giữ cho hệ thống luôn đồng bộ.
---

# MỤC TIÊU
Đảm bảo các file tài liệu trong thư mục `docs/` luôn phản ánh đúng 100% logic, kiến trúc và trạng thái của source code thực tế.

# QUY TRÌNH THỰC HIỆN

Agent cần thực hiện nghiêm ngặt các bước sau mà không cần hỏi lại Human, trừ khi gặp kiến trúc xung đột:

## Bước 1: Đọc cầu nối bộ nhớ (Feature Done)
- Tìm và đọc file `feature_done.md` nằm bên trong thư mục của feature vừa thực thi (Ví dụ: `.docs/features/[tên]/feature_done.md`).
- Phân tích các thay đổi về Ngữ nghĩa, Kiến trúc, DB Schema được tóm tắt trong file này. (Chỉ dùng tool đọc mã nguồn trực tiếp nếu thông tin trong file chưa đủ rõ ràng).
- **Phân tích ảnh hưởng chéo:** Kiểm tra xem thay đổi có ảnh hưởng đến logic dùng chung không. Nếu có, tự động kích hoạt skill `context-impact-analyzer` để cập nhật cảnh báo lan truyền cho các feature cũ.

## Bước 2: Xác định File Context mục tiêu
- Đọc file gốc `AGENTS.md`, `ARCHITECTURE.md` và các file Index (`docs/project-context-backend.md` hoặc `docs/project-context-frontend.md`).
- Dựa trên Index, xác định xem module vừa code thuộc về file context con nào (ví dụ: `.docs/backend/error-handling.md`, `.docs/frontend/auth.md`...).
- **Quy tắc:** Nếu là tính năng hoàn toàn mới và chưa có file doc, Agent phải tự động tạo một file `.md` mới trong thư mục tương ứng.

## Bước 3: Thực thi cập nhật (Update)
- Sử dụng tool chỉnh sửa file để cập nhật nội dung mới vào file context con tương ứng.
- Phải đảm bảo cập nhật đủ: Luồng hoạt động, cấu trúc DB liên quan, State/Signals (nếu có), và bất kỳ Rule cục bộ nào mới phát sinh.
- Nếu tạo file con mới, PHẢI cập nhật file Index (`project-context-*.md`) để chèn đường dẫn (link) đến file mới tạo.

## Bước 4: Tóm tắt & Báo cáo
- Hiển thị cho Human một danh sách ngắn gọn các file tài liệu đã được cập nhật.
- Đánh dấu hoàn thành Workflow.