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
* **Frontend (`frontend/`):** Angular, Tailwind CSS, TypeScript, RxJS (WebSockets).
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
* **Kiểm thử (Testing):** Bắt buộc viết unit test / integration test cho cả Frontend và Backend khi hoàn thành bất kỳ tính năng (feature) mới nào. Đảm bảo độ bao phủ test (coverage) luôn đạt **trên 75%**.

### 3.2. Frontend (Angular, Tailwind, TypeScript)
* **Kiến trúc Feature-Based Module:** Tổ chức thư mục theo cấu trúc `core/` → `shared/` → `features/`:
  * `core/`: Chứa **DUY NHẤT** các thành phần dùng chung toàn cục (guards, AdminLayout, PublicLayout, auth/workspace models dùng chung, auth/toast/API services, stores toàn cục). Không đặt model chuyên dụng của một feature vào đây trừ khi service trong core cần import nó.
  * `shared/`: Chứa các UI components "dumb" (button, badge, pipes) có thể tái sử dụng trên nhiều features khác nhau. Không chứa logic nghiệp vụ (business logic).
  * `features/`: Mỗi thư mục con đại diện cho **MỘT domain nghiệp vụ độc lập** (ví dụ: `auth/`, `knowledge/`, `settings/`, `agents/`, `inbox/`, `invite/`, `briefing/`, `reports/`). Tuyệt đối **KHÔNG** tạo "God Feature" (ví dụ: một thư mục `dashboard/` chứa tất cả các trang). Mỗi feature phải tự quản lý routes, pages và UI components riêng của mình.
* **Cấu trúc chi tiết của một Feature:**
  ```text
  features/<feature-name>/
  ├── pages/           ← Smart/Container components (chứa business logic, inject services)
  ├── ui/              ← Dumb/Presentational components (chỉ nhận dữ liệu qua input() và phát sự kiện qua output())
  ├── models/          ← (Tùy chọn) Models/interfaces dành riêng cho feature
  ├── services/        ← (Tùy chọn) Services dành riêng cho feature
  └── <feature>.routes.ts  ← Routes của feature, được lazy load
  ```
* **Routing:** `AdminLayoutComponent` đóng vai trò là layout wrapper và khai báo ở `app.routes.ts`. Mỗi feature có file `<feature>.routes.ts` riêng và được load qua `loadChildren` (Lazy Loading) từ `app.routes.ts`. Tuyệt đối **KHÔNG** gộp routes của nhiều features vào một file duy nhất.
* **Pattern Smart/Dumb Component:** Phân tách rõ ràng trách nhiệm:
  * UI components trong thư mục `ui/` phải là **Dumb/Presentational Components** (chỉ tương tác qua Angular Signals `input()` và `output()`, không chứa logic nghiệp vụ và không inject API/Services).
  * Logic nghiệp vụ, quản lý state và gọi API phải nằm ở **Smart/Container Components** trong thư mục `pages/` hoặc các Services.
* **Reactivity & State:** Áp dụng Angular Signals (`signal()`, `computed()`, `effect()`) và Signal-based `input()`/`output()` để quản lý state và tính phản ứng. Ưu tiên Signals hơn RxJS cho việc quản lý trạng thái ở cấp độ component.
* **Styling:** Sử dụng các class tiện ích của Tailwind CSS. Chỉ viết CSS tùy chỉnh khi thực sự cần thiết hoặc đóng gói thành component dùng chung.
* **Hiệu năng & Tài nguyên:** 
  * Áp dụng Lazy Loading cho tất cả các routes của feature.
  * Quản lý vòng đời chặt chẽ, luôn hủy đăng ký (unsubscribe) các RxJS subscription hoặc đóng kết nối WebSockets đúng cách khi component/service bị hủy (unmount) để tránh rò rỉ bộ nhớ (memory leak).

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
