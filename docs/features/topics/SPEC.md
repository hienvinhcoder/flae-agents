# Spec: Chức năng Topics (Chủ đề Tri thức)

> [!IMPORTANT]
> **Historical implementation notes:** Architecture (including Angular and backend architecture), file paths, commands, and testing guidance in this document are historical and are superseded by [`docs/superpowers/specs/2026-07-22-angular-to-react-migration-design.md`](../../superpowers/specs/2026-07-22-angular-to-react-migration-design.md). The product requirements described here remain valid.

## Objective
**Topics** là lớp tổ chức tri thức cấp cao (semantic layer) nằm trên các chunks, documents, entities, relationships và code symbols. Thay vì bắt người dùng phải tổ chức cấu trúc thư mục thủ công, hệ thống tự động gom các thành phần tri thức liên quan vào các **Semantic Clusters** (ví dụ: Billing System, Mobile App, Authentication, MCP Server) để giúp cả AI Agent và người dùng hiểu rõ ngữ cảnh của một khu vực kiến thức.

### Vai trò chính:
- **Tập hợp thông tin có nghĩa:** Gom chunks, documents, entities, relationships, code symbols, decisions, risks vào các chủ đề cụ thể.
- **Tối ưu hóa Retrieval:** Giúp AI/MCP Agent tìm kiếm context nhanh hơn trước khi truy xuất nguồn gốc.
- **Tổng hợp và điều hướng:** Cho phép người dùng xem overview (tổng quan) của một chủ đề, các subtopics, sources liên quan, entities, recent changes và risks.
- **Không phải Source of Truth:** Topic chỉ dùng để tổ chức và điều hướng. Khi AI trả lời, trích dẫn (citation) phải trỏ về nguồn tài liệu gốc (như Notion, Slack, Google Drive, GitHub PR, code file), không trích dẫn trực tiếp từ Topic summary.

---

## Tech Stack
- **Backend:** FastAPI, SQLAlchemy (Async), PostgreSQL (rag_db với pgvector extension), Redis (Pub/Sub & Cache), Pydantic v2.
- **Frontend:** Angular 18 (Standalone, Signals, Tailwind CSS, Lucide Icons).
- **AI Model:** Gemini 2.5 Flash / Gemini 1.5 Pro.

---

## Commands
### Backend
- **Tải dependencies và chạy backend:**
  ```bash
  cd backend
  uv sync
  uv run fastapi dev main.py
  ```
- **Chạy Tests:**
  ```bash
  cd backend
  uv run pytest tests/
  ```

### Frontend
- **Chạy Dev Server:**
  ```bash
  cd frontend
  npm run start
  ```
- **Build & Lint:**
  ```bash
  cd frontend
  npm run build
  npm run lint
  ```

---

## Project Structure
Dự án sẽ sửa đổi và bổ sung các file sau để hiện thực hóa tính năng Topics:

```text
backend/app/
├── db/
│   └── rag_db.py             [MODIFY]  ← Định nghĩa DDL khởi tạo các bảng Topics và RLS policies trong RAG DB
├── models/
│   └── topic.py              [NEW]     ← SQLAlchemy models cho Topics (nếu cần sync hoặc định nghĩa schema)
├── schemas/
│   └── sche_topic.py         [NEW]     ← Pydantic validation schemas cho API
├── services/
│   └── srv_topic.py          [NEW]     ← Xử lý logic clustering, auto-assignment, queue processing, LLM summary
└── api/v1/
    ├── api_router.py         [MODIFY]  ← Đăng ký router topics
    └── endpoints/
        └── topic.py          [NEW]     ← API endpoints phục vụ cho UI

frontend/src/app/
├── core/
│   ├── models/
│   │   └── topic.model.ts    [NEW]     ← TypeScript interfaces cho Topic
│   ├── services/
│   │   └── api/
│   │       └── topics-api.service.ts [NEW] ← Service gọi các API liên quan tới Topics
│   └── layout/
│       └── admin-layout/
│           └── ui/
│               └── sidebar.component.ts  [MODIFY] ← Thêm menu "Topics" vào thanh điều hướng
└── features/
    └── topics/               [NEW]     ← Feature độc lập quản lý Topics
        ├── topics.routes.ts  [NEW]     ← Định nghĩa router cho Topics (lazy loaded)
        ├── pages/
        │   ├── topic-list/
        │   │   └── topic-list.component.ts   [NEW] ← Giao diện danh sách và tìm kiếm Topic
        │   └── topic-detail/
        │       └── topic-detail.component.ts [NEW] ← Giao diện chi tiết Topic (Summary, Current state, liên kết...)
        └── ui/
            ├── topic-card/
            │   └── topic-card.component.ts   [NEW] ← Component con hiển thị thông tin ngắn của topic
            └── topic-merge-dialog/
                └── topic-merge-dialog.component.ts [NEW] ← Dialog hỗ trợ gộp các topic trùng lặp
```

