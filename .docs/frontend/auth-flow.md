# Authentication Flow

Hệ thống xác thực của frontend kết hợp giữa Firebase Auth và token sync với backend.

## 1. Init Flow
1. **APP_INITIALIZER**: `AuthInitializerService.initialize()` chạy đầu tiên trước khi router resolve bất kỳ route nào.
2. `authState(firebase).pipe(first())` emit trạng thái: 
   - Nếu có session hiện tại: gọi `getIdToken()` → gửi `POST /api/v1/auth/sync-user` tới backend để sync.
   - Sau đó cập nhật `AuthStore.setCurrentUser()`.
3. `AuthStore.setAuthReady(true)` → Guards được phép chạy và router quyết định điều hướng.

## 2. Trạng thái theo dõi liên tục
- `_watchAuthStateChanges()` chạy ngầm liên tục:
  - Reset store (`setCurrentUser(null)`) khi Firebase emit `null` (ví dụ do token bị thu hồi hoặc người dùng logout).
  - Sync lại với backend khi phát hiện người dùng đăng nhập mới.

## 3. Login Flow
- Sau khi gọi `signIn()` (qua Email/Password hoặc Google SSO):
  - Firebase emit sự kiện `authState`.
  - Hàm `_watchAuthStateChanges` detect được trạng thái mới → lấy token và gọi API sync backend.
  - Cập nhật `AuthStore.setCurrentUser()`.
  - `effect()` trong `AuthContainerComponent` (hoặc nơi gọi login) bắt sự kiện current user đã sẵn sàng và thực hiện lệnh navigate.
