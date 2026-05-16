# Data Models & Database

Sử dụng `firedantic` (Pydantic-based Firestore models) để giao tiếp với Firestore. Các models đặt tại `app/models/`.

## BaseModel (`app/models/base.py`)
- Kế thừa `firedantic.Model`. 
- **Fields chung**: `id: Optional[str]`, `created_at`, `updated_at`.
- `id=None` → Firestore auto-generate ID.
- `id=<value>` → Dùng custom document ID.

## 1. User (`users` collection)
- **Fields**: 
  - `firebase_uid: str`
  - `email: EmailStr`
  - `full_name: str`
  - `is_active: bool = True`
  - `login_providers: list[LoginProvider] = []`
  - `avatar_url: Optional[str]`
  - `current_workspace_id: Optional[str]` (Lưu ID của workspace người dùng đang truy cập hiện tại)
- **LoginProvider enum**: `"email_password"`, `"google"`, `"facebook"`
- **Lưu ý ID**: Document ID = `firebase_uid`. Tạo user bằng cách: `User(id=firebase_uid, firebase_uid=firebase_uid, ...)`.
- **Truy vấn**: `User.get_by_doc_id(firebase_uid)` → raise `ModelNotFoundError` nếu không tồn tại.

## 2. Workspace (`workspaces` collection)
- **Fields**: 
  - `name: str`
  - `industry: Optional[str]`
  - `description: Optional[str]`
  - `website: Optional[str]`
  - `platform: PlatformEnum`
  - `platform_store_id: Optional[str]`
  - `owner_uid: str`
  - `admins: Dict[str, bool]` (Map lưu trữ theo định dạng `uid: true` để query quyền admin)
  - `members: Dict[str, bool]` (Map lưu trữ quyền member)
- **Chức năng Phân quyền (RBAC)**: Thay vì sử dụng bảng phụ, Workspace sử dụng Embedded Dictionary `admins` và `members` để kiểm soát quyền. Việc kiểm tra quyền chỉ đơn giản thông qua `.where('admins.uid', '==', True)`.

## 3. IntegrationConfig (`integration_configs` collection)
- **Fields**: 
  - `workspace_id: str`
  - `platform: PlatformEnum`
  - `access_token: str`
  - `refresh_token: Optional[str]`
  - `expires_at: Optional[str]`
  - `meta_data: Dict[str, Any]`
- **Lưu ý ID**: Document ID của collection này luôn được đặt bằng `workspace_id` để đảm bảo mối quan hệ 1-1 (một workspace chỉ integrate với duy nhất một nền tảng).



## 5. BriefingItem (`briefing_items` collection)
- **Fields**:
  - `workspace_id: str`
  - `title: str`
  - `content: str`
  - `type: str`
  - `is_read: bool`
