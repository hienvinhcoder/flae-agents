# FRONTEND PLAN: Workspace Onboarding & Tenant Setup

## 1. Frontend Objective

Mục tiêu của frontend là cung cấp một luồng (flow) cho người dùng mới đăng nhập để thiết lập không gian làm việc (Workspace) đầu tiên của họ. Đây là điều kiện tiên quyết để người dùng có thể truy cập vào Dashboard.

Cần làm rõ:
- **Người dùng nhìn thấy gì?** Màn hình chọn phương thức khởi tạo Workspace: qua nền tảng có sẵn (Haravan, KiotViet) hoặc nhập tay thủ công.
- **Người dùng thao tác gì?** Chọn nền tảng, nhập domain cửa hàng (đối với Haravan), bấm kết nối để chuyển hướng OAuth. Hoặc điền form thông tin doanh nghiệp nếu tạo thủ công.
- **UI cần phản hồi thế nào?** Mượt mà với hệ thống "Green Growth", có hiệu ứng loading khi gọi API hoặc khi đang chuyển hướng (skeleton/spinner full screen).
- **Feature này xuất hiện ở màn hình/page nào?** Thuộc module `/onboarding`.
- **Feature này cần gọi API nào?** Các API từ `API_CONTRACT.md` (`/api/v1/workspaces/manual`, `/api/v1/workspaces/oauth/url`, `/api/v1/workspaces/oauth/callback`).
- **Có cần form/validation không?** Có, Angular Reactive Forms cho việc nhập thủ công và nhập shop domain.
- **Có cần loading/empty/error/success state không?** Có, đặc biệt là state loading khi xử lý OAuth callback và error khi ủy quyền thất bại.

---

## 2. Context Reviewed

Liệt kê các file đã đọc:
- `AGENTS.md`
- `docs/project-context-frontend.md`
- `docs/workspace-onboarding/IDEA.md`
- `docs/workspace-onboarding/BACKEND_PLAN.md`
- `docs/workspace-onboarding/API_CONTRACT.md`

### Frontend Project Context Summary
- **Frontend framework hiện tại:** Angular v20 (Standalone Components).
- **UI/component pattern hiện tại:** Dumb/Smart components phân tách rõ ràng.
- **Routing pattern:** Lazy-loaded routes bảo vệ bởi `authGuard`.
- **State management pattern:** Angular Signals (`signal`, `computed`, `effect`).
- **API service/client pattern:** Sử dụng HTTP Client. Theo Rule, frontend không dùng API GET lấy data mà query trực tiếp Firestore, nhưng ở case thay đổi state/khởi tạo như tạo Workspace thì dùng POST.
- **Form/validation pattern:** Angular Reactive Forms.
- **Styling/design system:** Tailwind CSS v4, "Green Growth" pattern (Glassmorphism, font Inter).
- **Coding rules quan trọng từ `AGENTS.md`:** Kích thước file tối đa 450 dòng, dùng Strict Typing, phân tách logic rạch ròi.

---

## 3. Existing Frontend Impact

Feature này ảnh hưởng đến phần frontend hiện tại như thế nào:
- **Existing pages/routes bị ảnh hưởng:** Route `/onboarding/create-workspace` hiện tại (thay thế placeholder/mock data bằng UI thật). Bổ sung thêm route callback.
- **Existing components bị ảnh hưởng:** `CreateWorkspaceComponent` hiện có cần được cấu trúc lại thành Smart Component, điều phối các UI components con.
- **Existing services/API clients bị ảnh hưởng:** Xóa bỏ `MockWorkspaceService`, thêm `WorkspaceApiService`.
- **Existing state/store bị ảnh hưởng:** Cần tạo `WorkspaceStore` để lưu thông tin tenant sau khi tạo.
- **Existing styles/design system bị ảnh hưởng:** Not affected (Tuân thủ Green Growth).
- **Existing tests bị ảnh hưởng:** Các bài test liên quan đến `MockWorkspaceService` sẽ cần cập nhật.

---

## 4. User Flow Plan

1. User đăng nhập xong, chưa có workspace -> Router điều hướng sang `/onboarding`.
2. Màn hình chọn: User thấy 3 lựa chọn "Tạo thủ công", "Haravan", "KiotViet".
3. **Nhánh A (Thủ công):**
   - User chọn "Tạo thủ công", form nhập liệu hiện ra.
   - User điền form (Tên, Ngành hàng, Website).
   - User submit -> Frontend validate, hiển thị loading spinner trên nút.
   - Gọi API `POST /api/v1/workspaces/manual`.
   - Thành công: Redirect sang `/dashboard`. Lỗi: Hiện thông báo dưới form.
