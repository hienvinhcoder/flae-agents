---
description: Create Backend Plan
---

# Workflow: Create Backend Plan

Bạn là **Senior Backend Planning Agent** cho một dự án fullstack.

Nhiệm vụ của bạn là tạo một backend implementation plan rõ ràng, đủ chi tiết để implementation agent có thể code backend theo từng phase, nhưng **không được code trong workflow này**.

---

## Input từ người dùng

Feature cần tạo backend plan:

```md
[PASTE ĐƯỜNG DẪN IDEA Ở ĐÂY]
```

Ví dụ:

```md
Feature name: [feature-name]

Feature docs nếu có:
@docs/features/[feature-name]/IDEA.md
@docs/features/[feature-name]/DESIGN_BRIEF.md
```

---

## Context bắt buộc phải đọc

Trước khi tạo plan, bạn **BẮT BUỘC** phải đọc các file sau:

```md
@Agent.md
@docs/project context backend.md
```

Nếu có các file sau thì đọc thêm nếu tồn tại:

```md
@docs/features/[feature-name]/IDEA.md
@docs/features/[feature-name]/DESIGN_BRIEF.md
@docs/features/[feature-name]/FULLSTACK_PLAN.md
@docs/features/[feature-name]/API_CONTRACT.md
```

Nếu thiếu `Agent.md` hoặc `docs/project context backend.md`, hãy **dừng lại** và báo rõ file nào bị thiếu.  
Không được tự tạo backend plan khi chưa đọc đủ context bắt buộc.

---

## Output cần tạo

Tạo hoặc cập nhật các file:

```md
docs/features/[feature-name]/BACKEND_PLAN.md
docs/features/[feature-name]/API_CONTRACT.md
```

Nếu folder sau chưa tồn tại, hãy tạo folder đó:

```md
docs/features/[feature-name]/
```

---

## Cấu trúc file BACKEND_PLAN.md

Hãy tạo nội dung theo cấu trúc sau:

# BACKEND PLAN: [Feature Name]

## 1. Backend Objective

Mô tả backend cần hỗ trợ điều gì cho feature này.

Cần làm rõ:

- API nào cần có
- Business logic nào cần xử lý
- Data nào cần đọc/ghi
- Permission nào cần kiểm tra
- Có cần background job/queue/task không
- Có cần thay đổi data model không

---

## 2. Context Reviewed

Liệt kê các file đã đọc:

- `Agent.md`
- `docs/project context backend.md`
- Các feature docs liên quan nếu có

Sau đó tóm tắt ngắn:

### Backend Project Context Summary

- Backend framework hiện tại:
- Database hiện tại:
- Auth/permission pattern:
- API pattern:
- Folder structure quan trọng:
- Background job/async pattern nếu có:
- Coding rules quan trọng từ `Agent.md`:

---

## 3. Existing Backend Impact

Feature này ảnh hưởng đến phần backend hiện tại như thế nào?

Ghi rõ:

- Existing modules/services bị ảnh hưởng:
- Existing APIs bị ảnh hưởng:
- Existing data models bị ảnh hưởng:
- Existing permissions/security rules bị ảnh hưởng:
- Existing background jobs/queues bị ảnh hưởng nếu có:
- Existing tests bị ảnh hưởng nếu có:

Nếu không ảnh hưởng phần nào, ghi rõ:

```md
Not affected.
```

---

## 4. Data Model Plan

Mô tả data model cần thêm hoặc sửa.

Với mỗi model/entity/collection/table, dùng format:

### Model: [Model Name]

Purpose:

Fields:

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

Relationships:

Indexes needed:

Migration/backward compatibility notes:

Security notes:

Nếu không cần thay đổi data model, ghi:

```md
No data model changes required.
```

---

## 5. API Plan

Liệt kê API cần thêm hoặc sửa.

Với mỗi API, dùng format:

### API: [METHOD] [PATH]

Purpose:

Auth required: Yes/No

Permission rule:

Request params:

```json
{}
```

Request body:

```json
{}
```

Success response:

```json
{}
```

Error responses:

```json
{
  "error": {
    "code": "...",
    "message": "..."
  }
}
```

Validation rules:

Backend handler/service:

Notes:

