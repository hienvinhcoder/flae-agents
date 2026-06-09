---
name: create-plans
description: Tự động phân rã file IDEAS.md thành 3 bản vẽ kiến trúc chi tiết: Design Brief, Frontend Plan, Backend Plan.
triggers:
  - "/create-plans"
---

# 🎯 ROLE: TECHNICAL PROJECT MANAGER / SOLUTION ARCHITECT

Bạn là Technical Project Manager kiêm Solution Architect.

Nhiệm vụ của bạn là đọc ý tưởng thô của feature **`$ARGUMENTS`**, sau đó phân rã thành 3 bản vẽ kỹ thuật chuyên sâu:

1. `DESIGN-BRIEF.md`
2. `FRONTEND-PLAN.md`
3. `BACKEND-PLAN.md`

Tuyệt đối **KHÔNG viết source code triển khai production** ở bước này.  
Chỉ được viết tài liệu thiết kế, mã giả, interface/type, API contract, cấu trúc component và kế hoạch kỹ thuật.

---

# 1. INPUTS — NGUỒN CHÂN LÝ BẮT BUỘC

## 1.1. Xác định feature path

Từ `$ARGUMENTS`, suy ra:

```txt
feature_name = $ARGUMENTS
feature_dir = .docs/features/[feature_name]
idea_file = .docs/features/[feature_name]/IDEAS.md
````

## 1.2. Đọc Idea gốc

BẮT BUỘC đọc:

```txt
.docs/features/[feature_name]/IDEAS.md
```

Nếu file không tồn tại, DỪNG NGAY và chỉ in lỗi:

```txt
❌ Không tìm thấy file ý tưởng `.docs/features/[feature_name]/IDEAS.md`.
```

Không tạo bất kỳ file nào nếu thiếu `IDEAS.md`.

## 1.3. Đọc hiến pháp hệ thống

BẮT BUỘC đọc:

```txt
AGENTS.md
```

Mọi quyết định thiết kế phải tuân thủ quy định trong file này.

## 1.4. Đọc project context hiện tại

BẮT BUỘC đọc tài liệu kiến trúc hiện tại để đảm bảo kế hoạch bám sát hệ thống đang có.

### Backend context

Đọc:

```txt
.docs/project-context-backend.md
```

Sau đó đọc các file backend liên quan trong thư mục `.docs/backend/` được dẫn chiếu hoặc mô tả.

### Frontend context

Đọc:

```txt
.docs/project-context-frontend.md
```

Sau đó đọc các file frontend liên quan trong thư mục `.docs/frontend/` được dẫn chiếu hoặc mô tả.

## 1.5. Đọc tiêu chuẩn thi công

Đọc lướt toàn bộ thư mục:

```txt
.agents/skills/
```

Đặc biệt, khi tạo Backend Plan, BẮT BUỘC đọc kỹ:

```txt
.agents/skills/plan-backend/SKILL.md
```

## 1.6. Đọc Design System

BẮT BUỘC đọc:

```txt
.docs/DESIGN.md
```

## 1.7. Đọc tiêu chuẩn lập kế hoạch thực thi (Implementation Plan)

BẮT BUỘC đọc kỹ file:

```txt
.agents/skills/writing-plans/SKILL.md
```

Quy hoạch kế hoạch Frontend và Backend phải tuân thủ nghiêm ngặt kỹ năng lập kế hoạch thực thi chi tiết, có phân rã bite-sized tasks, hướng kiểm thử TDD, không dùng placeholder và có phần bàn giao thực thi cụ thể.

Design Brief phải kế thừa chính xác:

* Color system
* Typography
* Spacing
* UI rules
* Anti-patterns
* Component style conventions

Nếu `.docs/DESIGN.md` có quy định mâu thuẫn với ý tưởng trong `IDEAS.md`, ưu tiên `.docs/DESIGN.md`.

---

# 2. OUTPUTS — FILE PHẢI TẠO

Sau khi đọc đầy đủ inputs, tạo đúng 3 file sau:

```txt
.docs/features/[feature_name]/DESIGN-BRIEF.md
.docs/features/[feature_name]/FRONTEND-PLAN.md
.docs/features/[feature_name]/BACKEND-PLAN.md
```

KHÔNG in toàn bộ nội dung các file ra chat.
Chỉ ghi nội dung vào file vật lý.

---

# 3. FILE 1 — DESIGN-BRIEF.md

## Mục tiêu

Tạo Design Brief mô tả UI/UX, layout, component presentation, màu sắc, typography và mock data cho feature.

Design Brief phải tuân thủ tuyệt đối `.docs/DESIGN.md`.

## Nội dung bắt buộc

### 3.1. Tóm tắt trải nghiệm người dùng

Mô tả ngắn gọn:

* Người dùng là ai
* Họ cần hoàn thành việc gì
* Luồng tương tác chính
* Kết quả mong muốn trên UI

### 3.2. Layout System

Bắt buộc mô tả rõ:

* Root layout
  Ví dụ: `min-h-screen`, `max-w-7xl mx-auto`, `px-4`
* Section layout
* Grid/Flex strategy cho desktop/tablet/mobile
* Responsive behavior
* Spacing bằng Tailwind class
  Ví dụ: `gap-8`, `py-12`, `space-y-6`

### 3.3. Component Specs

Chỉ liệt kê các component được đánh nhãn `[DUMB]` trong `FRONTEND-PLAN.md`.

Với mỗi Dumb Component, mô tả:

* Mục đích component
* Data nhận vào
* Event phát ra nếu có
* Box style
  Ví dụ: `rounded-xl`, `border`, `shadow-sm`, `shadow-lg`
* Typography
  Ví dụ: `text-2xl font-bold tracking-tight`
* Interaction states
  Ví dụ: `hover:-translate-y-1`, `hover:shadow-md`, `disabled:opacity-50`
* Empty / loading / error visual state nếu cần

### 3.4. Color Constraints

Bắt buộc:

* Dịch màu trong `IDEAS.md` sang Tailwind class hợp lệ.
* Ưu tiên token/màu đã định nghĩa trong `.docs/DESIGN.md`.
* Không dùng HEX/RGB tự chế, trừ khi `.docs/DESIGN.md` hoặc `IDEAS.md` yêu cầu rõ ràng.
* Ghi rõ mapping màu, ví dụ:

```txt
Ý tưởng: "xanh neon"
Tailwind: text-cyan-400 / bg-cyan-400
Lý do: phù hợp accent color trong Design System
```

### 3.5. Typography

Bắt buộc nêu:

* Font family kế thừa từ `.docs/DESIGN.md`
* Heading style
* Body style
* Caption/helper text style
* Button text style

### 3.6. Mock Data

Cung cấp mock data hiển thị bằng tiếng Việt, bao gồm:

* Text mẫu
* Số liệu mẫu
* Tên entity mẫu
* Trạng thái mẫu
* Placeholder image nếu UI cần ảnh

Không dùng `Lorem ipsum`.

---

# 4. FILE 2 — FRONTEND-PLAN.md

## Mục tiêu

Tạo kế hoạch frontend cho Angular, ưu tiên Standalone Components, phân tách rõ Smart/Dumb, state management, routing, data contract và UI integration.

## Nội dung bắt buộc

### 4.1. Feature Overview

Mô tả:

* Feature làm gì
* User flow chính
* Các màn hình hoặc section chính
* Phụ thuộc vào API/backend nào

### 4.2. Component Tree

Phân rã giao diện thành cây component dạng Cha → Con.

Mỗi component BẮT BUỘC có nhãn:

```txt
[SMART]
```

hoặc

```txt
[DUMB]
```

Quy tắc:

* `[SMART]`: container component, gọi API, quản lý state, xử lý logic nghiệp vụ, tương tác service.
* `[DUMB]`: presentational component, chỉ nhận `@Input()`, phát `@Output()`, không gọi API/service, không chứa business logic.

Ví dụ format:

```txt
FeaturePageComponent [SMART]
├── FeatureHeaderComponent [DUMB] [Shared UI candidate]
├── FeatureFilterComponent [DUMB]
├── FeatureListContainerComponent [SMART]
│   └── FeatureCardComponent [DUMB] [Shared UI candidate]
└── FeatureEmptyStateComponent [DUMB]
```

### 4.3. Shared UI Candidates

Liệt kê component có tiềm năng dùng chung toàn dự án.

Với mỗi component, nêu:

* Vì sao có thể dùng chung
* Props nên generalize
* Các ràng buộc để tránh coupling với feature hiện tại

### 4.4. State Management

Liệt kê đầy đủ state cần thiết, ví dụ:

* `isLoading`
* `errorMessage`
* `items`
* `selectedItem`
* `searchQuery`
* `filters`
* `pagination`
* `sort`
* `formValue`

Với mỗi state, xác định:

* Kiểu dữ liệu
* Nơi quản lý: component local, Angular Signal, RxJS Service, URL Query Params
* Lý do lựa chọn

Quy tắc:

* State chỉ dùng nội bộ component → ưu tiên Angular Signals.
* State chia sẻ nhiều component → cân nhắc Service/RxJS.
* State cần share link hoặc reload giữ nguyên → đưa vào URL Query Params.
* Không lưu state dư thừa nếu có thể derive từ state khác.

### 4.5. Routing / URL Query Params

Nếu feature có filter/search/sort/pagination, xác định rõ:

* Query param name
* Kiểu dữ liệu
* Default value
* Khi nào update URL
* Khi nào đọc từ URL để restore state

### 4.6. TypeScript Contracts cho Dumb Components

Viết mã giả TypeScript cho các Dumb Component quan trọng.

Bắt buộc:

* Dùng `interface` hoặc `type`
* Không dùng `any`
* Định nghĩa rõ `@Input()`
* Định nghĩa rõ `@Output()`
* Event payload phải có kiểu cụ thể

Ví dụ:

```ts
interface CourseCardInput {
  id: string;
  title: string;
  price: number;
  thumbnailUrl: string;
  rating: number;
}

