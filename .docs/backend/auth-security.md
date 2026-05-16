# Auth & Security

Hệ thống sử dụng **Firebase Authentication** và xác thực JWT token thông qua FastAPI Dependency Injection.

## Luồng Xác thực
1. **Frontend**: Client đăng nhập bằng Firebase Auth SDK.
2. **Frontend**: Lấy ID Token (JWT) từ Firebase.
3. **Frontend**: Gửi request kèm Header: `Authorization: Bearer <Firebase ID Token>`.
4. **Backend**: Middleware/Dependency `verify_token` sử dụng Firebase Admin SDK (`auth.verify_id_token`) để kiểm tra tính hợp lệ của token.

## Security Dependencies (`app/core/security.py`)

Tùy theo yêu cầu của endpoint, sử dụng một trong các dependencies sau:

| Depends | Returns | Sử dụng khi nào |
|---------|---------|-----------------|
| `verify_token` | `dict` (decoded JWT payload) | Chỉ cần kiểm tra request có token hợp lệ hay không. |
| `get_current_user_uid` | `str` (firebase_uid) | Cần lấy User ID hiện tại để gán data/quyền hạn (nhanh, không hit Database). |
| `get_current_user` | `User` (Firestore model object) | Cần sử dụng toàn bộ thông tin User model. Sẽ tự động query từ Database, ném lỗi 401 nếu User không tồn tại ở DB. |

## Sync User
Do hệ thống Frontend và Firebase xử lý Auth độc lập, có một endpoint chuyên dụng:
- `POST /api/v1/auth/sync-user`: Frontend gọi sau khi đăng nhập thành công qua Firebase để Backend đồng bộ hóa thông tin user vào bảng `users` trong Firestore.
