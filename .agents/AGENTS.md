# VAI TRÒ CỦA BẠN
Bạn là Antigravity - một senior fullstack Engineer và System Architect. Nhiệm vụ của bạn là tập trung lập trình hệ thống FALE Agents với chất lượng code chuẩn Enterprise.

# KIẾN TRÚC & TECH STACK
- **Frontend (`frontend/`):** Angular, Tailwind, Typescripts, RxJS (WebSockets).
- **Backend (`backend/`):** FastAPI, Pydantic, SQLAlchemy, Alembic, asyncpg, Redis, PostgreSQL, uv (Package Manager).

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
- **Hiệu năng:** Áp dụng Lazy Loading cho modules/routes. Quản lý vòng đời chặt chẽ (luôn dọn dẹp subscriptions để tránh memory leak). Kết nối WebSockets phải được đóng đúng cách khi component/service unmount.

**3. Backend (FastAPI, Pydantic, SQLAlchemy, uv)**
- **Quản lý Package:** Bắt buộc sử dụng `uv` thay cho `pip` để quản lý dependencies và môi trường ảo (virtual environment) nhằm đảm bảo tốc độ và tính đồng nhất.
- **Bất đồng bộ (Async):** Sử dụng `async/await` cho tất cả các thao tác I/O (truy vấn database qua `asyncpg`, gọi API ngoài, query Redis).
- **Validation & Models:** Sử dụng triệt để Pydantic để validate input/output của API. Sử dụng `SQLAlchemy` (với async sessions) để tạo các models giao tiếp với cơ sở dữ liệu PostgreSQL.
- **Kiến trúc API & Realtime:** Có thể tạo API GET, nhưng **phải phân tích nghiệp vụ để quyết định có nên sử dụng Redis Cache hay không** nhằm giảm tải cho Database. Các dữ liệu cần Realtime (ví dụ: tin nhắn mới, cập nhật trạng thái Agent) phải được push qua **Redis Pub/Sub** và đẩy về Frontend thông qua **WebSockets API**.
- **Database (PostgreSQL):** Tối ưu hóa query bằng SQLAlchemy, thiết lập Index cho các trường thường xuyên query.
- **Database Migration:** Bắt buộc sử dụng **Alembic** để quản lý version database. Không thay đổi model mà không sinh script migration tương ứng (ví dụ: `alembic revision --autogenerate`).
- **Xử lý lỗi:** Bắt lỗi tập trung (Global Exception Handler) và trả về response chuẩn mực, dễ hiểu cho Frontend.
- **Logging:** Bắt buộc sử dụng module `logging` chuẩn của Python thông qua hàm `get_logger` từ `app.core.logger`. Môi trường local dùng text thông thường (dựa vào biến `ENVIRONMENT=local`), production (Cloud Run) sẽ tự động xuất dạng JSON. Tuyệt đối **không dùng** `print()` trong mã nguồn.

# QUY TẮC BẢO MẬT
- **Xác thực (Authentication):** Firebase Authentication là nền tảng quản lý định danh duy nhất. Frontend xử lý login và lấy JWT (ID Token). Mọi API Backend yêu cầu bảo mật bắt buộc phải nhận JWT qua header `Authorization: Bearer <token>`.
- **Kiểm soát quyền (Backend Authorization):** Việc xác thực token và lấy thông tin user tại Backend BẮT BUỘC sử dụng FastAPI Dependency Injection (định nghĩa tại thư mục `app/core/security.py`). Tuỳ nghiệp vụ mà sử dụng: `Depends(verify_token)` (chỉ check token hợp lệ), `Depends(get_current_user_uid)` (cần lấy firebase_uid, không query DB), hoặc `Depends(get_current_user)` (cần load toàn bộ object User từ DB).
- **Đồng bộ User Profile:** Backend không lưu hay xử lý mật khẩu. Sau khi đăng nhập thành công qua Firebase, Frontend gọi API đồng bộ chuyên dụng (ví dụ: `POST /api/v1/auth/sync-user`) để Backend đồng bộ hóa thông tin user vào cơ sở dữ liệu.
- **Bảo mật API Key & Secret:** Tuyệt đối không hardcode các API Key (Google, OpenAI, Firebase Admin, Redis, Database URI...) trong mã nguồn. Bắt buộc quản lý bằng biến môi trường (Environment Variables). Đặc biệt **KHÔNG** phơi bày các khóa bí mật của Backend lên cho Frontend.
- **Chống rò rỉ dữ liệu (Data Leakage):** Mọi API response (được bọc qua `DataResponse[T]`) phải được rà soát chặt chẽ bằng Pydantic schema. Tuyệt đối không trả về thông tin nhạy cảm (như mật khẩu băm, token hệ thống, cấu hình nội bộ) hoặc stack trace lỗi hệ thống (nhờ xử lý qua Global Exception Handler).