type CourseCardEvent =
  | { type: 'viewDetail'; courseId: string }
  | { type: 'addToCart'; courseId: string };
```

### 4.7. API Integration Notes

Mô tả frontend sẽ gọi API nào từ Backend Plan.

Với mỗi API:

* Method
* Endpoint
* Request params/body
* Response data cần cho UI
* Loading/error handling
* Empty state handling

### 4.8. Implementation Plan (Kế hoạch thực thi chi tiết)

Bắt buộc chia nhỏ luồng phát triển frontend thành các nhiệm vụ cực kỳ chi tiết (bite-sized tasks) để một lập trình viên/agent có thể thi công trong vòng 2-5 phút cho mỗi bước, bám sát kỹ thuật TDD (Test-Driven Development) và Quy tắc cấm Placeholder của `.agents/skills/writing-plans/SKILL.md`.

#### 4.8.1. Plan Document Header
Bắt đầu phần kế hoạch thực thi với header chuẩn sau:
```markdown
# [Feature Name] Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [Một câu mô tả mục tiêu của frontend plan]
**Architecture:** [2-3 câu mô tả hướng tiếp cận kiến trúc frontend]
**Tech Stack:** Angular, Tailwind CSS, TypeScript
```

#### 4.8.2. Cấu trúc Task và TDD Steps
Mỗi task phải được thiết kế chi tiết với cấu trúc như sau:
```markdown
### Task N: [Tên Component/Service/State cần phát triển]

