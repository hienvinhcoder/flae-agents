# Frontend Plan: Workspace Onboarding

## 1. Phân định Component (Smart/Dumb)

### Smart/Container Components (`features/workspace-onboarding/`)
- **`WorkspaceOnboardingComponent` (Route: `/onboarding`)**: Quản lý state luồng onboarding (hiển thị giao diện chọn phương thức, form thủ công, hoặc trạng thái loading khi đang đợi OAuth callback).
  - **State (Signals)**: 
    - `step`: `signal<'select' | 'manual' | 'oauth-loading'>`
    - `isSubmitting`: `signal<boolean>`

### UI/Dumb Components (`shared/ui/`)
- **`OptionCardComponent`**: Thẻ hiển thị các tùy chọn (Tạo thủ công hoặc nền tảng). Sử dụng `input()` cho title, description, icon; và `output()` để phát sự kiện khi click.
- **`SyncStatusBannerComponent`**: Global banner hiển thị thông báo hệ thống đang tiến hành đồng bộ dữ liệu ngầm. Có thể nhúng vào `AdminLayout`.

## 2. Quản lý State & Dữ liệu (Signals & Services)

- **`WorkspaceStore` (SignalStore/Service)**:
  - Bổ sung state: `currentWorkspace: signal<Workspace | null>`, `isSyncing: signal<boolean>`.
  - Cập nhật state `isSyncing` theo thời gian thực (realtime) thông qua sự kiện nhận được từ WebSockets.

- **`WorkspaceApiService`**:
  - `createManualWorkspace(payload: { name: string, industry: string })` -> Thực hiện POST tới `/api/v1/workspaces/manual`.
  - `handleOAuthCallback(provider: string, code: string)` -> Thực hiện POST tới `/api/v1/workspaces/oauth`.

## 3. Xử lý Logic Bất đồng bộ & Routing (Initial Sync Latency)
- Khi User chọn OAuth (Ví dụ: Haravan/KiotViet), hệ thống redirect sang trang cấp quyền bên thứ 3.
- Sau khi được cấp quyền, hệ thống bên thứ 3 redirect trả về Frontend tại route `/onboarding/oauth/callback?code=...`
- Component bắt được `code` từ URL và gọi `handleOAuthCallback()`.
- Nhờ chiến lược **Optimistic Redirect**, Backend sẽ phản hồi HTTP 200 OK ngay lập tức (dù dữ liệu còn đang kéo ngầm). Khi nhận HTTP 200:
  1. Frontend lưu lại `currentWorkspace` và đặt cờ `isSyncing.set(true)`.
  2. Router navigate ngay lập tức vào Admin Panel (`/admin/dashboard`).
  3. Tại `AdminLayout`, `SyncStatusBannerComponent` sẽ tự động hiện lên (do observe từ `isSyncing()`).
  4. Ngầm lắng nghe kết nối WebSockets. Khi có sự kiện `WORKSPACE_SYNC_COMPLETED`, hệ thống cập nhật `isSyncing.set(false)`, Banner biến mất và UI tự động trigger việc reload lại dữ liệu Dashboard (nếu cần).
