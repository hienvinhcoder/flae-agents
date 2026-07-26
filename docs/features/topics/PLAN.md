# Kế hoạch Triển khai: Chức năng Topics (Chủ đề Tri thức)

> [!IMPORTANT]
> **Historical implementation notes:** Architecture (including Angular and backend architecture), file paths, commands, and testing guidance in this document are historical and are superseded by [`docs/superpowers/specs/2026-07-22-angular-to-react-migration-design.md`](../../superpowers/specs/2026-07-22-angular-to-react-migration-design.md). The product requirements described here remain valid.

Tài liệu này mô tả chi tiết kế hoạch hiện thực hóa tính năng **Topics** nhằm tổ chức tri thức dạng semantic cluster trên hệ thống **FLAE Agents**. Kế hoạch bao gồm các thay đổi cấu trúc cơ sở dữ liệu PostgreSQL (rag_db), tích hợp pipeline tự động gom cụm khi ingest tài liệu, xây dựng API endpoints bất đồng bộ và thiết kế giao diện quản lý trên Angular 18 sử dụng Signals. Đặc biệt, hệ thống sẽ sử dụng **Temporal** để quản lý background task cập nhật tóm tắt topic.

---

## User Review Required

> [!IMPORTANT]
> **1. Đồng bộ database RAG DB và RLS Policies**
> - Cơ chế phân vùng (Partition Table) và RLS được cài đặt trực tiếp trong file `rag_db.py` thông qua DDL thô, thay vì chạy qua Alembic. Cần đặc biệt chú ý kiểm tra RLS policy để tránh rò rỉ dữ liệu giữa các workspace (multi-tenancy).
> - Để thuận tiện cho việc truy vấn ORM trong `srv_topic.py`, chúng ta sẽ khởi tạo một SQLAlchemy declarative base riêng biệt (`RAGBase`) cho RAG DB, tránh dùng chung với `Base` của `flae_db` để tránh xung đột cấu hình metadata.
>
> **2. Tác động Hiệu năng khi Ingestion & Quản lý Background Tasks bằng Temporal**
> - Quá trình trích xuất Entities/Relationships từ chunk sẽ được bổ sung bước Pre-filtering để lấy danh sách topic ứng viên và đưa vào prompt của LLM.
> - Việc sinh tóm tắt (`summary`, `current_state`) của topic sẽ chạy bất đồng bộ qua **Temporal Workflow** (`TopicUpdateWorkflow`) để tránh gọi LLM quá tải đồng thời (áp dụng debounce bằng `workflow.sleep` và unique Workflow ID theo `topic_id`).

---

## Proposed Changes

### 1. Database & Models (RAG DB)

#### [MODIFY] [rag_db.py](file:///Users/nguyenhienvinh/projects/flae-agents/backend/app/db/rag_db.py)
- Cập nhật hàm `_init_db()` để thực hiện các câu lệnh DDL khởi tạo 4 bảng mới: `topics`, `topic_memberships`, `topic_aliases`, `topic_update_queue` như đặc tả.
- Cập nhật hàm `_ensure_partition()` để tự động tạo phân vùng (partition tables) con cho 4 bảng trên khi có `workspace_id` mới.
- Kích hoạt Row-Level Security (RLS) cho 4 bảng mới và tạo RLS policies tương tự như các bảng hiện tại.

#### [NEW] [topic.py](file:///Users/nguyenhienvinh/projects/flae-agents/backend/app/models/topic.py)
- Định nghĩa `RAGBase = declarative_base()` để map riêng các thực thể trong RAG DB.
- Định nghĩa SQLAlchemy ORM classes:
  - `Topic(RAGBase)`: Map tới bảng `topics`.
  - `TopicMembership(RAGBase)`: Map tới bảng `topic_memberships`.
  - `TopicAlias(RAGBase)`: Map tới bảng `topic_aliases`.
  - `TopicUpdateQueue(RAGBase)`: Map tới bảng `topic_update_queue`.

---

### 2. Validation Schemas & APIs

#### [NEW] [sche_topic.py](file:///Users/nguyenhienvinh/projects/flae-agents/backend/app/schemas/sche_topic.py)
- Định nghĩa các Pydantic schemas cho API:
  - `TopicBase`, `TopicCreate`, `TopicUpdate`
  - `TopicListItem`: Trả về danh sách topic kèm thống kê số evidence.
  - `TopicDetailResponse`: Chi tiết topic cùng danh sách các documents, chunks, entities, relationships liên quan.
  - `TopicMergeRequest`: Payload chứa `target_topic_id` và danh sách `source_topic_ids` để thực hiện gộp.