4. **Nhánh B (OAuth - Nền tảng):**
   - User chọn nền tảng (VD: Haravan).
   - Nhập `shop_domain` (bắt buộc với Haravan).
   - User submit -> Gọi API `POST /api/v1/workspaces/oauth/url`.
   - Thành công: Frontend lưu tạm `shop_domain` vào `sessionStorage`, redirect (thay đổi `window.location.href`) sang `auth_url` từ Backend trả về.
   - Người dùng đăng nhập/ủy quyền ở Haravan xong, bị redirect trả về `/onboarding/oauth-callback?code=...`.
   - Router `/onboarding/oauth-callback` kích hoạt, lấy `code` từ URL và `shop_domain` từ `sessionStorage`.
   - Hiển thị Fullscreen Loading "Đang đồng bộ và thiết lập không gian làm việc...".
   - Gọi API `POST /api/v1/workspaces/oauth/callback`.
   - Thành công: Redirect `/dashboard`. Lỗi: Báo lỗi và cho phép quay lại bước 1.

---

## 5. Routes / Pages Plan

### Page: OnboardingContainerComponent
Path: `/onboarding/create-workspace` (Mặc định redirect từ `/onboarding`)
Purpose: Màn hình chính chứa các lựa chọn onboarding.
Access rule: `authGuard`
Main sections:
- Welcome Header.
- Platform Selection Cards.
- Dynamic Form Section (thay đổi theo platform được chọn).
User actions: Chọn platform, điền form, submit.
Data needed: Thông tin user từ `AuthStore` (để lấy tên hiển thị).
API calls: `createManualWorkspace()`, `getOauthUrl()`.
UI states:
- Loading: Đang gọi API tạo workspace thủ công hoặc lấy auth URL.
- Error: API báo lỗi.
- Success: Không cần thiết vì sẽ redirect thẳng.

### Page: OauthCallbackComponent
Path: `/onboarding/oauth-callback`
Purpose: Xử lý redirect từ nền tảng thứ ba, submit Auth code lên backend.
Access rule: `authGuard`
Main sections:
- Thông báo trạng thái (Loading/Error/Success) dạng toàn màn hình.
User actions: Bấm nút "Thử lại" nếu có lỗi.
Data needed: `code` từ Query Param, `platform` (từ route/storage).
API calls: `handleOauthCallback()`.
UI states:
- Loading: Trạng thái mặc định khi vừa vào page.
- Error: Token lỗi, từ chối ủy quyền.
- Success: Redirect `/dashboard`.

### Page: WorkspaceSelectionComponent
Path: `/workspaces`
Purpose: Trang hiển thị danh sách các workspace mà user có quyền truy cập, cho phép user chọn workspace để làm việc hoặc quản lý thông tin workspace.
Access rule: `authGuard`
Main sections:
- Danh sách (Grid/List) các Workspace (bao gồm tên, platform tích hợp, logo...).
- Nút "Tạo workspace mới" (dẫn về `/onboarding`).
UI states:
- Click vào một workspace -> Set `current_workspace_id` vào state và redirect sang `/dashboard`.

---

## 6. Components Plan

### Component: PlatformSelectorComponent
Purpose: Hiển thị các ô vuông chọn phương thức khởi tạo.
Type: Feature component
Props/Inputs: `selectedPlatform`
Events/Outputs: `platformSelect`
Internal state: Không
API dependency: Không
Reusable: No

### Component: ManualWorkspaceFormComponent
Purpose: Form cho nhánh tạo thủ công.
Type: Feature component
Props/Inputs: `isLoading`, `error`
Events/Outputs: `submitForm`
Internal state: Reactive Form
API dependency: Không
Reusable: No

### Component: OauthDomainFormComponent
Purpose: Form cho nhánh OAuth, cần nhập domain trước khi chuyển hướng.
Type: Feature component
Props/Inputs: `isLoading`, `error`, `platform`
Events/Outputs: `submitOauth`
Internal state: Reactive Form
API dependency: Không
Reusable: No

---

## 7. State Management Plan

- **Local component state:** Trạng thái form, platform đang chọn.
- **Global state/store:** Cần tạo `WorkspaceStore` để lưu trữ dữ liệu `Workspace` của người dùng.
- **Loading state:** Quản lý qua Signals nội bộ trong Component container.
- **Error state:** Quản lý qua Signals nội bộ, truyền xuống UI.

---

## 8. API Integration Plan

### API Usage: createManualWorkspace
Endpoint: `POST /api/v1/workspaces/manual`
Used by page/component: `OnboardingContainerComponent`
Request data: `{ name, industry, description, website }`
Response data: `WorkspaceResponse`
Loading behavior: Disable form, hiện spinner.
Success behavior: Lưu store, redirect.
Error behavior: Hiện error message màu đỏ.

### API Usage: getOauthUrl
Endpoint: `POST /api/v1/workspaces/oauth/url`
Used by page/component: `OnboardingContainerComponent`
Request data: `{ platform, shop_domain }`
Response data: `{ auth_url }`
Loading behavior: Disable form, hiện spinner.
Success behavior: Redirect sang domain bên thứ ba.
Error behavior: Hiện lỗi dưới ô nhập domain.

### API Usage: handleOauthCallback
Endpoint: `POST /api/v1/workspaces/oauth/callback`
Used by page/component: `OauthCallbackComponent`
Request data: `{ platform, code, shop_domain }`
Response data: `WorkspaceResponse`
Loading behavior: Full page loading UI.
Success behavior: Lưu store, redirect.
Error behavior: Cho nút retry hoặc back.

