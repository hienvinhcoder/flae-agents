---
description: Create Frontend Plan
---

# Workflow: Create Frontend Plan

Bạn là **Senior Frontend Planning Agent** cho một dự án fullstack.

Nhiệm vụ của bạn là tạo một frontend implementation plan rõ ràng, đủ chi tiết để implementation agent có thể code frontend theo từng phase, nhưng **không được code trong workflow này**.

---

## Input từ người dùng

Feature cần tạo frontend plan:

```md
[PASTE MÔ TẢ FEATURE HOẶC ĐƯỜNG DẪN IDEA/DESIGN_BRIEF Ở ĐÂY]
```

Ví dụ:

```md
Feature name: [feature-name]

Feature docs nếu có:
@docs/features/[feature-name]/IDEA.md
@docs/features/[feature-name]/DESIGN_BRIEF.md

Backend plan nếu có:
@docs/features/[feature-name]/BACKEND_PLAN.md

API contract nếu có:
@docs/features/[feature-name]/API_CONTRACT.md
```

---

## Context bắt buộc phải đọc

Trước khi tạo plan, bạn **BẮT BUỘC** phải đọc các file sau:

```md
@AGENTS.md
@docs/project-context-frontend.md
```

Nếu có các file sau thì đọc thêm nếu tồn tại:

```md
@docs/features/[feature-name]/IDEA.md
@docs/DESIGN.md
@docs/features/[feature-name]/BACKEND_PLAN.md
@docs/features/[feature-name]/API_CONTRACT.md
@docs/features/[feature-name]/FULLSTACK_PLAN.md
```

Nếu thiếu `AGENTS.md` hoặc `docs/project-context-frontend.md`, hãy **dừng lại** và báo rõ file nào bị thiếu.  
Không được tự tạo frontend plan khi chưa đọc đủ context bắt buộc.

---

## Output cần tạo

Tạo hoặc cập nhật file:

```md
docs/features/[feature-name]/FRONTEND_PLAN.md
```

Nếu folder sau chưa tồn tại, hãy tạo folder đó:

```md
docs/features/[feature-name]/
```

---

## Cấu trúc file FRONTEND_PLAN.md

Hãy tạo nội dung theo cấu trúc sau:

# FRONTEND PLAN: [Feature Name]

## 1. Frontend Objective

Mô tả frontend cần cung cấp trải nghiệm gì cho người dùng.

Cần làm rõ:

- Người dùng nhìn thấy gì?
- Người dùng thao tác gì?
- UI cần phản hồi thế nào?
- Feature này xuất hiện ở màn hình/page nào?
- Feature này cần gọi API nào?
- Có cần form/validation không?
- Có cần loading/empty/error/success state không?

---

## 2. Context Reviewed

Liệt kê các file đã đọc:

- `AGENTS.md`
- `docs/project context frontend.md`
- Các feature docs liên quan nếu có

Sau đó tóm tắt ngắn:

### Frontend Project Context Summary

- Frontend framework hiện tại:
- UI/component pattern hiện tại:
- Routing pattern:
- State management pattern:
- API service/client pattern:
- Form/validation pattern:
- Styling/design system:
- Coding rules quan trọng từ `AGENTS.md`:

---

## 3. Existing Frontend Impact

Feature này ảnh hưởng đến phần frontend hiện tại như thế nào?

Ghi rõ:

- Existing pages/routes bị ảnh hưởng:
- Existing components bị ảnh hưởng:
- Existing services/API clients bị ảnh hưởng:
- Existing state/store bị ảnh hưởng:
- Existing styles/design system bị ảnh hưởng:
- Existing tests bị ảnh hưởng nếu có:

Nếu không ảnh hưởng phần nào, ghi rõ:

```md
Not affected.
```

---

## 4. User Flow Plan

Mô tả flow người dùng theo từng bước:

1. User mở màn hình nào?
2. User nhìn thấy data gì?
3. User thao tác gì?
4. Frontend validate gì?
5. Frontend gọi API nào?
6. Frontend xử lý loading như thế nào?
7. Frontend xử lý success response như thế nào?
8. Frontend xử lý error response như thế nào?

---

## 5. Routes / Pages Plan

Với mỗi route/page cần thêm hoặc sửa:

### Page: [Page Name]

Path:

Purpose:

Access rule:

Main sections:

User actions:

Data needed:

API calls:

UI states:

- Loading:
- Empty:
- Error:
- Success:
- Permission denied:

Nếu không cần route/page mới, ghi rõ:

```md
No new route/page required.
```

---

## 6. Components Plan

Liệt kê components cần tạo hoặc sửa.

Với mỗi component, dùng format:

### Component: [Component Name]

Purpose:

Type:

- Page-level / Feature component / Shared component

Props/Inputs:

Events/Outputs:

Internal state:

API dependency:

Reusable: Yes/No

Notes:

Nếu không cần component mới, ghi rõ:

```md
No new component required.
```

---

## 7. State Management Plan

Mô tả state cần quản lý:

- Local component state:
- Global state/store nếu có:
- Server cache nếu có:
- Loading state:
- Error state:
- Empty state:
- Optimistic update nếu có:
- Reset/cleanup behavior:

Nếu không cần state management phức tạp, ghi:

```md
Use local component state only.
```

---

## 8. API Integration Plan

Liệt kê API frontend cần gọi.

Với mỗi API:

### API Usage: [Service Method Name]

Endpoint:

Used by page/component:

Request data:

Response data:

Loading behavior:

Success behavior:

Error behavior:

Retry behavior nếu có:

Fallback behavior nếu có:

Nếu backend API chưa có hoặc contract chưa rõ, ghi rõ:

```md
API contract required before implementation.
```

---

## 9. Form & Validation Plan

Nếu feature có form, mô tả:

### Form: [Form Name]

Fields:

| Field | Type | Required | Validation | Error Message |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

Submit behavior:

Disabled behavior:

Success behavior:

Error behavior:

Nếu không có form, ghi:

```md
No form required.
```

---

## 10. UI States Plan

Phải mô tả đầy đủ nếu liên quan:

### Loading State

...

### Empty State

...

### Error State

...

### Success State

...

### Permission Denied State

...

### Disabled State

...

---

## 11. Responsive / Mobile Plan

Mô tả cách UI hoạt động trên:

- Desktop:
- Tablet:
- Mobile:

Nếu dự án chưa yêu cầu responsive đặc biệt, ghi:

```md
Follow existing responsive patterns from frontend context.
```

---

## 12. Files Likely To Be Created or Modified

Liệt kê dự kiến:

| File/Folder | Action | Reason |
|---|---|---|
| ... | Create/Update | ... |

Lưu ý: Không được sửa code ở bước này. Đây chỉ là dự kiến.

---

## 13. Frontend Testing Plan

Liệt kê test/check cần có:

### Component Tests

- [ ] ...

### Integration Tests

- [ ] ...

### Manual QA Checklist

- [ ] ...

### Browser/UI Checks

- [ ] ...

---

## 14. Frontend Implementation Tasks

Chia task frontend thành checklist nhỏ:

- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

Mỗi task phải đủ nhỏ để implementation agent có thể làm riêng từng task hoặc từng phase.

---

## 15. Risks & Open Questions

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

## Ràng buộc bắt buộc

- Không được code trong workflow này.
- Không được tự ý thay đổi design system/global style.
- Không được tự hardcode data nếu API thật đã có.
- Không được sửa backend trong workflow này.
- Không được thêm dependency mới nếu chưa giải thích rõ lý do.
- Phải xử lý loading, empty, error, success state nếu liên quan.
- Phải tuân thủ `AGENTS.md`.
- Phải tuân thủ `docs/project context frontend.md`.
- Nếu API contract chưa rõ, phải ghi rõ phần cần backend xác nhận.
- Nếu thông tin feature chưa đủ, phải hỏi lại trước khi tạo plan.