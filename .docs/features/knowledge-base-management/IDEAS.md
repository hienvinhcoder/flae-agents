# 💡 Đặc Tả Tính Năng: Quản Lý Cơ Sở Tri Thức (Knowledge Base Management) Cho Agents

Tài liệu này đặc tả chi tiết nghiệp vụ, kiến trúc dữ liệu, API contract và luồng xử lý cho tính năng Quản lý cơ sở tri thức (Knowledge Base) của Agent, áp dụng mô hình logical multi-tenancy bảo mật cao kết hợp hạ tầng Temporal điều phối bền bỉ.

---

## 1. 🎯 Tổng Quan & Luồng Nghiệp Vụ (Flow)

```text
[Chủ Shop (UI)] 
      │ 
      │ 1. Upload File (multipart/form-data)
      ▼
[FastAPI Backend] ──(2. Upload file vật lý)──> [Firebase Storage / GCS]
      │
      ├─ 3. Tạo record (status: PENDING) trong `flae_db` (Postgres)
      │
      ├─ 4. Kích hoạt async ─────────────────> [Temporal Workflow]
      │                                                │
      ▼ (5. Trả response ngay cho UI)                  ├─ Activity 1: Chunking & Trích xuất văn bản
[Giao diện Dashboard]                                  ├─ Activity 2: Lưu chunks & Embeddings vào RAG DB
      ▲                                                ├─ Activity 3: LLM trích xuất nhãn từ nội dung
      │                                                ├─ Activity 4: Cập nhật status & labels vào flae_db
      └──────(6. WebSocket push event realtime)─────────┼─ Activity 5: Publish event qua Redis Pub/Sub
```

1. **Upload tài liệu**: Chủ shop tải lên các tài liệu tri thức (định dạng PDF, DOCX, TXT, MD, dung lượng < 20MB) thông qua giao diện quản trị.
2. **Lưu trữ Cloud Storage**: Backend nhận file dưới dạng `multipart/form-data`, xác thực tenant, sau đó sử dụng Firebase Admin SDK để tải lên GCS bucket theo đường dẫn cô lập: `/workspaces/{workspace_id}/knowledge/{document_id}/{filename}`.
3. **Lưu Metadata**: Backend ghi nhận một record tài liệu mới vào bảng `knowledge_documents` trong database chính `flae_db` với trạng thái ban đầu là `PENDING`.
4. **Kích hoạt Ingestion ngầm**: Backend gọi Temporal Client để khởi động bất đồng bộ một Temporal Workflow xử lý tài liệu (`DocumentIngestionWorkflow`), đồng thời phản hồi thành công ngay lập tức về cho giao diện.
5. **Xử lý Ingestion bền bỉ (Temporal Workers)**:
   * **Bước 1**: Đọc tài liệu từ GCS, trích xuất nội dung văn bản và tiến hành chia nhỏ (chunking).
   * **Bước 2**: Sinh vector embeddings cho các chunks và lưu vào bảng `chunks` trong database tri thức `flae_knowledge_db` (đảm bảo ghi vào phân vùng table và áp dụng RLS tương ứng với `workspace_id`).
   * **Bước 3**: Gửi nội dung mẫu của tài liệu đến LLM, LLM tự phân tích và sinh ra mảng nhãn (labels/tags) phù hợp.
   * **Bước 4**: Cập nhật trạng thái `COMPLETED` (hoặc `FAILED` kèm thông tin lỗi) và danh sách nhãn đã trích xuất vào bảng `knowledge_documents` trong database chính `flae_db`.
   * **Bước 5**: Publish event thay đổi trạng thái lên Redis Pub/Sub để WebSocket server đẩy thông báo cập nhật giao diện thời gian thực (realtime) cho chủ shop.
6. **Xóa tài liệu**: Khi chủ shop thực hiện xóa tài liệu, hệ thống thực hiện dọn dẹp triệt để (hard-delete): xóa file trên GCS, xóa các vector chunks/entities/relationships tương ứng trong database RAG, và xóa record metadata trong DB chính.

---

## 2. 🗄️ Thiết Kế Cơ Sở Dữ Liệu (Database Schema)

### 2.1. Database chính (`flae_db` - PostgreSQL)
Bảng **`knowledge_documents`** quản lý metadata của tài liệu tri thức.