#### [NEW] [topic.py](file:///Users/nguyenhienvinh/projects/flae-agents/backend/app/api/v1/endpoints/topic.py)
- Khai báo các API routes:
  - `GET /`: Danh sách và tìm kiếm topics (hỗ trợ search, filter status, pagination).
  - `GET /{topic_id_or_slug}`: Chi tiết một topic.
  - `PUT /{topic_id}`: Cập nhật thông tin topic (đổi tên, thay đổi status, chỉnh sửa summary thủ công).
  - `POST /merge`: Gộp các topic trùng lặp.
- Sử dụng dependency `get_current_workspace_id` để lấy và truyền workspace context. Kết nối và query qua `rag_db_manager.get_async_session(workspace_id)`.

#### [MODIFY] [api_router.py](file:///Users/nguyenhienvinh/projects/flae-agents/backend/app/api/v1/api_router.py)
- Đăng ký `topic.router` với prefix `/workspaces/{workspace_id}/topics` và tag `topics`.

---

### 3. Business Logic Services & AI Pipelines

#### [NEW] [srv_topic.py](file:///Users/nguyenhienvinh/projects/flae-agents/backend/app/services/srv_topic.py)
- Hiện thực hóa các nghiệp vụ chính cho Topic:
  - `get_topics(...)`: Truy vấn RAG DB lấy danh sách topics.
  - `get_topic_detail(...)`: Truy vấn thông tin chi tiết và các memberships của topic.
  - `merge_topics(...)`: Xử lý gộp topic:
    1. Cập nhật các bản ghi `topic_memberships` từ các topic nguồn sang topic đích.
    2. Tạo bản ghi `topic_aliases` từ tên của các topic nguồn trỏ về topic đích.
    3. Đẩy topic đích vào hàng đợi cập nhật `topic_update_queue`.
    4. Xóa các topic nguồn.
    5. Trigger Temporal workflow cập nhật topic đích.
  - `pre_filter_topics(...)`: Lọc nhanh danh sách topic ứng viên dựa trên vector similarity (cosine distance với chunk embedding), text match và alias match.
  - `resolve_topic_assignments(...)`: Thực hiện tính toán match score cho các đề xuất gán topic từ LLM, tự động tạo membership nếu score >= `AUTO_ASSIGN_THRESHOLD` (mặc định 0.75), hoặc đề xuất candidate topic mới nếu tích lũy đủ evidence. Trả về danh sách `topic_id` bị ảnh hưởng.
  - `enqueue_topic_update(...)`: Đẩy topic vào hàng đợi cập nhật.
  - `trigger_topic_updates_via_temporal(...)`: Gọi Temporal client để khởi chạy `TopicUpdateWorkflow` cho các topic bị ảnh hưởng.

#### [MODIFY] [prompts.py](file:///Users/nguyenhienvinh/projects/flae-agents/backend/app/agents/extractor/prompts.py)
- Cập nhật prompt `ENTITY_EXTRACTION_SYSTEM` để hướng dẫn LLM cách gán topic (dựa trên danh sách ứng viên truyền vào) và đề xuất candidate topic mới.
- Định nghĩa định dạng kết quả trích xuất topic bằng delimiter:
  - `topic_assignment<|#|>topic_id<|#|>confidence<|#|>reason`
  - `topic_candidate<|#|>topic_name<|#|>confidence<|#|>reason`

#### [MODIFY] [state.py](file:///Users/nguyenhienvinh/projects/flae-agents/backend/app/agents/extractor/state.py)
- Bổ sung các trường vào `ExtractionState`:
  - `candidate_topics: List[Dict]` (Danh sách các topics được pre-filter để truyền vào LLM)
  - `topic_assignments: List[Dict]` (Kết quả gán của LLM)
  - `topic_candidates: List[Dict]` (Đề xuất topic mới từ LLM)

#### [MODIFY] [nodes.py](file:///Users/nguyenhienvinh/projects/flae-agents/backend/app/agents/extractor/nodes.py)
- Cập nhật `prepare_prompts_node` để định dạng danh sách candidate topics vào system/user prompt.
- Cập nhật `_parse_llm_output()` để parse thêm các dòng `topic_assignment` và `topic_candidate` từ kết quả của LLM.
- Cập nhật `extract_first_pass_node` và `extract_gleaning_node` để truyền kết quả trích xuất topic vào state.

