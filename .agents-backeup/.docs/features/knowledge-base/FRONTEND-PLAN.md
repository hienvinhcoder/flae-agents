# Knowledge Base Management — Frontend Plan

## 1. Tổng Quan

Xây dựng giao diện quản lý Knowledge Base trong dashboard FLAE Agents. Người dùng có thể:
- Upload tài liệu (PDF, Markdown, Text)
- Nhập text/markdown trực tiếp qua editor
- Xem danh sách tài liệu và trạng thái ingestion realtime
- Xóa tài liệu
- Retry ingestion khi lỗi

### Route hiện tại
Đã có sẵn route `/dashboard/knowledge` trong [dashboard.routes.ts](file:///Users/nguyenhienvinh/projects/flae-agents/frontend/src/app/features/dashboard/dashboard.routes.ts) đang trỏ tới `PlaceholderComponent`. Chỉ cần thay thế bằng component thực.

---

## 2. Design Direction

### Layout
- **Trang chính (Knowledge List):** Hiển thị danh sách tài liệu dạng table/grid với search, filter status
- **Upload Panel:** Slide-over panel hoặc modal cho upload file + nhập text
- **Document Detail:** Click vào document → xem chi tiết, trạng thái ingestion, metrics

### Visual Style
- Tuân thủ design system hiện tại (Tailwind utilities đã có trong project)
- Sử dụng icon từ `lucide-angular` (đã có)
- Status badges với color coding: pending (amber), processing (blue pulse), completed (emerald), failed (red)

---

## 3. Proposed Changes

### 3.1. Data Models

#### [NEW] `frontend/src/app/core/models/knowledge-base.model.ts`

```typescript
export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type DocumentType = 'pdf' | 'markdown' | 'text' | 'manual_input';

export interface KnowledgeDocument {
  id: string;
  title: string;
  description?: string;
  document_type: DocumentType;
  status: DocumentStatus;
  file_name?: string;
  file_size?: number;
  chunk_count?: number;
  entity_count?: number;
  relation_count?: number;
  error_message?: string;
  token_usage?: Record<string, number>;
  processing_time_seconds?: number;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface ManualDocumentPayload {
  title: string;
  description?: string;
  content_text: string;
}
```

---

### 3.2. API Service

#### [NEW] `frontend/src/app/core/services/api/knowledge-base-api.service.ts`

Service giao tiếp với backend Knowledge Base API. Tuân theo pattern giống [workspace-api.service.ts](file:///Users/nguyenhienvinh/projects/flae-agents/frontend/src/app/core/services/api/workspace-api.service.ts):

| Method | Description |
|--------|-------------|
| `uploadDocument(workspaceId, file, title, description?)` | Upload file multipart |
| `createManualDocument(workspaceId, payload)` | Tạo document từ text input |
| `getDocuments(workspaceId)` | Liệt kê documents |
| `getDocument(workspaceId, docId)` | Chi tiết document |
| `deleteDocument(workspaceId, docId)` | Xóa document |
| `retryIngestion(workspaceId, docId)` | Retry ingestion |
| `getIngestionStatus(workspaceId, docId)` | Polling status |

---

### 3.3. Components Architecture

```
features/dashboard/pages/knowledge/
├── knowledge.routes.ts                    # [NEW] Sub-routes cho knowledge
├── knowledge-list/
│   ├── knowledge-list.component.ts        # [NEW] Smart Container - trang danh sách
│   └── knowledge-list.component.html
├── ui/
│   ├── document-table.component.ts        # [NEW] Dumb - bảng danh sách documents
│   ├── document-table.component.html
│   ├── upload-modal.component.ts          # [NEW] Dumb - modal upload file
│   ├── upload-modal.component.html
│   ├── text-input-modal.component.ts      # [NEW] Dumb - modal nhập text/markdown
│   ├── text-input-modal.component.html
│   ├── document-detail-panel.component.ts # [NEW] Dumb - panel chi tiết document
│   ├── document-detail-panel.component.html
│   ├── status-badge.component.ts          # [NEW] Dumb - hiển thị status
│   └── ingestion-progress.component.ts    # [NEW] Dumb - progress visualization
```

---

### 3.4. Component Details

#### **Knowledge List Page (Smart Container)**
- Fetch danh sách documents khi component init
- Quản lý state: documents list, loading, selected document
- Polling status cho documents đang `processing` (interval 5s)
- Điều phối actions: upload, delete, retry, view detail
- Filter theo status, search theo title

#### **Document Table (Dumb/Presentational)**
- `@Input()` documents: KnowledgeDocument[]
- `@Output()` viewDetail, delete, retry
- Hiển thị columns: Title, Type, Status, Chunks, Uploaded By, Date
- Responsive: table trên desktop, card list trên mobile
- Empty state illustration khi chưa có document

#### **Upload Modal (Dumb)**
- `@Output()` uploadFile: EventEmitter<{file: File, title: string, description?: string}>
- Drag & drop zone + file picker
- Preview file name, size, type
- Validate: chỉ chấp nhận PDF/MD/TXT, max size
- Loading state khi đang upload

#### **Text Input Modal (Dumb)**
- `@Output()` submitText: EventEmitter<ManualDocumentPayload>
- Title input
- Textarea cho markdown content (có thể dùng monospace font)
- Preview mode (render markdown cơ bản)
- Validate: title required, content required

#### **Document Detail Panel (Dumb)**
- `@Input()` document: KnowledgeDocument
- Slide-over panel từ bên phải
- Hiển thị: metadata, ingestion status, metrics (chunks/entities/relations)
- Error message nếu failed
- Token usage breakdown
- Button retry nếu failed
- Button delete

#### **Status Badge (Dumb)**
- `@Input()` status: DocumentStatus
- Renders badge với color + icon:
  - `pending`: amber, clock icon
  - `processing`: blue, spinning loader
  - `completed`: emerald, check icon
  - `failed`: red, x-circle icon

---

### 3.5. Routing

#### [MODIFY] `frontend/src/app/features/dashboard/dashboard.routes.ts`

```typescript
{
  path: 'knowledge',
  loadComponent: () => import('./pages/knowledge/knowledge-list/knowledge-list.component')
    .then(m => m.KnowledgeListComponent)
}
```

---

### 3.6. i18n

#### [MODIFY] `frontend/public/assets/i18n/vi.json` & `en.json`

Thêm translation keys cho Knowledge Base:

```json
{
  "KNOWLEDGE": {
    "TITLE": "Cơ Sở Tri Thức",
    "UPLOAD_FILE": "Tải lên tài liệu",
    "ADD_TEXT": "Nhập nội dung",
    "EMPTY_STATE_TITLE": "Chưa có tài liệu nào",
    "EMPTY_STATE_DESC": "Tải lên tài liệu PDF, Markdown hoặc nhập nội dung trực tiếp để xây dựng cơ sở tri thức cho AI",
    "STATUS_PENDING": "Chờ xử lý",
    "STATUS_PROCESSING": "Đang xử lý",
    "STATUS_COMPLETED": "Hoàn thành",
    "STATUS_FAILED": "Thất bại",
    "TABLE_TITLE": "Tiêu đề",
    "TABLE_TYPE": "Loại",
    "TABLE_STATUS": "Trạng thái",
    "TABLE_CHUNKS": "Chunks",
    "TABLE_UPLOADED_BY": "Người tải",
    "TABLE_DATE": "Ngày tạo",
    "DELETE_CONFIRM": "Bạn có chắc chắn muốn xóa tài liệu này? Dữ liệu đã được xử lý trong cơ sở tri thức cũng sẽ bị xóa.",
    "RETRY_CONFIRM": "Thử xử lý lại tài liệu này?",
    "UPLOAD_DRAG_TEXT": "Kéo thả tệp vào đây hoặc nhấn để chọn",
    "UPLOAD_SUPPORTED": "Hỗ trợ: PDF, Markdown (.md), Text (.txt)",
    "UPLOAD_MAX_SIZE": "Kích thước tối đa: 50MB",
    "DETAIL_METRICS": "Thống kê xử lý",
    "DETAIL_CHUNKS_COUNT": "Số khối văn bản",
    "DETAIL_ENTITIES_COUNT": "Số thực thể",
    "DETAIL_RELATIONS_COUNT": "Số mối quan hệ",
    "DETAIL_PROCESSING_TIME": "Thời gian xử lý",
    "DETAIL_TOKEN_USAGE": "Token đã sử dụng"
  }
}
```

---

## 4. Cấu Trúc File Mới (Frontend)

```
frontend/src/app/
├── core/
│   ├── models/
│   │   └── knowledge-base.model.ts              # [NEW]
│   └── services/api/
│       └── knowledge-base-api.service.ts         # [NEW]
├── features/dashboard/
│   ├── dashboard.routes.ts                       # [MODIFY]
│   └── pages/knowledge/
│       ├── knowledge-list/
│       │   ├── knowledge-list.component.ts       # [NEW] Smart Container
│       │   └── knowledge-list.component.html     # [NEW]
│       └── ui/
│           ├── document-table.component.ts       # [NEW] Dumb
│           ├── document-table.component.html     # [NEW]
│           ├── upload-modal.component.ts         # [NEW] Dumb
│           ├── upload-modal.component.html        # [NEW]
│           ├── text-input-modal.component.ts     # [NEW] Dumb
│           ├── text-input-modal.component.html   # [NEW]
│           ├── document-detail-panel.component.ts # [NEW] Dumb
│           ├── document-detail-panel.component.html # [NEW]
│           ├── status-badge.component.ts         # [NEW] Dumb
│           └── ingestion-progress.component.ts   # [NEW] Dumb
└── public/assets/i18n/
    ├── vi.json                                   # [MODIFY]
    └── en.json                                   # [MODIFY]
```

---

## 5. Verification Plan

### Manual Verification
1. **Upload Flow:** Drag & drop PDF → verify loading state → verify document xuất hiện trong list với status `pending` → verify status chuyển `processing` → `completed`
2. **Manual Input:** Mở modal nhập text → nhập markdown → submit → verify ingestion
3. **Delete:** Click delete → confirm → verify document biến mất
4. **Retry:** Document failed → click retry → verify status reset
5. **Responsive:** Test trên mobile viewport (sidebar collapsed) → verify layout
6. **Empty State:** Workspace mới, chưa có document → verify empty state UI
7. **Error Handling:** Upload file quá lớn / sai format → verify error message

### Automated Tests
```bash
# Component tests
ng test --include='**/knowledge/**/*.spec.ts'
```