---

## Database Schema (RAG DB)
Các bảng dưới đây sẽ được khởi tạo trong `rag_db` để tận dụng `pgvector` và cơ chế phân vùng bảng (Partition Table) / RLS theo `workspace_id`.

### 1. `topics`
Bảng lưu trữ thông tin thực thể Topic. Không khai báo FOREIGN KEY tự tham chiếu trên `parent_topic_id` ở mức DB để tránh các lỗi ràng buộc đặc thù của Partition Table (như lỗi `ON DELETE SET NULL`), việc này sẽ được xử lý an toàn tại tầng Application Service.
```sql
CREATE TABLE IF NOT EXISTS {schema}.topics (
    workspace_id TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    parent_topic_id TEXT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    type TEXT NOT NULL, -- 'domain' | 'topic' | 'subtopic'
    summary TEXT,
    current_state TEXT,
    status TEXT NOT NULL, -- 'active' | 'archived' | 'needs_review'
    confidence FLOAT DEFAULT 1.0,
    embedding vector({embedding_dimensions}),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (workspace_id, topic_id),
    CONSTRAINT uq_topics_workspace_slug UNIQUE (workspace_id, slug)
) PARTITION BY LIST (workspace_id);
```

### 2. `topic_memberships`
Bảng liên kết Topic với các đối tượng dữ liệu tri thức khác. Trạng thái `status` giúp quản lý vòng đời của membership (ví dụ: chuyển sang `inactive` thay vì xóa cứng khi tài liệu nguồn bị xóa).
```sql
CREATE TABLE IF NOT EXISTS {schema}.topic_memberships (
    workspace_id TEXT NOT NULL,
    membership_id TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    member_type TEXT NOT NULL, -- 'chunk' | 'document' | 'entity' | 'relationship' | 'fact' | 'code_symbol' | 'stale_doc_finding'
    member_id TEXT NOT NULL,
    relevance_score FLOAT DEFAULT 1.0,
    evidence_count INT DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'inactive'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (workspace_id, membership_id),
    FOREIGN KEY (workspace_id, topic_id) REFERENCES {schema}.topics (workspace_id, topic_id) ON DELETE CASCADE,
    CONSTRAINT uq_topic_memberships_workspace_member UNIQUE (workspace_id, topic_id, member_type, member_id)
) PARTITION BY LIST (workspace_id);
```

### 3. `topic_aliases`
Hỗ trợ merge và alias để gom các chủ đề trùng lặp.
```sql
CREATE TABLE IF NOT EXISTS {schema}.topic_aliases (
    workspace_id TEXT NOT NULL,
    alias_id TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    alias TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (workspace_id, alias_id),
    FOREIGN KEY (workspace_id, topic_id) REFERENCES {schema}.topics (workspace_id, topic_id) ON DELETE CASCADE,
    CONSTRAINT uq_topic_aliases_workspace_alias UNIQUE (workspace_id, topic_id, alias)
) PARTITION BY LIST (workspace_id);
```

### 4. `topic_update_queue`
Hàng đợi để cập nhật Topic một cách bất đồng bộ (batch/debounce).
```sql
CREATE TABLE IF NOT EXISTS {schema}.topic_update_queue (
    workspace_id TEXT NOT NULL,
    queue_id TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    reason TEXT,
    changed_member_ids JSONB, -- Mảng các {member_type, member_id} thay đổi
    status TEXT NOT NULL, -- 'pending' | 'processing' | 'completed' | 'failed'
    scheduled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (workspace_id, queue_id),
    FOREIGN KEY (workspace_id, topic_id) REFERENCES {schema}.topics (workspace_id, topic_id) ON DELETE CASCADE
) PARTITION BY LIST (workspace_id);
```

---

## Row-Level Security (RLS) & Workspace Context
Hệ thống sử dụng cơ chế bảo mật cô lập đa khách thuê (Multi-tenancy Isolation) ở mức cơ sở dữ liệu thông qua Row-Level Security (RLS) của PostgreSQL:

