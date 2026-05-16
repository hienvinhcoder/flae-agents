---
name: code-api
description: Viết các API Endpoints dựa trên BACKEND_PLAN, kết nối trực tiếp với Database và TRỰC TIẾP TẠO FILE vật lý.
triggers:
  - "/code-api"
  - "viết api"
---

# NHIỆM VỤ: BACKEND DEVELOPER (API INTEGRATOR)

Khi nhận lệnh `/code-api [Đường dẫn file Backend Plan]`, bạn đóng vai trò là một Backend Developer thực thi. Nhiệm vụ của bạn là hiện thực hóa "Trụ cột 2: Giao kèo API" thành code thực tế có thể chạy được.

BẮT BUỘC thực hiện tuần tự các bước sau một cách im lặng:

## 1. NẠP NGỮ CẢNH "KIỀNG 3 CHÂN"
Để viết API không bị lỗi, BẠN BẮT BUỘC phải đọc 3 nguồn dữ liệu sau:
1. **`AGENTS.md`**: Xác định kiến trúc API (Ví dụ: Dùng FastAPI Router).
2. **File Backend Plan được truyền vào**: Để biết cần viết những API nào (POST, PUT, PATCH, DELETE), Payload ra sao. **LƯU Ý: KHÔNG VIẾT API GET**, Frontend sẽ tự động truy vấn trực tiếp từ Firestore.
3. **File Database Schema thực tế**: Để đảm bảo code gọi DB truy xuất đúng tên bảng, tên trường đã được `/code-db-firestore` tạo ra trước đó.

## 2. KỶ LUẬT VIẾT API (DEFENSIVE PROGRAMMING)
Khi sinh code, BẮT BUỘC áp dụng các lớp phòng thủ sau:
- **Xác thực đầu vào (Validation):** Tuyệt đối không tin tưởng dữ liệu từ Client. Bắt buộc sử dụng `Pydantic` (các class trong `app/schemas/`) để validate payload trước khi xử lý.
- **Xử lý lỗi (Error Handling):** Bắt buộc bọc mọi thao tác DB trong `try-except` (Python) và raise `HTTPException` từ FastAPI.
- **Mã trạng thái (Status Code):** Trả về HTTP Code chuẩn mực (200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Error).
- **Quy tắc Firedantic & Logging:** `firedantic` là **synchronous** (các hàm như `.save()`, `.get_by_doc_id()` KHÔNG dùng `await`). Tuyệt đối không dùng `print()`, bắt buộc dùng `get_logger(__name__)` từ `app.core.logger`.

## 3. THỰC THI GHI FILE (FILE EXECUTION)
- Dựa vào kiến trúc trong `AGENTS.md` và `.docs/project-context-backend.md`, lưu file Router vào thư mục `app/api/v1/...` và file Business Logic vào thư mục `app/services/...`. Các API phải nằm sau prefix `/api/v1`.
- TRỰC TIẾP TẠO MỚI HOẶC GHI ĐÈ file code vật lý vào dự án.
- Tự động import các model DB (`firedantic` từ `app/models/`), Pydantic schema (`app/schemas/`), và cấu hình dependency (như `Depends` từ FastAPI).

## 4. BÁO CÁO KẾT QUẢ
- Sau khi ghi file, in ra danh sách các Endpoints (hoặc Server Actions) vừa được tạo thành công kèm đường dẫn file vật lý tương ứng để người dùng kiểm tra.