# API Communication & Firebase

Dự án FLAE có sự phân tách rõ ràng trách nhiệm luồng dữ liệu (Data Flow) giữa Frontend (Angular) và Backend (FastAPI).

## 1. Nguyên lý: "Không sử dụng API GET"
- Thay vì Frontend gửi request GET lên Backend và nhận lại JSON, Frontend sẽ sử dụng Firebase SDK (`@angular/fire`) để **kết nối, đọc và lắng nghe dữ liệu trực tiếp** từ Firestore theo thời gian thực (realtime).
- Cấu trúc kiến trúc này giúp Frontend phản ứng tức thì (reactivity) khi dữ liệu trên Database thay đổi mà không cần tải lại trang hay gọi lại HTTP endpoint.

## 2. Data Mutations thông qua FastAPI Backend
- Backend (FastAPI) nhận trách nhiệm quản lý các tương tác thay đổi trạng thái và xác minh quyền lợi (Mutations: POST, PUT, PATCH, DELETE).
- Đối với những logic phức tạp, cần kiểm tra sâu logic phía server hoặc thay đổi hàng loạt dữ liệu, Frontend gửi API thông thường qua `HttpClient`.
- Các file cấu hình gọi Backend (API Services) được để tại `src/app/core/services/api/`.

## 3. Xác thực (Authentication) HTTP Interceptor
- Mọi request HTTP gửi lên Backend cần phải mang Token xác thực hợp lệ.
- Frontend AuthInterceptor tự động gọi lấy `getIdToken()` của Firebase Auth.
- Gắn token đó vào header `Authorization: Bearer <token>` trước khi chuyển request đi.
- Backend FastAPI sẽ xử lý giải mã JWT token này để phân biệt người dùng.
