# FRONTEND PLAN: Authentication (Login & Register)

## 1. Frontend Objective

Mục tiêu của frontend là cung cấp luồng đăng nhập, đăng ký mượt mà, bảo mật cho chủ doanh nghiệp:
- Người dùng có thể đăng nhập hoặc đăng ký tài khoản nhanh chóng thông qua **Google Login** hoặc **Email/Password**.
- Sau khi xác thực thành công qua Firebase Auth, Frontend sẽ tự động gọi API backend `/api/v1/auth/sync-user` để đồng bộ dữ liệu.
- Quản lý trạng thái đăng nhập (session) và thông tin người dùng bằng Angular Signals.
- Hiển thị form đăng nhập/đăng ký với trải nghiệm thân thiện, áp dụng Design System "Green Growth" (sử dụng hiệu ứng Glassmorphism).
- *Lưu ý: Luồng khởi tạo Workspace và quản lý phân quyền Role đã được tách ra khỏi phạm vi của kế hoạch này theo yêu cầu.*

---

## 2. Context Reviewed

- `AGENTS.md`
- `docs/project-context-frontend.md`
- `docs/features/authentication/IDEA.md`
- `docs/features/authentication/BACKEND_PLAN.md`
- `docs/features/authentication/API_CONTRACT.md`

### Frontend Project Context Summary

- **Frontend framework hiện tại**: Angular (v20.3.x)
- **UI/component pattern hiện tại**: Standalone Components, tách biệt rõ giữa Smart Component (Container) và Dumb Component (Presentational).
- **Routing pattern**: Lazy Loading Modules / Routes.
- **State management pattern**: Angular Signals (signal, computed, effect).
- **API service/client pattern**: Firebase Auth SDK cho Client, gọi API Backend (chỉ dùng cho POST/PUT/DELETE) thông qua HttpClient.
- **Form/validation pattern**: Angular Reactive Forms.
- **Styling/design system**: Tailwind CSS v4, "Green Growth" design system (Glassmorphism).
- **Coding rules quan trọng từ `AGENTS.md`**: Sử dụng Signals, khai báo type strict (hạn chế `any`), ưu tiên test coverage > 75%, luôn cleanup subscription.

---

## 3. Existing Frontend Impact

- **Existing pages/routes bị ảnh hưởng**: Cần cấu hình route `/features/auth` (Login, Register).
- **Existing components bị ảnh hưởng**: Tạo mới hoàn toàn các components cho luồng Authentication.
- **Existing services/API clients bị ảnh hưởng**: Tạo mới `AuthService` (bọc Firebase) và `AuthApiService` (gọi Backend).
- **Existing state/store bị ảnh hưởng**: Tạo mới Global Signal Store (`AuthStore`) để lưu giữ `currentUser`.
- **Existing styles/design system bị ảnh hưởng**: Sử dụng thư viện tiện ích Tailwind CSS hiện có.
- **Existing tests bị ảnh hưởng nếu có**: Tương tự, cần thiết lập specs (unit tests) mới.

---

## 4. User Flow Plan

1. **User mở màn hình Xác thực**: Truy cập route `/auth/login` hoặc `/auth/register`.
2. **User nhìn thấy UI**: Form đăng nhập/đăng ký bằng Email/Password và nút "Tiếp tục với Google".
3. **User thao tác**:
   - Chọn "Tiếp tục với Google" để thực hiện đăng nhập SSO.
   - Hoặc điền form Email/Password và ấn "Đăng nhập" / "Đăng ký".
4. **Frontend validate**:
   - Form Email/Password: Kiểm tra format email hợp lệ, password không được trống (tối thiểu 6 ký tự).
5. **Frontend xử lý loading**: Nút submit hiển thị spinner và bị disabled để ngăn thao tác nhiều lần.
6. **Frontend xử lý Logic/API**:
   - Dùng SDK `@angular/fire/auth` để thực hiện xác thực Firebase.
   - Khi thành công, lấy Firebase JWT Token.
   - Gọi API Backend `POST /api/v1/auth/sync-user` gửi kèm thông tin profile (email, full_name, avatar_url, login_provider). Đính kèm Firebase JWT token trong header Authorization.
7. **Frontend xử lý success response**:
   - Cập nhật thông tin `currentUser` vào `AuthStore` Signal.
   - Điều hướng (Navigate) mượt mà vào màn hình Dashboard chính của ứng dụng.
8. **Frontend xử lý error response**:
   - Hiển thị thông báo Toast hoặc Inline Error màu đỏ tương ứng (Ví dụ: Sai mật khẩu, Email đã tồn tại).

---

## 5. Routes / Pages Plan

### Page: Auth Page Container

