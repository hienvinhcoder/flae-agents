---
trigger: always_on
---

# QUY TẮC PHÁT TRIỂN DỰ ÁN (RULES.MD)

Tài liệu này định nghĩa các quy tắc lập trình, kiến trúc hệ thống và tiêu chuẩn bảo mật cho dự án **FLAE Agents**. Mọi thành viên phát triển (bao gồm cả AI và Lập trình viên) bắt buộc phải tuân thủ nghiêm ngặt các hướng dẫn dưới đây.

---

## 1. VAI TRÒ & SỨ MỆNH
* **Vai trò:** Senior Fullstack Engineer & System Architect.
* **Nhiệm vụ:** Tập trung phát triển hệ thống **FLAE Agents** với chất lượng mã nguồn đạt chuẩn Enterprise, đảm bảo tính mở rộng, bảo mật và hiệu năng cao.

---

## 2. KIẾN TRÚC & TECH STACK
* **Frontend (`frontend/`):** React SPA, Vite, TypeScript strict mode, Tailwind CSS, React Router, TanStack Query, Zustand và Firebase.
* **Backend (`backend/`):** FastAPI, Pydantic, SQLAlchemy, Alembic, asyncpg, Redis, PostgreSQL.
* **Package Manager (Backend):** Sử dụng `uv` để quản lý các gói phụ thuộc và môi trường ảo.

---

## 3. QUY TẮC LẬP TRÌNH (CODING STANDARDS)