| Trường | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Primary Key, default `uuid_generate_v4()` | ID duy nhất của tài liệu |
| `workspace_id` | `VARCHAR` | NOT NULL, Index | ID của Workspace (Tenant) sở hữu |
| `name` | `VARCHAR` | NOT NULL | Tên file gốc người dùng upload |
| `gcs_path` | `VARCHAR` | NOT NULL | Đường dẫn lưu trữ vật lý của file trên GCS |
| `size` | `INTEGER` | NOT NULL | Dung lượng file (tính bằng bytes) |
| `status` | `VARCHAR` | NOT NULL, default `PENDING` | Trạng thái xử lý: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED` |
| `labels` | `JSONB` | Default `[]` | Mảng chuỗi nhãn tự do do LLM trích xuất (ví dụ: `["product", "shipping_policy"]`) |
| `error_message`| `TEXT` | Nullable | Lưu stacktrace/lý do lỗi nếu trạng thái là `FAILED` |
| `created_at` | `TIMESTAMP` | Default `NOW()` | Thời gian tạo tài liệu |
| `updated_at` | `TIMESTAMP` | Default `NOW()`, on update `NOW()` | Thời gian cập nhật tài liệu |

#### 🔒 Row-Level Security (RLS) Policy trên `knowledge_documents`
Bắt buộc cấu hình RLS trên PostgreSQL để cô lập dữ liệu tuyệt đối giữa các tenant:
```sql
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY knowledge_documents_workspace_isolation_policy ON public.knowledge_documents
USING (workspace_id = current_setting('app.current_workspace_id', true));
```

---

## 3. 🔌 API Contracts

### 3.1. Upload tài liệu tri thức
* **Endpoint**: `POST /api/v1/knowledge-base/upload`
* **Headers**: `Authorization: Bearer <token>`
* **Content-Type**: `multipart/form-data`
* **Request Body**:
  * `file`: File upload (nhận tối đa 20MB, định dạng: pdf, docx, txt, md)
* **Response (DataResponse[KnowledgeDocumentResponse])**:
  ```json
  {
    "code": 200,
    "message": "Upload thành công, đang tiến hành xử lý tài liệu.",
    "data": {
      "id": "e8a1d7f6-9b8e-4a6c-9c7f-db2b4e8a1d7f",
      "workspace_id": "workspace_abc123",
      "name": "chinh_sach_doi_tra.pdf",
      "gcs_path": "/workspaces/workspace_abc123/knowledge/e8a1d7f6-9b8e-4a6c-9c7f-db2b4e8a1d7f/chinh_sach_doi_tra.pdf",
      "size": 154829,
      "status": "PENDING",
      "labels": [],
      "created_at": "2026-05-26T09:50:00Z"
    }
  }
  ```

### 3.2. Lấy danh sách tài liệu tri thức (có phân trang & bộ lọc)
* **Endpoint**: `GET /api/v1/knowledge-base/documents`
* **Headers**: `Authorization: Bearer <token>`
* **Query Parameters**:
  * `page`: `int` (default: 1)
  * `size`: `int` (default: 10)
  * `status`: `str` (optional - filter theo status)
  * `tag`: `str` (optional - filter theo nhãn cụ thể)
* **Response (DataResponse[DocumentListResponse])**:
  ```json
  {
    "code": 200,
    "message": "Lấy danh sách thành công.",
    "data": {
      "items": [
        {
          "id": "e8a1d7f6-9b8e-4a6c-9c7f-db2b4e8a1d7f",
          "name": "chinh_sach_doi_tra.pdf",
          "size": 154829,
          "status": "COMPLETED",
          "labels": ["policy", "return"],
          "created_at": "2026-05-26T09:50:00Z"
        }
      ],
      "total": 1,
      "page": 1,
      "size": 10
    }
  }
  ```

### 3.3. Lấy danh sách nhãn duy nhất (Unique Tags)
* **Endpoint**: `GET /api/v1/knowledge-base/tags`
* **Headers**: `Authorization: Bearer <token>`
* **Response (DataResponse[List[str]])**:
  ```json
  {
    "code": 200,
    "message": "Lấy danh sách nhãn thành công.",
    "data": ["policy", "return", "product_specs", "faq"]
  }
  ```

### 3.4. Xóa tài liệu tri thức (Hard Delete)
* **Endpoint**: `DELETE /api/v1/knowledge-base/documents/{document_id}`
* **Headers**: `Authorization: Bearer <token>`
* **Response (DataResponse[None])**:
  ```json
  {
    "code": 200,
    "message": "Đã xóa tài liệu và dọn dẹp toàn bộ dữ liệu liên quan thành công.",
    "data": null
  }
  ```

---

## 4. ⚙️ Thiết Kế Temporal Workflow & Activities

### 4.1. `DocumentIngestionWorkflow`
Điều phối tiến trình bất đồng bộ bằng Temporal. Mọi hoạt động phải đảm bảo tính deterministic.
```python
class DocumentIngestionWorkflow:
    @workflow.run
    async def run(self, workspace_id: str, document_id: str, gcs_path: str, filename: str) -> None:
        # Cấu hình retry policy mặc định cho các activities dễ lỗi mạng/API
        retry_policy = RetryPolicy(
            initial_interval=timedelta(seconds=5),
            backoff_coefficient=2.0,
            maximum_attempts=5
        )
        
        # 1. Chuyển trạng thái sang PROCESSING
        await workflow.execute_activity(
            UpdateDocumentStatusActivity.run,
            UpdateDocumentStatusInput(workspace_id=workspace_id, document_id=document_id, status="PROCESSING"),
            start_to_close_timeout=timedelta(seconds=30)
        )
        
        try:
            # 2. Extract văn bản và chia nhỏ chunks
            chunks = await workflow.execute_activity(
                ExtractTextAndChunkActivity.run,
                ExtractInput(gcs_path=gcs_path),
                start_to_close_timeout=timedelta(minutes=5),
                retry_policy=retry_policy
            )
            
            # 3. Tạo Embeddings và lưu vào RAG Database (flae_knowledge_db)
            await workflow.execute_activity(
                GenerateEmbeddingsAndSaveActivity.run,
                SaveEmbeddingsInput(workspace_id=workspace_id, document_id=document_id, chunks=chunks, source_name=filename),
                start_to_close_timeout=timedelta(minutes=10),
                retry_policy=retry_policy
            )
            
            # 4. Gọi LLM trích xuất các nhãn tự động từ nội dung
            labels = await workflow.execute_activity(
                ExtractLabelsActivity.run,
                ExtractLabelsInput(chunks=chunks[:3]), # Gửi vài chunks đầu tiên để LLM phân tích ngữ cảnh
                start_to_close_timeout=timedelta(minutes=2),
                retry_policy=retry_policy
            )
            
            # 5. Cập nhật trạng thái COMPLETED và các nhãn vào DB chính
            await workflow.execute_activity(
                UpdateDocumentStatusActivity.run,
                UpdateDocumentStatusInput(workspace_id=workspace_id, document_id=document_id, status="COMPLETED", labels=labels),
                start_to_close_timeout=timedelta(seconds=30)
            )
            
        except Exception as e:
            # Nếu xảy ra lỗi ở bất kỳ bước nào, cập nhật trạng thái FAILED
            await workflow.execute_activity(
                UpdateDocumentStatusActivity.run,
                UpdateDocumentStatusInput(
                    workspace_id=workspace_id, 
                    document_id=document_id, 
                    status="FAILED", 
                    error_message=str(e)
                ),
                start_to_close_timeout=timedelta(seconds=30)
            )
            raise e
