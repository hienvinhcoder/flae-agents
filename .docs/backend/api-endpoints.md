# API Endpoints

Dưới đây là danh sách các Endpoint hiện có ở hệ thống. Các endpoint định nghĩa tại `app/api/v1/endpoints/`.

**Lưu ý quan trọng**: Backend KHÔNG TẠO API GET (nhằm tận dụng triệt để realtime listeners của Firestore trên Frontend).

| Method | Path | Request Schema | Response Schema | Mô tả |
|--------|------|---------------|-----------------|-------|
| `POST` | `/api/v1/auth/sync-user` | `UserSyncRequest` | `DataResponse[UserItemResponse]` | Upsert dữ liệu user từ Firebase Auth vào Firestore. |
| `POST` | `/api/v1/users` | `UserCreateRequest` | `DataResponse[UserItemResponse]` | Tạo user profile (201). |
| `PUT` | `/api/v1/users/{user_id}` | _(chưa implement)_ | `DataResponse[dict]` | Cập nhật user. |
| `DELETE`| `/api/v1/users/{user_id}` | — | `DataResponse[dict]` | Xoá user. |
| `POST` | `/api/v1/workspaces/manual`| `WorkspaceManualCreateRequest` | `DataResponse[WorkspaceItemResponse]` | Tạo workspace thủ công, seed dữ liệu và tự động cập nhật `current_workspace_id` cho user. |
| `POST` | `/api/v1/workspaces/oauth/url` | `OAuthUrlRequest` | `DataResponse[OAuthUrlResponse]` | Lấy URL OAuth để kết nối platform thứ 3. |
| `POST` | `/api/v1/workspaces/oauth/callback`| `OAuthCallbackRequest` | `DataResponse[WorkspaceItemResponse]` | Xử lý callback OAuth (tạo workspace & config, cập nhật `current_workspace_id`). |

> **Ghi chú Integration**: Các chức năng tích hợp nền tảng thứ 3 (OAuth URL và OAuth Callback) hiện tại đang được mock/giả lập để test luồng UX. Logic gọi API thực tế sẽ được triển khai vào các giai đoạn sau.
