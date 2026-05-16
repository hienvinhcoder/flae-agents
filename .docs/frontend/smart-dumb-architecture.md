# Smart/Dumb Component Architecture

Hệ thống frontend của FLAE Agents áp dụng triệt để kiến trúc Smart & Dumb Components nhằm phân tách rõ ràng giữa việc hiển thị UI và xử lý business logic, giúp code dễ test, dễ bảo trì và tái sử dụng.

## 1. Dumb Components (Presentational)
- **Nhiệm vụ**: Chỉ chịu trách nhiệm hiển thị giao diện UI dựa trên dữ liệu đầu vào.
- **Quy tắc**:
  - Nhận dữ liệu qua Signal Inputs (`input()`).
  - Giao tiếp với bên ngoài (gửi sự kiện) qua Outputs (`output()`).
  - KHÔNG inject các Services, KHÔNG chứa business logic, KHÔNG tương tác trực tiếp với API hay Router.
  - Tối ưu hiệu năng thông qua cách tiếp cận reactive tự nhiên của Angular Signals.

## 2. Smart Components (Container)
- **Nhiệm vụ**: Là nơi điều phối state, xử lý logic, và kết nối các Dumb component.
- **Quy tắc**:
  - Được phép inject các Services (ví dụ: AuthService, API Services).
  - Quản lý state bằng Signals (`signal()`, `computed()`).
  - Sử dụng `effect()` để phản hồi lại các thay đổi state hoặc gọi API.
  - Xử lý các logic nghiệp vụ phức tạp, điều hướng router, truyền dữ liệu xuống Dumb component và lắng nghe các event từ chúng.