1. **Cấu hình Policy**: Mỗi bảng (`topics`, `topic_memberships`, `topic_aliases`, `topic_update_queue`) đều được cấu hình policy kiểm tra:
   ```sql
   USING (workspace_id = current_setting('app.current_workspace_id', true))
   ```
2. **FastAPI Context Injection**: Trong mỗi API request, khi mở một transaction/connection đến DB RAG, backend bắt buộc thực hiện câu lệnh:
   ```sql
   SET LOCAL app.current_workspace_id = :workspace_id;
   ```
   Điều này đảm bảo mọi câu lệnh SELECT, INSERT, UPDATE, DELETE do FastAPI thực thi chỉ được phép tác động lên các dòng dữ liệu thuộc `workspace_id` hiện tại của request session. Mọi nỗ lực truy cập chéo workspace sẽ bị chặn ngay tại DB Engine.

---

## Topic Ingestion & Assignment Pipeline
Quy trình xử lý Topic khi hệ thống thực hiện ingest/update Chunk được thực hiện thông qua các bước sau để tối ưu hóa chi phí token và đảm bảo tính chính xác:

1. **Embedding Processing:** Hệ thống sinh mới hoặc tái sử dụng embedding hiện có của chunk.
2. **Pre-filtering:** Thực hiện lọc trước (pre-filter) top 5-10 candidate topics bằng cách kết hợp vector similarity, alias match (tra cứu trong bảng `topic_aliases`), source metadata, và mức độ trùng lặp thực thể (entity overlap).
3. **LLM Extraction Integration:** Trong cùng một lần gọi LLM để trích xuất Entities/Relationships từ chunk, yêu cầu LLM trả thêm thông tin gợi ý về chủ đề gồm `topic_assignments` (gán vào các topic có sẵn từ bước pre-filter) và `topic_candidates` (đề xuất các topic mới nếu có).
4. **Backend Resolve:** Backend giải quyết (resolve) topic assignment bằng các quy tắc chấm điểm (scoring rules), tuyệt đối không tin cậy hoàn toàn vào đầu ra của LLM. Điểm số được tính toán dựa trên:
   - Match score từ LLM (confidence)
   - Vector similarity giữa chunk embedding và topic embedding
   - Trùng lặp entities/concepts
   - Alias matching
5. **Membership Creation:** Nếu score sau khi tính toán >= `AUTO_ASSIGN_THRESHOLD`, tự động tạo bản ghi liên kết trong bảng `topic_memberships`.
6. **Candidate Recommendation:** Nếu không khớp với bất kỳ topic hiện hữu nào nhưng có đủ bằng chứng (evidence) từ nhiều chunks hoặc sources khác nhau (ví dụ: >= 3 chunks hoặc >= 2 sources khác nhau có độ tương đồng cao), hệ thống tự động tạo topic candidate mới với trạng thái `status = 'needs_review'`.
7. **Queue Marking:** Đẩy các topics bị ảnh hưởng (affected topics) vào hàng đợi `topic_update_queue` để xử lý tiếp.
8. **Async Summary Update:** Các trường `summary` và `current_state` của topic chỉ được cập nhật bất đồng bộ (async) thông qua hàng đợi `topic_update_queue` với cơ chế debounce thích hợp để tránh gọi LLM quá tải.

**Định dạng đầu ra mong muốn từ LLM call:**
```json
{
  "entities": [],
  "relations": [],
  "topic_assignments": [
    {
      "topic_id": "topic_billing",
      "confidence": 0.88,
      "reason": "Chunk discusses Stripe webhook retry."
    }
  ],
  "topic_candidates": [
    {
      "name": "Usage-Based Billing",
      "confidence": 0.72,
      "reason": "Repeated mention of usage-based pricing."
    }
  ]
}
```

---