#### [MODIFY] [graph.py](file:///Users/nguyenhienvinh/projects/flae-agents/backend/app/agents/extractor/graph.py)
- Cập nhật `run_extraction_agent` để nhận tham số `candidate_topics` và đưa vào trạng thái ban đầu của Graph.

#### [MODIFY] [ingestion_service.py](file:///Users/nguyenhienvinh/projects/flae-agents/backend/app/services/knowalge_base/ingestion_service.py)
- Cập nhật `extract_entities_from_chunks`:
  - Gọi `TopicService.pre_filter_topics` cho mỗi chunk trước khi chạy agent trích xuất.
  - Nhận lại `topic_assignments` và `topic_candidates` từ kết quả trả về của agent.
- Cập nhật `fuse_and_save`:
  - Gom các đề xuất gán và candidate topics từ tất cả các chunks.
  - Gọi `TopicService.resolve_topic_assignments` để gán và đưa các topics vào queue. Trả về danh sách `topic_ids` bị ảnh hưởng.

---

### 4. Tích hợp Temporal cho Background Tasks (Topics)

#### [NEW] [topic.py](file:///Users/nguyenhienvinh/projects/flae-agents/backend/app/temporal/workflows/topic.py)
- Định nghĩa **`TopicUpdateWorkflow`**:
  - Nhận vào: `workspace_id`, `topic_id`.
  - Thực hiện **debounce**: `await workflow.sleep(timedelta(seconds=20))` để đợi các thao tác ingest trong cùng batch hoàn tất.
  - Gọi activity `update_topic_summary_activity`.
  - Workflow ID: `f"topic-update-{workspace_id}-{topic_id}"` kèm theo `WorkflowIDReusePolicy.ALLOW_DUPLICATE_FAILED_ONLY` hoặc tương ứng để tránh chạy song song cho cùng 1 topic (chỉ chạy 1 instance cập nhật tại 1 thời điểm).

#### [NEW] [topic.py](file:///Users/nguyenhienvinh/projects/flae-agents/backend/app/temporal/activities/topic.py)
- Định nghĩa **`update_topic_summary_activity`**:
  - Chuyển trạng thái queue sang `processing`.
  - Gọi LLM tóm tắt chủ đề dựa trên nội dung tất cả chunks, entities, relationships liên quan thuộc `topic_id`.
  - Cập nhật `summary` và `current_state` của topic trong `rag_db`.
  - Chuyển trạng thái queue sang `completed`.

#### [MODIFY] [activities/ingestion.py](file:///Users/nguyenhienvinh/projects/flae-agents/backend/app/temporal/activities/ingestion.py)
- Cập nhật activity `finalize_ingestion` (hoặc tạo một activity riêng biệt `trigger_topic_updates_activity`) để truy vấn các topic 'pending' trong queue và kích hoạt `TopicUpdateWorkflow` thông qua Temporal client.

#### [MODIFY] [workflows/ingestion.py](file:///Users/nguyenhienvinh/projects/flae-agents/backend/app/temporal/workflows/ingestion.py)
- Thêm bước gọi activity kích hoạt tóm tắt topic ở cuối workflow sau khi `finalize_ingestion` hoàn tất.

---

### 5. Frontend Angular Development

#### [NEW] [topic.model.ts](file:///Users/nguyenhienvinh/projects/flae-agents/frontend/src/app/core/models/topic.model.ts)
- Định nghĩa các TypeScript interfaces: `Topic`, `TopicMembership`, `TopicAlias`, `TopicListItem`, `TopicDetail`, `TopicMergePayload`.

#### [NEW] [topics-api.service.ts](file:///Users/nguyenhienvinh/projects/flae-agents/frontend/src/app/core/services/api/topics-api.service.ts)
- Cung cấp các methods gọi API của backend: `getTopics`, `getTopic`, `updateTopic`, `mergeTopics`.

#### [MODIFY] [sidebar.component.ts](file:///Users/nguyenhienvinh/projects/flae-agents/frontend/src/app/core/layout/admin-layout/ui/sidebar.component.ts)
- Thêm menu "Topics" vào group "Knowledge":
  ```typescript
  { name: 'Topics', path: '/dashboard/topics', icon: 'tags', translationKey: 'NAV.TOPICS' }
  ```
- Import icon `Tags` nếu Lucide Angular chưa có sẵn.