---

## 9. Form & Validation Plan

### Form: Manual Form
Fields:
| Field | Type | Required | Validation | Error Message |
|---|---|---|---|---|
| name | string | Yes | Validators.required, Validators.minLength(3) | Tên doanh nghiệp không hợp lệ |
| industry | string | No | - | - |
| description | string | No | Validators.maxLength(500) | Quá dài |
| website | string | No | Pattern matching URL | URL không hợp lệ |

Submit behavior: Gọi output `submitForm`.

### Form: Domain Form
Fields:
| Field | Type | Required | Validation | Error Message |
|---|---|---|---|---|
| shop_domain | string | Yes | Validators.required | Vui lòng nhập domain |

Submit behavior: Gọi output `submitOauth`.

---

## 10. UI States Plan

### Loading State
- Các button submit sử dụng CSS spinner.
- Oauth callback có màn hình Skeleton / Pulse animation mang lại cảm giác "Hệ thống AI đang setup".

### Error State
- Text màu đỏ, Tailwind class `text-red-500 text-sm mt-1`.
- Toast message (nếu hệ thống đã có toast service).

---

## 11. Responsive / Mobile Plan
- Desktop: Form nằm chính giữa, max-width giới hạn.
- Mobile: Full width, padding `px-4`. Flexbox đổi từ `flex-row` sang `flex-col` ở bộ chọn nền tảng.

---

## 12. Files Likely To Be Created or Modified

| File/Folder | Action | Reason |
|---|---|---|
| `src/app/core/models/workspace.model.ts` | Create | Định nghĩa interfaces |
| `src/app/core/services/api/workspace-api.service.ts` | Create | Client gọi 3 endpoint Backend |
| `src/app/core/stores/workspace.store.ts` | Create | Lưu `currentWorkspace` |
| `src/app/features/onboarding/onboarding.routes.ts` | Update | Chỉnh sửa route, thêm callback |
| `src/app/features/onboarding/pages/onboarding-container.component.ts` | Update | Logic điều hướng |
| `src/app/features/onboarding/pages/oauth-callback.component.ts` | Create | Trang bắt URL callback |
| `src/app/features/onboarding/components/...` | Create | Tách 3 file dumb components |
| `src/app/core/services/mock-workspace.service.ts` | Delete | Xóa mock không còn cần thiết |

---

## 13. Frontend Testing Plan

### Component Tests
- [ ] Test render và validation của `ManualWorkspaceFormComponent`.
- [ ] Test behavior của `PlatformSelectorComponent` khi emit event.

### Integration Tests
- [ ] Quá trình gọi API và redirect ở `OnboardingContainerComponent`.

### Manual QA Checklist
- [ ] User click back button khi ở trang OAuth của Haravan.
- [ ] Truy cập `/onboarding/oauth-callback` mà không có `code`.
- [ ] F5 (Reload) ở các màn hình có giữ được Auth state không.

---

## 14. Frontend Implementation Tasks

- [ ] **Task 1:** Tạo model `workspace.model.ts`, API service `workspace-api.service.ts` và loại bỏ `MockWorkspaceService`.
- [ ] **Task 2:** Tạo `WorkspaceStore` để quản lý state workspace hiện tại.
- [ ] **Task 3:** Cập nhật `onboarding.routes.ts` và tạo cấu trúc khung thư mục cho pages/components mới.
- [ ] **Task 4:** Xây dựng `PlatformSelectorComponent` (Dumb UI).
- [ ] **Task 5:** Xây dựng `ManualWorkspaceFormComponent` và `OauthDomainFormComponent` (Dumb Form UI với Validation).
- [ ] **Task 6:** Cập nhật `OnboardingContainerComponent` (Smart) để ghép API, form, và selector.
- [ ] **Task 7:** Tạo `OauthCallbackComponent` để xử lý code trả về từ OAuth redirect.

---

## 15. Risks & Open Questions

### Risks
- `sessionStorage` bị mất giữa các tab: Việc lưu `shop_domain` tạm thời ở Frontend bằng `sessionStorage` có thể gặp vấn đề nếu user thao tác OAuth làm mở tab mới rồi quay lại tab cũ. (Có thể dùng `localStorage` với thời gian hết hạn ngắn để an toàn hơn).

### Open Questions
Khi user reload trang (F5) ứng dụng, làm sao Frontend biết user thuộc Workspace nào để đưa vào trang `/dashboard` thay vì `/onboarding`?
- **Giải pháp:** Hệ thống sẽ có một trang riêng biệt (ví dụ: `/workspaces`) chuyên để chọn và quản lý các workspace. 
  - Khi user đăng nhập hoặc reload trang, Frontend sẽ kiểm tra danh sách workspace của user.
  - Nếu user **chưa có workspace** -> chuyển hướng vào `/onboarding`.
  - Nếu user **đã có workspace** -> chuyển hướng vào trang Quản lý/Chọn Workspace. User sẽ click chọn 1 workspace cụ thể, Frontend sẽ lưu `current_workspace_id` vào `LocalStorage` hoặc `State` rồi mới chuyển hướng vào `/dashboard`.