- **Path**: `/auth` (Có các children routes như `/auth/login`, `/auth/register`)
- **Purpose**: Đóng vai trò là Container Component (Smart Component) chứa logic và layout chung cho tính năng xác thực.
- **Access rule**: Chỉ dành cho khách (User chưa đăng nhập) - Cần có `GuestGuard`.
- **Main sections**: Layout chia đôi hoặc background full màn hình với form trung tâm dạng Glassmorphism.
- **User actions**: Điền form, bấm nút Google SSO, chuyển đổi giữa màn hình đăng nhập và đăng ký.
- **Data needed**: N/A
- **API calls**: 
  - Firebase: `signInWithPopup`, `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`.
  - Backend: `POST /api/v1/auth/sync-user`.
- **UI states**:
  - *Loading*: Nút bấm vô hiệu hóa kèm spinner icon.
  - *Empty*: Form mặc định chờ nhập.
  - *Error*: Lỗi màu đỏ bên dưới input hoặc báo lỗi hệ thống.
  - *Success*: Không cần popup thông báo, chuyển route thẳng.

---

## 6. Components Plan

### Component: AuthContainerComponent
- **Purpose**: Smart Component chứa logic tổng, quản lý API Calls, điều hướng, và giao diện layout nền.
- **Type**: Page-level component.
- **Props/Inputs**: None
- **Events/Outputs**: None
- **Internal state**: `loading` (Signal), `serverError` (Signal).
- **API dependency**: `AuthService`, `AuthApiService`, `AuthStore`.
- **Reusable**: No.

### Component: LoginFormComponent
- **Purpose**: Dumb Component hiển thị form đăng nhập Email/Password và Nút Google.
- **Type**: Feature component.
- **Props/Inputs**: `loading: boolean`, `error: string | null`.
- **Events/Outputs**: `onSubmitEmail(payload)`, `onSubmitGoogle()`.
- **Internal state**: Reactive Form (email, password).
- **API dependency**: None.
- **Reusable**: No.

### Component: RegisterFormComponent
- **Purpose**: Dumb Component hiển thị form đăng ký.
- **Type**: Feature component.
- **Props/Inputs**: `loading: boolean`, `error: string | null`.
- **Events/Outputs**: `onSubmitEmail(payload)`, `onSubmitGoogle()`.
- **Internal state**: Reactive Form (email, password, fullName).
- **API dependency**: None.
- **Reusable**: No.

---

## 7. State Management Plan

- **Local component state**: Quản lý Form validation và trạng thái Show/Hide mật khẩu tại các Dumb components.
- **Global state/store**: Khởi tạo `AuthStore` sử dụng Signals (`currentUser`, `isAuthenticated`).
- **Loading state**: Quản lý tại `AuthContainerComponent` (dùng signal `isLoading`).
- **Error state**: Truyền thông báo lỗi API từ Container xuống Dumb Component để render.
- **Reset/cleanup behavior**: Đặt lại các state lỗi khi thay đổi route. Dọn dẹp store khi Logout.

---

## 8. API Integration Plan

### API Usage: Firebase Authentication
- **Endpoint**: Phương thức từ SDK `@angular/fire/auth`.
- **Used by page/component**: `AuthContainerComponent` (qua Injectable `AuthService`).
- **Request data**: Email, Password.
- **Response data**: Thông tin UserCredential chứa JWT.
- **Loading behavior**: Kích hoạt Signal `isLoading() = true`.
- **Success behavior**: Nối tiếp gọi API `sync-user` Backend.
- **Error behavior**: Bắt exception (auth/wrong-password, auth/user-not-found) và dịch thành thông báo tiếng Việt.

### API Usage: Sync User
- **Endpoint**: `POST /api/v1/auth/sync-user`
- **Used by page/component**: `AuthContainerComponent` (qua Injectable `AuthApiService`).
- **Request Headers**: `Authorization: Bearer <firebase_jwt_token>`
- **Request data**: `{ email: string, full_name: string, avatar_url?: string, login_provider: "EMAIL_PASSWORD" | "GOOGLE" | "FACEBOOK" }`
- **Response data**: Object `User` từ Backend (`id`, `firebase_uid`, `email`, `full_name`, `avatar_url`, `is_active`).
- **Loading behavior**: Nằm trong luồng loading chung.
- **Success behavior**: Ghi vào `AuthStore` và chuyển hướng (router.navigate) sang dashboard.
- **Error behavior**: Cảnh báo lỗi đồng bộ dữ liệu. Tùy theo mức độ có thể force sign-out khỏi Firebase nếu không tạo được user db.

---

## 9. Form & Validation Plan

### Form: Login Form
- **Fields**:
  | Field | Type | Required | Validation | Error Message |
  |---|---|---|---|---|
  | email | email | Yes | Valid email format | "Email không hợp lệ" |
  | password | password | Yes | Min 6 chars | "Mật khẩu tối thiểu 6 ký tự" |
- **Submit behavior**: Emit output cho Smart Component.
- **Disabled behavior**: Vô hiệu hóa nút Submit nếu Form InValid hoặc `loading=true`.