```

---

## 5. 🎨 Luồng Giao Diện (Frontend Flow)

### 5.1. Mô hình Phân Tách Components (Angular Standalone)
*   **Smart/Container Component (`KnowledgeBaseComponent`)**:
    *   Quản lý State: danh sách tài liệu (`documents$`), danh sách nhãn (`tags$`), bộ lọc hiện tại (status, tag), trạng thái upload.
    *   Gọi API từ Services để mutate/load dữ liệu.
    *   Lắng nghe qua WebSocket để nhận event `document_status_updated` và cập nhật trực tiếp state `documents$` bằng Signals mà không cần reload trang.
*   **Dumb/Presentational Components**:
    *   `DocumentUploadComponent` (Dumb): Giao diện kéo thả, validate định dạng phía client, phát sự kiện `@Output` khi file được chọn để upload.
    *   `DocumentListComponent` (Dumb): Nhận `@Input` danh sách tài liệu và hiển thị bảng dữ liệu (tên file, dung lượng, trạng thái, nhãn). Phát sự kiện `@Output` khi người dùng nhấn nút xóa tài liệu.
    *   `TagFilterComponent` (Dumb): Nhận `@Input` danh sách tags. Hiển thị bộ lọc và phát sự kiện `@Output` khi thay đổi filter để Smart Component reload data.