### 3.1. Quy tắc chung
* **Mã sạch & Rõ ràng:** Tuân thủ các nguyên lý **DRY** (Don't Repeat Yourself) và **SOLID**.
* **Quy ước đặt tên:**
  * TypeScript: Sử dụng `camelCase`.
  * Python: Sử dụng `snake_case`.
* **Kích thước File:** **Tối đa 450 dòng** cho mỗi file mã nguồn. Nếu vượt quá giới hạn này, bắt buộc phải phân tách logic sang các module/file nhỏ hơn.
* **Strict Typing:** Khai báo kiểu dữ liệu rõ ràng và chặt chẽ (Type Hints) cho cả TypeScript và Python. Hạn chế tối đa việc sử dụng kiểu `any`.
* **Kiểm thử (Testing):** Bắt buộc viết unit test / integration test cho cả Frontend và Backend khi hoàn thành bất kỳ tính năng (feature) mới nào. Đảm bảo độ bao phủ test (coverage) luôn đạt **tối thiểu 75%**.

### 3.2. Frontend (React, Vite, Tailwind, TypeScript)
* **Kiến trúc theo feature:** Mỗi domain nằm tại `src/features/<feature-name>/` và chỉ tạo các thư mục cần dùng trong tập chuẩn `routes/`, `pages/`, `ui/`, `api/`, `hooks/`, `schemas/`, `types/`. Không tạo feature tổng hợp chứa nhiều domain. Mã dùng chung đa feature nằm trong `src/shared/`; hạ tầng khởi động, providers và router cấp ứng dụng nằm trong `src/app/`.
* **React components:** Chỉ dùng functional components và hooks. Props, callback, dữ liệu route và kết quả API phải có kiểu tường minh; không dùng `any`. Mỗi file mã nguồn tối đa 450 dòng và phải tách theo trách nhiệm trước khi vượt giới hạn.
* **Ranh giới UI:** Component trong `shared/ui/` chỉ nhận typed props và phát callback; không gọi API, không đọc/ghi global store và không chứa business logic theo feature. Pages và feature hooks phối hợp dữ liệu, hành vi và UI.
* **Routing:** Route của feature phải lazy-load theo ranh giới feature. Public path là giao diện ổn định: không đổi, xóa hoặc tái sử dụng path đã phát hành nếu chưa có kế hoạch tương thích và test điều hướng.
* **Phân loại state:**
  * TanStack Query quản lý toàn bộ server state: fetch, cache, mutation, invalidation và trạng thái request.
  * Zustand chỉ dùng cho client state thực sự được chia sẻ giữa nhiều nhánh component hoặc route.
  * React local state là mặc định cho state chỉ thuộc một component hoặc một cây component gần nhau.
  * Tuyệt đối không sao chép query data từ TanStack Query vào Zustand.
* **Form:** Form không đơn giản (nhiều field, validation phụ thuộc, submit bất đồng bộ hoặc dùng lại schema) phải dùng React Hook Form kết hợp Zod. Schema là nguồn xác thực và suy luận kiểu duy nhất cho dữ liệu form.
* **API layer:** Mọi request đi qua API layer có typed request/response và chuẩn hóa lỗi. Component, page và shared UI không được gọi `fetch`, Axios hoặc SDK mạng trực tiếp.
* **Effects & tài nguyên:** Chỉ dùng `useEffect` để đồng bộ với hệ thống bên ngoài React như browser API, subscription, timer hoặc kết nối realtime; không dùng effect để suy ra state có thể tính trong render. Effect tạo subscription, listener, timer, request có thể hủy hoặc kết nối phải trả về cleanup tương ứng.
* **Testing:** Dùng Vitest và React Testing Library cho unit/integration tests, Playwright cho luồng end-to-end quan trọng. Test hành vi người dùng và accessibility thay vì implementation detail; coverage Frontend phải đạt tối thiểu 75%.
* **UI/UX & accessibility:** Tuân thủ [DESIGN.md](../../DESIGN.md), dùng semantic HTML trước ARIA, hỗ trợ đầy đủ keyboard, focus hiển thị rõ, `prefers-reduced-motion` và tương phản WCAG 2.2 AA. Không dùng màu làm tín hiệu duy nhất.
* **Design tokens:** Dùng Tailwind utilities và CSS variables từ `frontend/src/styles.css`. Không hardcode brand literal trong `.ts`/`.tsx`, không tạo token cục bộ thay thế token hệ thống và không override nội bộ shared primitive từ feature code.

### 3.3. Backend (FastAPI, Pydantic, SQLAlchemy, uv)
* **Quản lý Package:** Bắt buộc sử dụng `uv` thay cho `pip` để quản lý dependencies và môi trường ảo nhằm đảm bảo hiệu năng và tính nhất quán.
* **Bất đồng bộ (Async):** Sử dụng `async/await` cho tất cả các tác vụ liên quan đến I/O (truy vấn database qua `asyncpg`, gọi API bên ngoài, tương tác với Redis).
* **Kiến trúc 3 lớp (3-Layer Architecture):** Tuyệt đối tuân thủ phân tách logic: **`Endpoint -> Service -> Model`**.
  * Tầng API Endpoint (`app/api/`) chỉ chịu trách nhiệm nhận request, gọi Service tương ứng để xử lý và trả về response.
  * Mọi thao tác trực tiếp với Database (như gọi `db.execute`, `db.commit`, truy vấn SQLAlchemy, hoặc câu lệnh SQL thuần) **BẮT BUỘC** phải nằm ở tầng Service (`app/services/`). API Endpoint không được tự ý thực thi các logic truy vấn database trực tiếp.
* **Validation & DB Models:** Sử dụng Pydantic để kiểm tra và xác thực dữ liệu đầu vào/đầu ra của API. Sử dụng `SQLAlchemy` (với async sessions) để định nghĩa cấu trúc bảng và giao tiếp với cơ sở dữ liệu PostgreSQL.
* **Kiến trúc Realtime & Cache:**
  * Cần phân tích nghiệp vụ kỹ lưỡng để quyết định có nên sử dụng Redis Cache đối với các API GET nhằm giảm tải cho Database chính hay không.
  * Các dữ liệu cần cập nhật thời gian thực (realtime) như tin nhắn mới, trạng thái Agent phải được push qua **Redis Pub/Sub** và truyền tới Frontend thông qua **WebSockets API**.
* **Database (PostgreSQL):**
  * **Phân tách Database:** Hệ thống phân chia thành 3 database riêng biệt:
    1. `flae_db`: Lưu trữ dữ liệu chính của ứng dụng (metadata, thông tin người dùng, cấu hình tenant...).
    2. `flae_agent_state_db`: Lưu trữ trạng thái phiên làm việc (session state), checkpoint, lịch sử hội thoại của Agent (qua thư viện LangChain Persistent).
    3. `rag_db`: Cơ sở tri thức (knowledge base) của Agents.
  * **Thiết kế nâng cao:**
    * **Phân vùng bảng (Partition Table):** Chỉ áp dụng kỹ thuật phân vùng bảng theo Tenant ID đối với `rag_db` (bảng vector chunks, embeddings có lượng dữ liệu lớn). Tuyệt đối không áp dụng bừa bãi cho các bảng nhỏ hoặc database khác nhằm tránh phức tạp hóa quá trình migration bằng Alembic và làm giảm hiệu năng hệ thống.
    * **Row Level Security (RLS):** Bắt buộc cấu hình RLS trên PostgreSQL để cô lập và bảo mật dữ liệu tuyệt đối giữa các tenant/client ở mức cơ sở dữ liệu.
  * **Tối ưu hóa & Migrations:**
    * Sử dụng Index hợp lý trên SQLAlchemy cho các trường thường xuyên tìm kiếm.
    * Bắt buộc dùng **Alembic** để quản lý lịch sử thay đổi database. Mọi thay đổi cấu trúc bảng phải đi kèm script migration tương ứng (ví dụ: `uv run alembic revision --autogenerate`).
* **Xử lý lỗi:** Sử dụng cơ chế bắt lỗi tập trung (Global Exception Handler) để định dạng và trả về response chuẩn xác, thân thiện cho Frontend.
* **Logging:** Sử dụng module `logging` mặc định thông qua hàm `get_logger` từ `app.core.logger`. Môi trường local ghi log dạng text, môi trường production (Cloud Run) ghi log dạng JSON. Tuyệt đối **không sử dụng** hàm `print()` trong mã nguồn.

---

## 4. QUY TẮC BẢO MẬT & SAAS MULTI-TENANCY

* **Xác thực (Authentication):** Firebase Authentication là nền tảng quản lý định danh duy nhất. Frontend lấy JWT (ID Token) sau khi đăng nhập và gửi kèm theo tiêu đề `Authorization: Bearer <token>` trong mỗi API request cần bảo mật.
* **Kiểm soát quyền (Authorization):** Việc xác thực token và lấy thông tin người dùng ở Backend **BẮT BUỘC** sử dụng FastAPI Dependency Injection (tại `app/core/security.py`):
  * `Depends(verify_token)`: Chỉ kiểm tra tính hợp lệ của token.
  * `Depends(get_current_user_uid)`: Lấy nhanh `firebase_uid` mà không cần query DB.
  * `Depends(get_current_user)`: Load toàn bộ đối tượng User từ Database.
* **Đồng bộ thông tin người dùng:** Sau khi đăng nhập thành công qua Firebase trên Frontend, Frontend sẽ gọi API đồng bộ chuyên dụng (ví dụ: `POST /api/v1/auth/sync-user`) để lưu/cập nhật thông tin user vào cơ sở dữ liệu của Backend.
* **Bảo mật thông tin nhạy cảm:** Tuyệt đối không hardcode API Keys, JWT Secrets, Redis/DB Connection URIs trong code. Tất cả phải được quản lý thông qua biến môi trường (Environment Variables) và không được để lộ cấu hình bí mật của Backend cho Frontend.
* **Chống rò rỉ dữ liệu (Data Leakage):**
  * Rà soát chặt chẽ dữ liệu trả về thông qua Pydantic schema (kiểu `DataResponse[T]`).
  * Tuyệt đối không trả về các thông tin nhạy cảm như mật khẩu băm, token nội bộ hoặc chi tiết stack trace lỗi hệ thống (che giấu qua Global Exception Handler).
* **Logical Multi-tenancy:** Đảm bảo dữ liệu (đặc biệt là bộ nhớ AI và thông tin khách hàng) của các tenant/ SMB khác nhau được cô lập hoàn toàn trên cùng một hạ tầng thông qua sự kết hợp giữa phân vùng logic, Row Level Security (RLS) và Partition Table.

---

## 5. HƯỚNG DẪN REVIEW MÃ NGUỒN (REVIEW GUIDELINES)

* **Mức độ ưu tiên kiểm tra:** Tập trung phát hiện các lỗi liên quan đến tính đúng đắn (correctness), bảo mật (security) và hiệu năng (performance).
* **Kiểm thử bắt buộc:** Yêu cầu bổ sung test (flag missing tests) đối với các logic nghiệp vụ quan trọng (đây là yêu cầu có độ ưu tiên P1).
* **Kiểm tra định tuyến:** Đảm bảo mọi API route mới tạo đều được cấu hình các middleware xác thực (auth middleware) phù hợp.
* **Giới hạn nhận xét:** Tránh các comment vụn vặt (nitpick) về phong cách viết code trừ khi nó trực tiếp ảnh hưởng đến khả năng bảo trì (maintainability) của hệ thống.
* **Bảo mật dữ liệu cá nhân:** Tuyệt đối không ghi log các thông tin nhạy cảm (PII) như token, mật khẩu, email hoặc thông tin cá nhân của khách hàng.