## Code Style
Tuân thủ tiêu chuẩn [flae-code.md](file:///Users/nguyenhienvinh/projects/flae-agents/.agents/rules/flae-code.md):
- **FastAPI Backend:**
  - Không truy cập database trực tiếp tại API Router. Mọi câu lệnh gọi SQL/SQLAlchemy phải nằm trong `srv_topic.py`.
  - Phân tách rõ các Pydantic schema nhập vào và trả ra. Trả về đúng định dạng chuẩn `DataResponse[T]`.
- **Angular Frontend:**
  - Sử dụng **Angular Signals** (`signal`, `computed`, `effect`) và Signal-based inputs/outputs để quản lý component state.
  - Phân chia rõ **Smart Components** (ở `pages/`) chịu trách nhiệm gọi API, lưu trạng thái và **Dumb Components** (ở `ui/`) chỉ nhận data và emit event.

---

## Testing Strategy
- **Backend Tests:**
  - Viết test suite cho `TopicService`:
    - Test cơ chế tự động phân loại chunk/entity vào topic dựa trên vector similarity (tự giả lập embeddings).
    - Test cơ chế gộp topic (`merge_topics`) và cập nhật alias.
    - Test hàng đợi cập nhật queue (`topic_update_queue`) chạy debounce thành công.
  - Viết Integration Tests cho các endpoint API `/api/v1/topics/*`.
- **Frontend Tests:**
  - Viết các Angular unit test cơ bản cho component `TopicListComponent` và `TopicDetailComponent` bằng mocks của `TopicsApiService`.

---

## Boundaries
- **Always do:**
  - Đảm bảo cơ chế Row-Level Security (RLS) được áp dụng chặt chẽ cho toàn bộ API và các câu lệnh truy vấn Topic. Người dùng không được phép nhìn thấy topic hoặc evidence của Workspace khác.
  - Lọc bỏ các từ khóa quá chung chung khi AI đề xuất Candidate Topic (ví dụ: "backend", "update", "API").
- **Ask first:**
  - Thay đổi thuật toán tính match score hoặc thay đổi threshold tự động gán (`AUTO_ASSIGN_THRESHOLD` mặc định là 0.75).
- **Never do:**
  - Trích dẫn trực tiếp nội dung Summary của Topic trong phần câu trả lời của AI. Phải trích dẫn liên kết của tài liệu/nguồn gốc (Notion, Slack, file...).
  - Thực hiện build/regenerate summary của Topic đồng bộ ngay lập tức sau mỗi lần có chunk mới nhằm tránh overload LLM API và tăng latency. Phải đi qua `topic_update_queue`.

---

## Success Criteria
1. **Auto Ingestion & Clustering:** Sau khi ingest một tài liệu, các chunks và entities mới được tự động liên kết tới Topic tương ứng nếu độ tương đồng đạt chuẩn. Nếu không có topic phù hợp nhưng tích lũy đủ evidence, một topic candidate mới được tạo dưới dạng `needs_review`.
2. **Batch & Debounce Summary:** Summary của topic không bị sinh lại liên tục mà được debounce thông qua hàng đợi `topic_update_queue` để gọi LLM theo batch.
3. **Semantic & Hybrid Search:** Người dùng có thể tìm kiếm topics bằng ngôn ngữ tự nhiên thông qua kết hợp keyword, vector search và đồ thị quan hệ.
4. **Interactive UI:** Người dùng có thể quản lý, xem chi tiết, đổi tên, gộp (merge) và lưu trữ (archive) các topics.
5. **AI Agent Citation:** AI agent sử dụng topics để định hướng tìm kiếm thông tin nhanh hơn, nhưng câu trả lời của AI trích dẫn đúng tài liệu nguồn gốc thay vì trích dẫn Topic.

---

## Open Questions & Assumptions
### Giả định của hệ thống (Assumptions):
1. Hệ thống đã triển khai đầy đủ việc lưu trữ `chunks` và `entities` trong `rag_db` phân vùng theo `workspace_id`.
2. Model LLM (Gemini) được tích hợp qua LangChain trong dự án có khả năng generate embedding và tóm tắt văn bản chất lượng cao.

### Câu hỏi mở cần thảo luận (Open Questions):
1. **Hệ thống phân cấp (Hierarchy):** Topic có hỗ trợ hierarchy (`parent_topic_id`). MVP có nên tự động xác định mối quan hệ cha-con (ví dụ: Stripe Webhook là subtopic của Billing System) bằng LLM hay tạm thời để người dùng cấu hình thủ công và AI chỉ tự động gán phẳng?
   - *Đề xuất:* AI sẽ tự động gán phẳng, và khi gom cụm lớn AI có thể đề xuất liên kết cha-con nhưng cần user duyệt ở trang UI.
2. **Threshold cho Auto Assign:** Threshold tương đồng vector để gán tự động nên là bao nhiêu để cân bằng giữa độ chính xác và khả năng tự động hóa?
   - *Đề xuất:* Đặt mặc định `AUTO_ASSIGN_THRESHOLD = 0.75` (cosine similarity) và có thể cấu hình được qua biến môi trường.