**Files:**
- Create: `frontend/src/app/...` (đường dẫn tuyệt đối từ root hoặc tương đối rõ ràng)
- Modify: `frontend/src/app/...` (chỉ rõ khoảng dòng nếu chỉnh sửa file có sẵn)
- Test: `frontend/src/app/...spec.ts` (đường dẫn file test tương ứng)

- [ ] **Step 1: Write the failing test**
  Viết test case kiểm thử lỗi cho chức năng cần phát triển (mã nguồn Angular test chi tiết bằng Spectator/Jest/Jasmine, không được dùng comment placeholder).
  ```typescript
  // Code test đầy đủ ở đây
  ```

- [ ] **Step 2: Run test to verify it fails**
  Chạy lệnh test và đảm bảo nó thất bại đúng như mong muốn.
  Run: `ng test --include=path/to/file.spec.ts` hoặc lệnh test tương ứng
  Expected: Thất bại với lỗi cụ thể (ví dụ: `Component not found` hoặc assertion fail)

- [ ] **Step 3: Write minimal implementation**
  Viết mã nguồn tối thiểu để test case này có thể pass (mã nguồn TypeScript/HTML hoàn chỉnh, không được dùng TODO/TBD).
  ```typescript
  // Code component/service/template đầy đủ ở đây
  ```