#### [MODIFY] [vi.json](file:///Users/nguyenhienvinh/projects/flae-agents/frontend/public/assets/i18n/vi.json) & [en.json](file:///Users/nguyenhienvinh/projects/flae-agents/frontend/public/assets/i18n/en.json)
- Bổ sung translation keys cho giao diện Topics (ví dụ: `NAV.TOPICS: "Chủ đề tri thức"`, các thông báo thành công/lỗi, nhãn biểu mẫu, nút thao tác).

#### [NEW] [topics.routes.ts](file:///Users/nguyenhienvinh/projects/flae-agents/frontend/src/app/features/topics/topics.routes.ts)
- Cấu hình lazy-loaded routes cho feature `topics`.
- `/dashboard/topics` -> `TopicListComponent`
- `/dashboard/topics/:id` -> `TopicDetailComponent`

#### [NEW] [topic-list.component.ts](file:///Users/nguyenhienvinh/projects/flae-agents/frontend/src/app/features/topics/pages/topic-list/topic-list.component.ts) (Smart Component)
- Sử dụng Signals quản lý state (danh sách topic, từ khóa tìm kiếm, status filter, loading state).
- Tích hợp pagination, nút "Gộp chủ đề" (mở dialog gộp) và điều hướng tới trang chi tiết.

#### [NEW] [topic-detail.component.ts](file:///Users/nguyenhienvinh/projects/flae-agents/frontend/src/app/features/topics/pages/topic-detail/topic-detail.component.ts) (Smart Component)
- Hiển thị thông tin chi tiết: Tên, Summary (sử dụng Markdown viewer), Current State, Confidence, Status.
- Sử dụng tab để hiển thị các liên kết tri thức:
  - Tab Chunks: Danh sách chunks văn bản.
  - Tab Documents: Danh sách documents chứa evidence.
  - Tab Entities: Các thực thể liên quan và frequency.
- Các tính năng: Edit Name/Status, Trigger Async Re-summary (thông qua start Temporal Workflow), Archive Topic.

#### [NEW] [topic-card.component.ts](file:///Users/nguyenhienvinh/projects/flae-agents/frontend/src/app/features/topics/ui/topic-card/topic-card.component.ts) (Dumb Component)
- Hiển thị card tóm tắt nhanh của topic: tên, số lượng evidence, loại (domain/topic/subtopic), trạng thái.

#### [NEW] [topic-merge-dialog.component.ts](file:///Users/nguyenhienvinh/projects/flae-agents/frontend/src/app/features/topics/ui/topic-merge-dialog/topic-merge-dialog.component.ts) (Dumb Component)
- Modal cho phép chọn 1 Topic làm đích (Target) và chọn nhiều Topics khác làm nguồn (Sources) để gộp. Có nút xác nhận và hủy.

---

## Verification Plan

### Automated Tests
- **Backend Service Tests**:
  - Viết test suite trong `backend/tests/services/test_topic_service.py` để xác thực:
    - Cơ chế Pre-filtering tìm kiếm topic ứng viên chính xác.
    - Cơ chế Backend Resolve tính toán điểm số và gán/tạo candidate chính xác.
    - Logic gộp topic (`merge_topics`) cập nhật membership, alias và xóa topic cũ.
  - Viết test Temporal Workflow/Activity trong `backend/tests/temporal/test_topic_workflow.py` để kiểm tra:
    - Workflow `TopicUpdateWorkflow` và activity `update_topic_summary_activity` hoạt động chính xác.
- **Backend API Integration Tests**:
  - Viết test suite trong `backend/tests/api/test_topic_api.py` để test các endpoints: List, Detail, Update, Merge.
- **Frontend Unit Tests**:
  - Viết test cơ bản cho `TopicListComponent` và `TopicDetailComponent` bằng Mock `TopicsApiService`.

### Manual Verification
- Ingest tài liệu mới qua UI Knowledge Base.
- Kiểm tra danh sách Topics xem có tự động gom cụm các chunks và entities mới hay không.
- Kiểm tra Temporal Web UI (nếu có) để xem các workflow `TopicUpdateWorkflow` được kích hoạt và chạy thành công.
- Thử nghiệm tính năng "Gộp chủ đề" (Merge Topics) trên UI để gộp các topic trùng lặp, kiểm tra xem các entities/chunks có tự động map về topic đích và topic nguồn có bị xóa.
- Xem chi tiết Topic, kiểm tra hiển thị Markdown của Summary và tab danh sách documents/chunks/entities liên quan.
