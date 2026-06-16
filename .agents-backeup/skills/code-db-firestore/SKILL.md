---
name: code-db-firestore
description: Chuyển đổi Thiết kế Dữ liệu từ BACKEND_PLAN và TRỰC TIẾP TẠO FILE Schema Code thực tế (Firedantic/Pydantic/Firestore) tuân thủ kiến trúc của dự án.
triggers:
  - "/code-db-firestore"
  - "viết schema firestore"
---

# NHIỆM VỤ: DATABASE ARCHITECT & THỰC THI FILE (FIRESTORE)

Khi nhận lệnh `/code-db-firestore [Đường dẫn file Backend Plan]`, bạn đóng vai trò là một Database Architect cấp cao chuyên về Firestore và FastAPI. Nhiệm vụ của bạn là đọc "Trụ cột 1: Thiết kế Dữ liệu" trong bản kế hoạch và TRỰC TIẾP GHI RA FILE model vật lý trong dự án.

BẮT BUỘC thực hiện tuần tự và tuân thủ các quy tắc sắt đá sau:

## 1. NẠP NGỮ CẢNH & XÁC ĐỊNH VỊ TRÍ FILE
- Đọc file `AGENTS.md` để nắm rõ quy tắc Backend.
- Dự án sử dụng **Firestore (NoSQL)** kết hợp **Firedantic (Pydantic models cho Firestore)**.
- **[QUAN TRỌNG]:** File đích bắt buộc phải được tạo trong thư mục `backend/app/models/` với đuôi `.py` (Ví dụ: `backend/app/models/workspace.py`).

## 2. QUY TẮC ĐẶT TÊN VÀ KIỂU DỮ LIỆU (NAMING & TYPING)
- **Tên Model (Class):** PascalCase, số ít, kế thừa từ Pydantic BaseModel hoặc Firedantic Model tùy kiến trúc (VD: `class Workspace(Model):`).
- **Tên Collection:** Thường cấu hình thông qua class Meta hoặc biến `__collection__` trong model, sử dụng `snake_case` số nhiều.
- **Tên Trường (Fields):** Bắt buộc phải dùng `snake_case` chuẩn Python (VD: `created_at`, `total_price`). Tuyệt đối KHÔNG dùng camelCase.
- **Trường ID:** Trong Firestore/Firedantic, Document ID thường được quản lý tự động dưới dạng string. Nếu cần trỏ tới Document khác, hãy dùng ID dạng chuỗi (String).
- **Strict Typing:** Khai báo kiểu dữ liệu rõ ràng (Type Hints) của Pydantic/Python cho mọi trường.

## 3. THIẾT KẾ NoSQL & RÀNG BUỘC (NOSQL DESIGN)
- **Không có Foreign Key:** Trong Firestore, mô hình hóa quan hệ bằng cách lưu Reference ID (vd: `owner_uid: str`) hoặc sử dụng Map/Subcollections/Mảng (Arrays) nếu phù hợp với tư duy Document Database.
- **Hành vi xóa:** Không có tính năng Cascade Delete tự động của DB. Nếu cần xóa logic, hãy sử dụng cơ chế Soft Delete bằng cách thêm trường `deleted_at: Optional[datetime] = None` và gán giá trị mặc định.
- **Lazy Migration:** Cố gắng cung cấp giá trị mặc định (`default`) cho các trường bổ sung mới để tương thích ngược với dữ liệu cũ, hỗ trợ Lazy Migration theo chuẩn được quy định trong `AGENTS.md`.

## 4. THỰC THI GHI FILE (FILE EXECUTION - LỆNH BẮT BUỘC)
- BẠN BỊ CẤM chỉ in code ra màn hình chat.
- BẮT BUỘC phải thực hiện hành động **Tạo mới** hoặc **Ghi đè/Cập nhật (Patch)** đoạn code Firedantic Model vừa sinh ra vào đúng file vật lý trên hệ thống (VD: `backend/app/models/tên_file.py`).
- Tuyệt đối không làm hỏng cú pháp Python hoặc xóa các logic/method đã tồn tại (nếu file đã có).

## 5. BÁO CÁO KẾT QUẢ
- Sau khi ghi file thành công, in ra một thông báo ngắn: *"✅ Đã tạo/cập nhật thành công Firedantic Model vào file [Tên đường dẫn file]."*
- Giải thích ngắn gọn về cách các Model liên kết với nhau theo tư duy NoSQL để System Architect (Người dùng) xem xét.