- [ ] **Step 4: Run test to verify it passes**
  Chạy lại lệnh test và đảm bảo nó đã vượt qua thành công.
  Run: `ng test --include=path/to/file.spec.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  Thực hiện commit git với thông điệp chuẩn hóa.
  Command: `git add <các file tương ứng> && git commit -m "feat(frontend): <mô tả ngắn gọn>"`
```

#### 4.8.3. Handoff Choice (Bàn giao thực thi)
Đặt phần sau vào cuối `FRONTEND-PLAN.md` để người dùng lựa chọn cách chạy:
```markdown
## Execution Handoff
Sau khi duyệt qua kế hoạch, hãy lựa chọn một trong hai phương thức sau để bắt đầu:
1. **Subagent-Driven (Khuyến nghị)**: Tôi sẽ tự động kích hoạt các subagents riêng biệt cho từng task và rà soát sau mỗi bước.
2. **Inline Execution**: Thực thi tuần tự các tác vụ ngay trong session này.
```

---

# 5. FILE 3 — BACKEND-PLAN.md

## Mục tiêu

Tạo bản vẽ backend theo đúng chuẩn trong:

```txt
.agents/skills/plan-backend/SKILL.md
```

Backend Plan phải khớp 100% với nhu cầu render của Frontend Plan.

## Nội dung bắt buộc

### 5.1. Backend Feature Overview

Mô tả:

* Feature cần backend hỗ trợ gì
* Entity/domain liên quan
* API surface cần tạo hoặc chỉnh sửa
* Tích hợp hệ thống hiện có

### 5.2. Data Model / Schema

Mô tả model cần dùng hoặc cần tạo.

Với mỗi model:

* Tên model
* Field
* Type
* Required/optional
* Index nếu cần
* Relationship nếu có
* Migration impact nếu có

### 5.3. API Contracts

Với mỗi API, bắt buộc ghi rõ:

* Method
* Endpoint
* Purpose
* Authorization dependency
* Request path params
* Query params
* Request body
* Response JSON
* Error cases
* HTTP status codes

Authorization dependency phải dùng đúng một trong các cơ chế hiện có từ:

```txt
app/core/security.py
```

Ví dụ:

```txt
Depends(verify_token)
Depends(get_current_user_uid)
Depends(get_current_user)
```

Không tự bịa dependency mới nếu project chưa có.

### 5.4. Response Contract Alignment

Response JSON của Backend Plan phải khớp 100% với dữ liệu Frontend Plan cần render.

Bắt buộc có bảng mapping:

```txt
Frontend Need | Backend Field | API | Notes
```

Ví dụ:

```txt
CourseCardInput.title | data.items[].title | GET /courses | Required
```

### 5.5. Redis Cache Analysis

Phân tích rõ có cần Redis Cache hay không.

Bắt buộc nêu:

* Có dùng Redis không: Có/Không
* Lý do
* Cache key pattern nếu có
* TTL nếu có
* Invalidation strategy nếu có
* Rủi ro stale data nếu có

Không được thêm Redis theo thói quen nếu feature không cần.

### 5.6. Realtime / WebSocket Analysis

Nếu feature cần realtime, thiết kế:

* WebSocket endpoint
* Event types
* Payload schema
* Redis Pub/Sub channel nếu cần scale multi-instance
* Auth strategy cho WebSocket
* Reconnect behavior
* Error handling

Nếu không cần realtime, ghi rõ:

```txt
Feature này không cần WebSocket vì ...
```

### 5.7. Service / Repository / Router Plan

Mô tả các file backend cần tạo hoặc chỉnh sửa, ví dụ:

```txt
app/api/routes/...
app/services/...
app/repositories/...
app/models/...
app/schemas/...
```

Với mỗi file:

* Vai trò
* Hàm/class chính dự kiến
* Không viết full source code
* Chỉ mô tả trách nhiệm và pseudo-structure

### 5.8. Validation & Error Handling

Mô tả:

* Validation rule
* Business rule
* Error code
* Error response format
* Logging nếu cần

### 5.9. Testing Plan

Liệt kê test cần có:

* Unit test
* API test
* Authorization test
* Cache test nếu có Redis
* Realtime test nếu có WebSocket
* Edge cases

### 5.10. Implementation Plan (Kế hoạch thực thi chi tiết)

Bắt buộc chia nhỏ luồng phát triển backend thành các nhiệm vụ cực kỳ chi tiết (bite-sized tasks) để thi công trong vòng 2-5 phút mỗi bước, bám sát kỹ thuật TDD (Test-Driven Development) và Quy tắc cấm Placeholder của `.agents/skills/writing-plans/SKILL.md`.

#### 5.10.1. Plan Document Header
Bắt đầu phần kế hoạch thực thi với header chuẩn sau:
```markdown
# [Feature Name] Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [Một câu mô tả mục tiêu của backend plan]
**Architecture:** [2-3 câu mô tả hướng tiếp cận kiến trúc backend (Endpoint -> Service -> Model)]
**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Pydantic, PostgreSQL
```

#### 5.10.2. Cấu trúc Task và TDD Steps
Mỗi task backend phải được thiết kế chi tiết với cấu trúc như sau:
```markdown
### Task N: [Tên Model/Service/Router/Migration cần phát triển]

**Files:**
- Create: `backend/app/...` (đường dẫn tuyệt đối từ root hoặc tương đối rõ ràng)
- Modify: `backend/app/...` (chỉ rõ khoảng dòng nếu chỉnh sửa file có sẵn)
- Test: `backend/tests/...` (đường dẫn file test tương ứng)

- [ ] **Step 1: Write the failing test**
  Viết test case kiểm thử lỗi cho chức năng cần phát triển (mã nguồn pytest chi tiết, không được dùng comment placeholder).
  ```python
  # Code test đầy đủ ở đây
  ```

- [ ] **Step 2: Run test to verify it fails**
  Chạy lệnh test và đảm bảo nó thất bại đúng như mong muốn.
  Run: `pytest backend/tests/path/to/test.py::test_function -v`
  Expected: Thất bại với lỗi cụ thể (ví dụ: `ModuleNotFoundError` hoặc assertion fail)

- [ ] **Step 3: Write minimal implementation**
  Viết mã nguồn tối thiểu (model, service, router, hoặc alembic migration) để test case này có thể pass (mã nguồn Python hoàn chỉnh, không được dùng TODO/TBD).
  ```python
  # Code backend đầy đủ ở đây
  ```

- [ ] **Step 4: Run test to verify it passes**
  Chạy lại lệnh test và đảm bảo nó đã vượt qua thành công.
  Run: `pytest backend/tests/path/to/test.py::test_function -v`
  Expected: PASS

- [ ] **Step 5: Commit**
  Thực hiện commit git với thông điệp chuẩn hóa.
  Command: `git add <các file tương ứng> && git commit -m "feat(backend): <mô tả ngắn gọn>"`
```

#### 5.10.3. Handoff Choice (Bàn giao thực thi)
Đặt phần sau vào cuối `BACKEND-PLAN.md` để người dùng lựa chọn cách chạy:
```markdown
## Execution Handoff
Sau khi duyệt qua kế hoạch, hãy lựa chọn một trong hai phương thức sau để bắt đầu:
1. **Subagent-Driven (Khuyến nghị)**: Tôi sẽ tự động kích hoạt các subagents riêng biệt cho từng task và rà soát sau mỗi bước.
2. **Inline Execution**: Thực thi tuần tự các tác vụ ngay trong session này.
```

---

# 6. RÀ SOÁT CHÉO BẮT BUỘC

Trước khi kết thúc, tự rà soát 3 file theo checklist sau:

## 6.1. Design ↔ Frontend

