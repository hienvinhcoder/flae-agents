# Frontend Plan: Authentication & Workspace (FLAE Agent)

Tài liệu này trình bày chi tiết kế hoạch kiến trúc và phát triển Frontend cho luồng Xác thực (Authentication) và Không gian làm việc (Workspace) của hệ thống FLAE Agent. Kế hoạch dựa trên tài liệu `docs/authentication/IDEA.md` và tuân thủ các nguyên tắc thiết kế tại `docs/DESIGN.md` cùng quy chuẩn lập trình `AGENTS.md`.

Do yêu cầu hiện tại, toàn bộ luồng sẽ **sử dụng Mock Data** hoàn toàn, không liên kết thực tế với Firebase hay Backend API.

## 1. Kiến trúc & Công nghệ

- **Framework:** Angular 18+ (Standalone Components).
- **Quản lý State:** Sử dụng toàn bộ **Angular Signals** (`signal`, `computed`, `effect`) cho state cục bộ và toàn cục (không dùng RxJS). Các tác vụ giả lập mạng (network delay) có độ trễ 500-1000ms.
- **Biểu mẫu (Forms):** Sử dụng **Signal Forms** (quản lý form bằng Signals).
- **Animations:** Sử dụng **Tailwind CSS thuần** (qua các utility classes như `animate-fade`, `transition-all`) để tạo hiệu ứng chuyển cảnh mượt mà giữa các bước của màn hình Onboarding, loại bỏ hoàn toàn `@angular/animations` để tối ưu hiệu năng.
- **Mô hình Component:** Áp dụng triệt để Smart - Dumb Components.

## 2. Dữ liệu giả định & Core Services

### `core/services/mock-auth.service.ts`
- Service giả lập quá trình đăng nhập.
- Quản lý session bằng `currentUser = signal<MockUser | null>(null)`.
- Các hàm async: `loginWithGoogle()`, `loginWithEmail()`, `logout()`.

### `core/services/mock-workspace.service.ts`
- Cung cấp dữ liệu các workspace và kiểm tra trạng thái lời mời tham gia.
- Giả lập việc tạo một Workspace mới (`createWorkspace()`) và lưu vào state tạm thời.

### `core/guards/auth.guard.ts`
- Functional Router Guard kiểm tra quyền truy cập. Nếu `MockAuthService.currentUser()` là null, chuyển hướng về `/auth/login`.

## 3. Module Xác thực (Auth Feature)

Thư mục: `features/auth/`

### `login.component.ts` (Smart)
- Trang Đăng nhập/Đăng ký chính. Lắng nghe sự kiện từ `auth-form`, gọi service giả lập, xử lý hiển thị Loading và báo lỗi.
- Bố cục: Nền màu `Mint White`, card màu trắng mờ với hiệu ứng Glassmorphism.

### `components/auth-form.component.ts` (Dumb)
- UI biểu mẫu sử dụng **Signal Forms**. Bao gồm Nút "Đăng nhập Google" (SVG icon), Form điền Email & Mật khẩu. 
- Validation cơ bản (Email hợp lệ, Mật khẩu > 6 ký tự). Nút bấm màu `Fresh Green`.

## 4. Module Khởi tạo Workspace (Onboarding Feature)

Thư mục: `features/onboarding/`

### `create-workspace.component.ts` (Smart)
- Hiển thị khi người dùng đăng nhập nhưng hệ thống báo chưa có Workspace.
- Trình bày dạng Wizard (Step-by-step) có sử dụng Tailwind CSS Animations (`animate-fade-in-up`):
  - **Step 1:** Form nhập Tên doanh nghiệp & Dropdown Ngành hàng.
  - **Step 2:** Cấu hình thành công & Khởi tạo dữ liệu mẫu.
- Áp dụng Glassmorphism Card theo chuẩn `ui-ux-pro-max`.

### `accept-invite.component.ts` (Smart)
- Giao diện giả lập khi người dùng vào từ một link mời (Invite Link). 
- Hiển thị thẻ Card: "Bạn được mời tham gia Workspace [Tên Công Ty] với vai trò [Admin]". Kèm nút "Chấp nhận" hoặc "Từ chối".

## 5. Triển khai Giao diện & Design System
- **Colors:**
  - Background: `#F3FBF7`
  - Text & Headings: `#062E24`
  - CTA/Primary Action: `#00C27A`
  - Effects/Glow: `#B9FF3B`
- **Typography:** `Plus Jakarta Sans` cho Heading và `Inter` cho Body text.
- **Glassmorphism Card:** `bg-white/80 backdrop-blur-md rounded-2xl shadow-[0_4px_20px_rgba(6,46,36,0.05)] border border-white/20`.
- **Icons:** Tích hợp SVG nguyên bản (Lucide/Heroicons), tuyệt đối không dùng Emoji.
