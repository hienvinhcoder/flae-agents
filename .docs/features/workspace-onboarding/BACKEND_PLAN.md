# BACKEND PLAN: Workspace Onboarding & Tenant Setup

## 1. Backend Objective

Mục tiêu của backend trong feature này là cung cấp các API và business logic để xử lý quá trình khởi tạo một không gian làm việc (Workspace) mới cho người dùng.

Các yêu cầu chính:
- **API Khởi tạo thủ công:** Nhận thông tin doanh nghiệp từ form do user điền và tạo Workspace.
- **API Tích hợp OAuth (Haravan/KiotViet):** Khởi tạo luồng OAuth (cung cấp URL redirect) và xử lý callback (nhận auth code, đổi lấy access/refresh token, lấy thông tin cửa hàng để tự động tạo Workspace).
- **Tenant Isolation:** Tự động sinh `tenant_id` (chính là document ID của Workspace) và lưu trữ cấu hình tích hợp (tokens) an toàn.
- **Seeding Data mặc định:** Tự động tạo dữ liệu mẫu bao gồm 3 Agents (Chat, Analyst, Voice), Agent Contracts tương ứng và một bản ghi Welcome Morning Briefing.
- **Phân quyền:** Cấp quyền `owner` cho user hiện tại đối với Workspace vừa tạo.

---

## 2. Context Reviewed

Các file đã đọc:
- `AGENTS.md`
- `docs/project-context-backend.md`
- `docs/workspace-onboarding/IDEA.md`

### Backend Project Context Summary
- **Backend framework hiện tại:** FastAPI, Python 3.11+, Pydantic v2.
- **Database hiện tại:** Firestore sử dụng thư viện `firedantic` (synchronous ORM).
- **Auth/permission pattern:** Firebase Authentication, sử dụng các Dependency `verify_token`, `get_current_user` qua header `Authorization: Bearer <token>`.
- **API pattern:** `/api/v1` prefix. Các API trả về data wrap bởi `DataResponse[T]`. Schema kế thừa từ `ResponseSchemaBase`. **KHÔNG CÓ GET API**, Frontend tự lắng nghe realtime từ Firestore, backend chỉ đảm nhận thay đổi dữ liệu (POST/PUT/DELETE) hoặc logic phức tạp.
- **Folder structure quan trọng:** `app/models`, `app/schemas`, `app/api/v1/endpoints`, `app/services`.
- **Coding rules quan trọng từ `AGENTS.md`:** Kích thước file <= 450 dòng, sử dụng async cho thao tác I/O API ngoài (mặc dù firedantic sync), ưu tiên `uv`, type hints chặt chẽ, global exception handler.

---

## 3. Existing Backend Impact

- **Existing modules/services bị ảnh hưởng:** `User` service có thể cần cập nhật hoặc chúng ta tạo service mới cho Workspace. Cần xác định luồng quản lý quan hệ User - Workspace.
- **Existing APIs bị ảnh hưởng:** Not affected (tạo mới hoàn toàn).
- **Existing data models bị ảnh hưởng:** Model `User` có thể cần bổ sung một mảng `workspace_ids` hoặc `current_workspace_id` để biết user thuộc workspace nào, hoặc tách ra subcollection/mapping model.
- **Existing permissions/security rules bị ảnh hưởng:** Cần logic kiểm tra xem user chỉ được thao tác trên workspace mà họ có quyền (Tenant Isolation) ở các tính năng sau này.
- **Existing background jobs/queues bị ảnh hưởng:** Not affected. (Đồng bộ dữ liệu sâu sẽ tách làm background job sau).
- **Existing tests bị ảnh hưởng:** Not affected.

---

## 4. Data Model Plan

Chúng ta cần tạo thêm một số model mới. Tất cả kế thừa từ `firedantic.Model` (hoặc `app.models.base.BaseModel`).

### Model: Workspace

**Purpose:** Lưu thông tin không gian làm việc của doanh nghiệp (Tenant). Document ID của model này chính là `tenant_id`.

**Fields:**
| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | `str` | Yes | - | Tên doanh nghiệp/Cửa hàng |
| `industry` | `str` | No | `None` | Ngành hàng |
| `description` | `str` | No | `None` | Mô tả ngắn |
| `website` | `str` | No | `None` | Trang web (tùy chọn) |
| `platform` | `str` | Yes | `"manual"` | Enum: `manual`, `haravan`, `kiotviet` |
| `platform_store_id` | `str` | No | `None` | ID cửa hàng trên nền tảng (nếu có) |
| `owner_uid` | `str` | Yes | - | `firebase_uid` của người tạo |
| `admins` | `dict` | No | `{}` | Map uid -> bool cho các admin |
| `members` | `dict` | No | `{}` | Map uid -> bool cho các member |