* Tất cả `[DUMB]` components trong Frontend Plan đã có spec trong Design Brief.
* Design Brief không mô tả component không tồn tại trong Frontend Plan.
* Tailwind class tuân thủ `.docs/DESIGN.md`.
* Không dùng HEX/RGB tự chế nếu không được phép.

## 6.2. Frontend ↔ Backend

* Mỗi dữ liệu UI cần render đều có field tương ứng trong Backend response.
* Không có field frontend yêu cầu nhưng backend không trả về.
* Không có response backend quan trọng nhưng frontend không dùng.
* Không dùng `any` trong TypeScript pseudo-contract.
* Query params frontend khớp với backend query params.

## 6.3. Backend ↔ System Constitution

* Authorization dùng dependency có thật từ `app/core/security.py`.
* API format bám theo kiến trúc backend hiện tại.
* Redis/WebSocket chỉ dùng khi có lý do hợp lý.
* Backend Plan tuân thủ `.agents/skills/plan-backend/SKILL.md`.

## 6.4. Implementation Plan ↔ writing-plans/SKILL.md

* Tất cả các file cần tạo/chỉnh sửa/test đều có đường dẫn chính xác và đầy đủ.
* Toàn bộ mã nguồn kiểm thử (test code) và mã triển khai (implementation code) trong các task đều được viết đầy đủ, rõ ràng và có thể chạy được (không có TBD, TODO hoặc placeholder).
* Lệnh chạy kiểm thử được ghi chi tiết cho từng task, khớp với môi trường của dự án Angular frontend và FastAPI backend.
* Có đầy đủ các bước kiểm thử TDD (Step 1-5) và phần bàn giao thực thi (Execution Handoff) ở cuối file.

---

# 7. QUY TẮC CẤM

Tuyệt đối không:

* Viết full production source code.
* In toàn bộ nội dung 3 file ra chat.
* Bỏ qua `IDEAS.md`.
* Bỏ qua `AGENTS.md`.
* Bỏ qua `.docs/DESIGN.md`.
* Tự bịa kiến trúc trái với docs hiện tại.
* Dùng `any` trong TypeScript pseudo-contract.
* Dùng HEX/RGB tự chế nếu Design System không cho phép.
* Tạo API mà không có authorization rõ ràng.
* Tạo frontend field không có backend response tương ứng.
* Bỏ qua việc lập kế hoạch thực thi chi tiết (TDD bite-sized tasks).
* Sử dụng placeholders (TBD, TODO, "tự điền code", v.v.) trong các khối mã của kế hoạch thực thi.

---

# 8. NGHIỆM THU

Sau khi tạo xong 3 file, chỉ in bảng ngắn sau:

```md
| Trạng thái | Feature | File đã tạo |
|---|---|---|
| ✅ Hoàn tất | `$ARGUMENTS` | `.docs/features/[feature_name]/DESIGN-BRIEF.md` |
| ✅ Hoàn tất | `$ARGUMENTS` | `.docs/features/[feature_name]/FRONTEND-PLAN.md` |
| ✅ Hoàn tất | `$ARGUMENTS` | `.docs/features/[feature_name]/BACKEND-PLAN.md` |
```

Sau bảng, in thêm đúng một dòng:

```txt
✅ Đã rải xong 3 bản vẽ thiết kế cho feature `$ARGUMENTS`. Nội dung đã được lưu tại `.docs/features/[feature_name]/`.
```

```

Điểm đã tối ưu chính:

1. **Tách rõ vai trò, input, output, checklist và rule cấm** để agent ít bị lạc nhiệm vụ.
2. **Chuẩn hóa `[feature_name]`, `feature_dir`, `idea_file`** để tránh hiểu sai path.
3. **Siết cross-check Frontend ↔ Backend ↔ Design** để giảm lỗi field không khớp.
4. **Thêm format cụ thể cho từng file** để output ổn định hơn.
5. **Giảm khả năng agent in dài ra chat** bằng rule nghiệm thu rõ ràng.
6. **Ràng buộc authorization, Redis, WebSocket theo điều kiện**, tránh thiết kế quá tay.
```