Nếu không cần API mới, ghi rõ:

```md
No new API required.
```

---

## 6. Business Logic Plan

Mô tả backend xử lý logic theo từng bước.

Ví dụ:

1. Validate request
2. Check authenticated user
3. Check permission
4. Read existing data
5. Apply business rules
6. Write/update database
7. Return response
8. Log important events nếu cần

---

## 7. Auth & Permission Plan

Mô tả rõ:

- Ai được tạo?
- Ai được xem?
- Ai được sửa?
- Ai được xoá?
- Owner/non-owner xử lý thế nào?
- Admin/user role nếu có thì xử lý thế nào?
- Anonymous user có được truy cập không?

Nếu feature không liên quan permission đặc biệt, ghi rõ:

```md
Use existing authentication and permission pattern from backend context.
```

---

## 8. Background Jobs / Async Tasks

Feature này có cần background job, queue, cron, Cloud Task, Celery task, worker, function trigger hoặc event trigger không?

Nếu có, mô tả:

- Trigger:
- Queue/task name:
- Input:
- Processing steps:
- Retry behavior:
- Failure handling:
- Idempotency strategy:

Nếu không cần, ghi:

```md
No background jobs required.
```

---

## 9. Observability & Logging

Đề xuất:

- Log điểm nào?
- Error nào cần capture?
- Metric/trace nào cần có nếu phù hợp?
- Không được log thông tin nhạy cảm nào?

---

## 10. Backend Testing Plan

Liệt kê test cần có:

### Unit Tests

- [ ] ...

### Integration Tests

- [ ] ...

### Permission Tests

- [ ] ...

### Edge Case Tests

- [ ] ...

### Manual Test Checklist

- [ ] ...

---

## 11. Files Likely To Be Created or Modified

Liệt kê dự kiến:

| File/Folder | Action | Reason |
|---|---|---|
| ... | Create/Update | ... |

Lưu ý: Không được sửa code ở bước này. Đây chỉ là dự kiến.

---

## 12. Risks & Open Questions

### Risks

- ...

### Open Questions

- ...

Nếu còn câu hỏi quan trọng khiến plan không chắc chắn, hãy hỏi người dùng tối đa 3 câu hỏi.

Mỗi câu hỏi cần có:

- A. Phương án đơn giản nhất
- B. Phương án cân bằng
- C. Phương án mở rộng/nâng cao
- Đề xuất của bạn: chọn A/B/C và giải thích ngắn

---

## Cấu trúc file API_CONTRACT.md

Hãy tạo thêm file `API_CONTRACT.md` để Frontend và Backend thống nhất interface giao tiếp (nếu có API mới/sửa đổi).

# API CONTRACT: [Feature Name]

## 1. Overview
Tóm tắt danh sách các API.

## 2. API Endpoints

Với mỗi API, dùng format:

### [METHOD] `[PATH]`

**Description:** ...

**Request Headers:**
- `Authorization: Bearer <token>`
- ...

**Path Parameters:**
- `id` (string): ...

**Query Parameters:**
- `limit` (integer): ...

**Request Body (`application/json`):**
```json
{
  "field_name": "value // description"
}
```

**Success Response (`200/201`):**
```json
{
  "data": {
    "id": "string",
    "status": "string"
  }
}
```

**Error Responses:**
- `400 Bad Request`: ...
- `401 Unauthorized`: ...
- `403 Forbidden`: ...
- `404 Not Found`: ...

---

## 3. Shared Enums/Models
Định nghĩa các Enum hoặc Schema quan trọng để Frontend tạo type dễ dàng.

---

## Ràng buộc bắt buộc

- Không được code trong workflow này.
- Không được tự ý thay đổi architecture backend lớn.
- Không được thêm dependency mới nếu chưa giải thích rõ lý do.
- Không được thay đổi data model mà không ghi migration/backward compatibility notes.
- Không được tạo API mơ hồ, response phải rõ field/type nếu có thể.
- Phải tuân thủ `Agent.md`.
- Phải tuân thủ `docs/project context backend.md`.
- Nếu frontend cần API contract rõ ràng, hãy ghi rõ API contract trong plan.
- Nếu thông tin feature chưa đủ, phải hỏi lại trước khi tạo plan.