**Relationships:** 1 User (Owner) -> N Workspaces. Sử dụng Embedded Dictionary `admins` và `members` để kiểm soát quyền và query Workspace cho User thay vì tạo sub-collection riêng.

### Model: IntegrationConfig

**Purpose:** Lưu trữ thông tin kết nối nền tảng thứ ba (Access Token, Refresh Token) để sử dụng cho Worker đồng bộ. Nên tách riêng khỏi Workspace để bảo mật.

**Fields:**
| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `workspace_id` | `str` | Yes | - | ID của Workspace (`tenant_id`) |
| `platform` | `str` | Yes | - | `haravan` hoặc `kiotviet` |
| `access_token` | `str` | Yes | - | Token truy cập |
| `refresh_token` | `str` | No | `None` | Token gia hạn |
| `expires_at` | `datetime` | No | `None` | Thời điểm hết hạn |
| `metadata` | `dict` | No | `{}` | Các cấu hình thêm (domain, v.v) |

*(Note: Sẽ tạo thêm các Model cho `Agent`, `AgentContract`, `BriefingItem` tương tự với `workspace_id` field nhằm seed data).*

---

## 5. API Plan

### API: POST /api/v1/workspaces/manual
**Purpose:** Tạo workspace thủ công và sinh data mặc định.
**Auth required:** Yes
**Request body:**
```json
{
  "name": "Cửa hàng của tôi",
  "industry": "Thời trang",
  "description": "Bán quần áo",
  "website": "https://example.com"
}
```
**Success response:**
```json
{
  "code": "201",
  "message": "Workspace created successfully",
  "data": {
    "id": "tenant_123",
    "name": "Cửa hàng của tôi",
    "platform": "manual"
  }
}
```

### API: POST /api/v1/workspaces/oauth/url
**Purpose:** Lấy URL để chuyển hướng người dùng sang trang ủy quyền OAuth của Haravan/KiotViet.
**Auth required:** Yes
**Request body:**
```json
{
  "platform": "haravan",
  "shop_domain": "my-shop.myharavan.com" // Cần cho Haravan
}
```
**Success response:**
```json
{
  "code": "200",
  "message": "Success",
  "data": {
    "auth_url": "https://accounts.haravan.com/connect/authorize?..."
  }
}
```

### API: POST /api/v1/workspaces/oauth/callback
**Purpose:** Xử lý callback sau khi người dùng đồng ý ủy quyền, tự động tạo Workspace và seed data.
**Auth required:** Yes
**Request body:**
```json
{
  "platform": "haravan",
  "code": "auth_code_from_platform",
  "shop_domain": "my-shop.myharavan.com"
}
```
**Success response:**
```json
{
  "code": "201",
  "message": "Workspace integrated and created successfully",
  "data": {
    "id": "tenant_456",
    "name": "Tên shop từ nền tảng",
    "platform": "haravan"
  }
}
```

---

## 6. Business Logic Plan

**Tạo Workspace Thủ công:**
1. Lấy thông tin user hiện tại qua dependency `get_current_user`.
2. Validate body request.
3. Tạo document trong collection `workspaces` (ID tự sinh, lưu lại thành `tenant_id`).
4. Gán `owner_uid` bằng `user.firebase_uid`.
5. Tạo 3 Agent mặc định (Chat, Analyst, Voice) và gán `workspace_id = tenant_id`.
6. Tạo các Agent Contracts và Briefing Item khởi đầu.
7. (Tùy chọn) Cập nhật user model: gắn `current_workspace_id = tenant_id`.
8. Trả về response.

**Tích hợp OAuth:**
1. Nhận `code` từ callback.
2. Dùng thư viện `httpx` (async) gọi API của Haravan/KiotViet để đổi token.
3. Dùng Access Token gọi API lấy thông tin shop (Tên shop, email, v.v).
4. Tạo document `Workspace` với platform tương ứng.
5. Tạo document `IntegrationConfig` lưu access/refresh tokens.
6. Seed mặc định 3 Agents, Contracts, Briefing.
7. Trả về response.

*(Tất cả việc tạo document dùng batch writes của Firestore để đảm bảo tính toàn vẹn - rollback nếu có lỗi).*

---

## 7. Auth & Permission Plan

- **Người tạo (Owner):** Là user đang đăng nhập. Sẽ có toàn quyền trên Workspace.
- Do user mới onboard chưa có workspace, sau khi tạo xong user nghiễm nhiên trở thành `owner`.
- Trong tương lai cần có cơ chế (RBAC) để chặn truy cập chéo giữa các workspace bằng cách so sánh `workspace_id` của document với danh sách `workspace_ids` của người đang gửi request. Ở feature này, tạm thời lưu `owner_uid` ở cấp độ Workspace.

---

## 8. Background Jobs / Async Tasks

