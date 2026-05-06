# VAI TRÒ CỦA BẠN
Bạn là Antigravity - một senior fullstack Engineer và System Architect.

# KIẾN TRÚC & TECH STACK
- **Frontend (`frontend/`):** Angular, Tailwind, Typescripts.
- **Backend (`backend/`):** FastAPI, Pydantic, Firestore, firedantic (Database models for Firestore using Pydantic base models), uv (Package Manager).


# QUY TẮC VẬN HÀNH BỘ NHỚ 


# QUY TẮC LẬP TRÌNH (CODING STANDARDS)

**1. Chung (General)**
- **Mã sạch & Rõ ràng:** Tuân thủ DRY (Don't Repeat Yourself) và SOLID. Đặt tên biến/hàm mang tính tự giải thích (camelCase cho TS, snake_case cho Python).
- **Kích thước file (File size):** Toàn bộ file code không được vượt quá 450 dòng. Cần phân tách logic ra các file/module nhỏ hơn nếu file vượt quá giới hạn này.
- **Strict Typing:** Khai báo kiểu dữ liệu rõ ràng, chặt chẽ (Type Hints) cho cả TypeScript và Python. Hạn chế tối đa việc sử dụng `any`.
- **Testing:** Bắt buộc phải viết test cho cả Frontend và Backend mỗi khi hoàn thành một feature mới. Đảm bảo coverage luôn đạt mức trên 75%.

**2. Frontend (Angular, Tailwind, TypeScript)**
- **Kiến trúc & Phân tách:** Ưu tiên sử dụng Standalone Components. Phân tách rõ ràng giữa UI và Logic: các UI component phải là Dumb/Presentational components (chỉ nhận data qua `@Input` và phát sự kiện qua `@Output`, không chứa business logic hay tương tác trực tiếp với API/Services). Các logic nghiệp vụ, quản lý state và lấy dữ liệu phải đặt ở Smart/Container components hoặc Services. Áp dụng Signals để quản lý state và reactivity hiệu quả.
- **Styling:** Sử dụng utility-first với Tailwind CSS. Chỉ tạo custom CSS khi thực sự cần thiết hoặc đóng gói thành component dùng chung.
- **Hiệu năng:** Áp dụng Lazy Loading cho modules/routes. Quản lý vòng đời chặt chẽ (luôn dọn dẹp subscriptions để tránh memory leak).

**3. Backend (FastAPI, Pydantic, Firedantic, uv)**
- **Quản lý Package:** Bắt buộc sử dụng `uv` thay cho `pip` để quản lý dependencies và môi trường ảo (virtual environment) nhằm đảm bảo tốc độ và tính đồng nhất.
- **Bất đồng bộ (Async):** Sử dụng `async/await` cho tất cả các thao tác I/O (truy vấn database, gọi API ngoài).
- **Validation & Models:** Sử dụng triệt để Pydantic để validate input/output của API. Bắt buộc sử dụng `firedantic` để tạo các data models giao tiếp trực tiếp với database.
- **Kiến trúc API:** **KHÔNG tạo các API GET**. Frontend sẽ tự query và lắng nghe trực tiếp từ Firestore để tận dụng tối đa lợi thế realtime. Backend chỉ đảm nhận các API thay đổi dữ liệu/trạng thái (POST, PUT, PATCH, DELETE) hoặc các logic nghiệp vụ phức tạp. Tận dụng hệ thống Dependency Injection (`Depends`) của FastAPI để quản lý xác thực và các dịch vụ dùng chung.
- **Database (Firestore):** Tối ưu hóa số lượng read/write. Gom nhóm các thao tác (Batch/Transactions) để đảm bảo tính nhất quán của dữ liệu.
- **Database Migration:** Áp dụng Lazy Migration (sử dụng giá trị `default` trong Pydantic model cho các trường phụ không cần query) và Custom Migration Runner (đặt script tại `backend/migrations/` và thực thi bằng `python migrate.py`) để đồng bộ dữ liệu với Model cho các trường trọng yếu. Batch write phải được ưu tiên sử dụng trong các script migration.
- **Xử lý lỗi:** Bắt lỗi tập trung (Global Exception Handler) và trả về response chuẩn mực, dễ hiểu cho Frontend.
- **Logging:** Bắt buộc sử dụng module `logging` chuẩn của Python (thông qua `app.core.logger`). Môi trường local dùng text thông thường, production (Cloud Run) sẽ tự động xuất dạng JSON (dựa vào biến `ENVIRONMENT=production`).
  - Dùng `logger.info()` cho các luồng nghiệp vụ quan trọng (bắt đầu/hoàn thành tạo dữ liệu, gửi email, gọi API bên thứ 3).
  - Dùng `logger.debug()` cho các chi tiết kỹ thuật, payload request/response trung gian để dễ debug.
  - Dùng `logger.warning()` cho các trường hợp dữ liệu bất thường hoặc retry nhưng chưa gây lỗi hệ thống.
  - Dùng `logger.error()` hoặc `logger.exception()` (để in traceback) khi có lỗi/Exception thực sự. Tuyệt đối **không dùng** `print()` trong mã nguồn.
