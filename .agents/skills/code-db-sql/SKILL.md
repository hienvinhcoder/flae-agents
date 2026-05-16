---
name: code-db-sql
description: Chuyển đổi Thiết kế Dữ liệu từ BACKEND_PLAN và TRỰC TIẾP TẠO FILE Schema Code thực tế (Prisma/SQL/TypeORM) tuân thủ chuẩn Enterprise.
triggers:
  - "/code-db"
  - "viết schema"
---

# NHIỆM VỤ: DATABASE ADMINISTRATOR (DBA) & THỰC THI FILE

Khi nhận lệnh `/code-db [Đường dẫn file Backend Plan]`, bạn đóng vai trò là một Database Administrator cấp cao. Nhiệm vụ của bạn là đọc "Trụ cột 1: Thiết kế Dữ liệu" trong bản kế hoạch và TRỰC TIẾP GHI RA FILE vật lý trong dự án.

BẮT BUỘC thực hiện tuần tự và tuân thủ các quy tắc sắt đá sau:

## 1. NẠP NGỮ CẢNH & XÁC ĐỊNH VỊ TRÍ FILE
- Đọc file `AGENTS.md` để xác định ORM/Database đang dùng.
- **[QUAN TRỌNG]:** Tự động xác định đường dẫn lưu file chuẩn của công nghệ đó (Ví dụ: Nếu dùng Prisma, file đích bắt buộc là `prisma/schema.prisma`. Nếu dùng TypeORM, tạo file tại thư mục `src/entities/`).

## 2. QUY TẮC ĐẶT TÊN (NAMING CONVENTION)
- Tên Model: PascalCase, số ít (VD: `User`, `Product`).
- Tên Trường (Fields): camelCase (VD: `createdAt`, `totalPrice`).
- Trường ID: Bắt buộc phải có mặc định tự động sinh (VD: UUID hoặc Auto Increment).

## 3. RÀNG BUỘC & QUAN HỆ (RELATIONS & CONSTRAINTS)
- Mọi quan hệ 1-N hoặc N-N BẮT BUỘC phải định nghĩa rõ Khóa ngoại (Foreign Key).
- BẮT BUỘC xử lý hành vi xóa (On Delete): Dùng Soft Delete (`deletedAt`) cho dữ liệu quan trọng, và `Cascade` cho dữ liệu phụ thuộc.

## 4. TỐI ƯU HIỆU SUẤT (INDEXING)
- Tự động đánh Index (`@index`) cho các trường dùng để tìm kiếm, lọc.
- Đánh Unique Index cho các trường không được trùng lặp.

## 5. THỰC THI GHI FILE (FILE EXECUTION - LỆNH BẮT BUỘC)
- BẠN BỊ CẤM chỉ in code ra màn hình chat.
- BẮT BUỘC phải thực hiện hành động **Tạo mới** hoặc **Ghi đè/Cập nhật (Patch)** đoạn code Schema vừa sinh ra vào đúng file vật lý trên hệ thống (VD: `prisma/schema.prisma`).
- Tuyệt đối không làm hỏng hoặc xóa mất các model/bảng đã tồn tại trước đó trong file.

## 6. BÁO CÁO KẾT QUẢ
- Sau khi ghi file thành công, in ra một thông báo ngắn: *"✅ Đã cập nhật thành công thiết kế Database vào file [Tên đường dẫn file]."*
- Liệt kê ngắn gọn các Index và Relation mới được thêm vào để System Architect (Người dùng) xem xét.