- **Trigger:** Tự động kích hoạt sau khi `POST /api/v1/workspaces/oauth/callback` thành công.
- **Luồng dự kiến (Out-of-scope thực thi hiện tại nhưng cần chuẩn bị):** Mặc dù việc seed dữ liệu nhỏ gọn (agents) có thể đồng bộ, nhưng việc kéo dữ liệu đơn hàng cũ từ KiotViet/Haravan phải đưa vào Background Worker/Queue (vd: Cloud Tasks / Celery). Ở phase này: **Chỉ lưu Token, không tiến hành kéo historical data ngay lập tức.** 

---

## 9. Observability & Logging

- **Logging điểm quan trọng:**
  - `logger.info()`: Bắt đầu xử lý OAuth callback, lưu Token thành công, hoàn thành khởi tạo Workspace (thủ công / oauth).
  - `logger.warning()`: OAuth provider trả về kết quả không mong đợi nhưng chưa fatal (vd timeout thử lại).
  - `logger.error()`: Lỗi khi trao đổi token với provider, lỗi không thể lưu dữ liệu Firestore. Đảm bảo **ẩn access_token/refresh_token** khi ghi log.

---

## 10. Backend Testing Plan

### Unit Tests
- [ ] Test tạo Workspace manual (validate model).
- [ ] Test sinh UUID / ID tự động.
- [ ] Mock HTTP request cho OAuth callback và test logic xử lý token/thông tin shop.
- [ ] Test logic sinh default Agents / Briefing.

### Integration Tests
- [ ] Test flow `POST /api/v1/workspaces/manual` trả về 201 kèm data hợp lệ.
- [ ] Test batch write (nếu fail một phần thì sao).

### Permission Tests
- [ ] Gọi API khi không có token (401).

---

## 11. Files Likely To Be Created or Modified

| File/Folder | Action | Reason |
|---|---|---|
| `app/models/workspace.py` | Create | Định nghĩa model Workspace và IntegrationConfig |
| `app/models/agent.py` | Create | Định nghĩa các models cho Agent, Contract (seed data) |
| `app/schemas/sche_workspace.py` | Create | Pydantic Request/Response schemas cho Workspace |
| `app/api/v1/endpoints/workspace.py` | Create | Chứa các Router endpoints cho tính năng này |
| `app/api/v1/api_router.py` | Update | Đăng ký router `workspace` |
| `app/services/workspace_srv.py` | Create | Chứa core logic tạo tenant, xử lý OAuth, seed data |
| `app/core/config.py` | Update | Bổ sung biến môi trường cho HARAVAN_CLIENT_ID, KIOTVIET_CLIENT_ID... |

---

## 12. Risks & Open Questions

### Risks
- **OAuth Callback timeout:** Việc gọi API bên thứ ba có thể chậm. Tuy nhiên FastAPI chạy async nên ít gây nghẽn, nhưng Frontend có thể bị timeout nếu xử lý data seed quá lâu. Giải pháp: Sử dụng Batch writes của Firestore.
- **Bảo mật Token:** Lưu `access_token` ở plaintext trong Firestore có thể là rủi ro. Nên cân nhắc mã hóa trước khi lưu (encryption at rest).

### Open Questions

1. **Về việc ánh xạ User - Workspace:**
   - A. Lưu trực tiếp `owner_uid` và thêm các dictionary `admins`, `members` (map `uid` -> `bool`) vào model `Workspace`. Đây là giải pháp được chọn giúp query trực tiếp trên 1 collection `workspaces` (sử dụng array-contains hoặc dictionary key filtering) và loại bỏ collection `UserWorkspace` dư thừa, tối ưu cho Firestore.
   - B. Tạo model mapping `UserWorkspace` để lưu Role. (Đã hủy bỏ).
   - **Đề xuất:** Chọn A. Vì nó giúp giảm số lượng collection phải đọc và query Firestore nhanh hơn.

2. **Về việc lưu trữ API Credentials (Token) của bên thứ 3:**
   - A. Lưu dạng plaintext trong collection `integration_configs`.
   - B. Mã hóa bằng thư viện `cryptography` trước khi lưu vào Firestore, dùng một `ENCRYPTION_KEY` ở biến môi trường.
   - C. Dùng Secret Manager của Cloud.
   - **Đề xuất:** Chọn B. Cân bằng giữa dễ triển khai và đảm bảo mức bảo mật tối thiểu.

3. **Domain của hệ thống thứ 3:**
   - A. Frontend sẽ truyền `shop_domain` (Haravan/Kiotviet) ở bước request OAuth URL?
   - B. Backend hardcode hoặc có luồng nhập tự động?
   - **Đề xuất:** Chọn A. Haravan yêu cầu có shop domain để generate đúng URL oauth. Frontend sẽ hiện form xin domain trước khi lấy auth url.