### Form: Register Form
- **Fields**:
  | Field | Type | Required | Validation | Error Message |
  |---|---|---|---|---|
  | fullName | text | Yes | Min 2 chars | "Tên không hợp lệ" |
  | email | email | Yes | Valid email format | "Email không hợp lệ" |
  | password | password | Yes | Min 6 chars | "Mật khẩu tối thiểu 6 ký tự" |

---

## 10. UI States Plan

### Loading State
- Các trường Input bị vô hiệu hóa (disabled).
- Nút CTA chuyển sang trạng thái mờ (opacity) và xuất hiện vòng lặp loading (spinner).

### Error State
- Border input chuyển sang màu đỏ kèm text error bên dưới.
- Nếu là lỗi tổng quát (server error), hiển thị một dải thông báo màu đỏ (Alert) phía trên form.

### Success State
- Ứng dụng thực hiện chuyển route mượt mà (chuyển sang trang trong hệ thống).

---

## 11. Responsive / Mobile Plan

- **Desktop**: Form xác thực có thể được căn giữa màn hình hoặc lệch sang một bên, kết hợp với các mảng khối 3D hoặc dải gradient phía sau (theo Glassmorphism).
- **Tablet/Mobile**: Form giãn full bề ngang màn hình (padding viền). Giấu hoặc ẩn các yếu tố trang trí phức tạp để tiết kiệm diện tích.

---

## 12. Files Likely To Be Created or Modified

| File/Folder | Action | Reason |
|---|---|---|
| `src/app/features/auth/auth.routes.ts` | Create | Định nghĩa routes `login` và `register`. |
| `src/app/features/auth/pages/auth-container.component.ts` | Create | Smart Component điều phối chính. |
| `src/app/features/auth/components/login-form.component.ts` | Create | Dumb component form Đăng nhập. |
| `src/app/features/auth/components/register-form.component.ts` | Create | Dumb component form Đăng ký. |
| `src/app/core/models/auth.model.ts` | Create | Khai báo interface `User` và type `LoginProvider` từ API Contract. |
| `src/app/core/services/auth.service.ts` | Create | Tương tác Firebase Auth. |
| `src/app/core/services/api/auth-api.service.ts` | Create | Gọi API Backend `POST /sync-user`. |
| `src/app/core/stores/auth.store.ts` | Create | Cung cấp Global Signals state (currentUser). |
| `src/app/core/guards/guest.guard.ts` | Create | Chặn người dùng đã đăng nhập vào lại `/auth`. |
| `src/app/app.routes.ts` | Update | Load children module Auth. |

*(Lưu ý: Không thực hiện sửa đổi mã nguồn ở bước lập kế hoạch này)*

---

## 13. Frontend Testing Plan

### Component Tests
- [ ] Test render `LoginFormComponent` và validate required field.
- [ ] Test `RegisterFormComponent` emit form value chính xác khi submit.

### Integration Tests
- [ ] Test Smart Component `AuthContainerComponent` gọi đúng phương thức `signInWithEmailAndPassword` khi có event output.

### Manual QA Checklist
- [ ] Kiểm tra responsive trên Desktop và Mobile.
- [ ] Đăng nhập Google mượt mà không bị lỗi popup.

---

## 14. Frontend Implementation Tasks

- [x] **Task 1**: Khởi tạo thư mục tính năng `features/auth` với các file components trống và `auth.routes.ts`.
- [x] **Task 2**: Xây dựng UI cho 2 Dumb Component (`LoginFormComponent` và `RegisterFormComponent`) tích hợp Reactive Forms và Tailwind (Glassmorphism).
- [x] **Task 3**: Khai báo các model (`User`, `LoginProvider`) và triển khai Store quản lý state toàn cục (`AuthStore`) bằng Angular Signals.
- [x] **Task 4**: Triển khai `AuthService` bọc các hàm `@angular/fire/auth` (Email, Google) và lấy JWT token, triển khai `AuthApiService` bọc logic HTTP POST `/api/v1/auth/sync-user`.
- [x] **Task 5**: Triển khai logic luồng xử lý chính trong `AuthContainerComponent` để gắn kết Firebase và Sync Backend.
- [x] **Task 6**: Cấu hình `GuestGuard` (sử dụng `requireNoAuthGuard`), thêm vào router cấu trúc.

---

## 15. Risks & Open Questions

### Risks
- **Firebase Emulator Configuration**: Trong quá trình phát triển (Local), việc cấu hình `@angular/fire` hướng vào Emulator đôi khi không đồng bộ hoàn toàn với Backend nếu cả 2 không chỉ định chung Host/Port.

### Open Questions
- (Đã giải quyết) Luồng tạo Workspace được đưa ra feature sau. Vì vậy, người dùng đăng ký xong tạm thời chuyển tới một Dashboard rỗng chờ Onboarding sau. Không có vướng mắc nào cản trở trong phạm vi giới hạn này.
