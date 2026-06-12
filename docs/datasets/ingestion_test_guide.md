# Hướng Dẫn Kiểm Thử Quy Trình Document Ingestion (TGS-RAG)

Tài liệu này hướng dẫn chi tiết cách chạy thử (trigger) bằng dữ liệu mẫu và đối chiếu kết quả truy vấn trong cơ sở dữ liệu (`flae_db` và `rag_db`) để xác định xem quy trình **Document Ingestion** đã chạy **ĐẠT** yêu cầu hay chưa.

---

## 1. Dữ Liệu Mẫu Sử Dụng Để Test
Chúng ta sẽ sử dụng file dữ liệu mẫu đã được thiết lập sẵn tại: [sample_data.md](file:///Users/nguyenhienvinh/projects/flae-agents/docs/datasets/sample_data.md)

Nội dung của file này gồm 3 phần rõ rệt, chứa các thực thể lặp lại (*TechVibe*, *Nguyễn Minh Trí*, *VibeAI*, *VietBank*, *AWS*) để kiểm tra khả năng chia chunk và gộp thực thể.

---

## 2. Các Bước Thực Hiện Trigger Test

### Bước 1: Gửi Request Ingest Dữ Liệu Mẫu
Sử dụng endpoint nhập text trực tiếp (Manual Input) để kiểm tra nhanh. Thay thế các token và ID bằng thông tin môi trường của bạn:

```bash
curl -X POST "http://localhost:8000/api/v1/knowledge/manual" \
  -H "Authorization: Bearer <FIREBASE_JWT_TOKEN>" \
  -H "X-Workspace-Id: <WORKSPACE_UUID>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Tài liệu mẫu TechVibe",
    "description": "Test Ingestion & Fusion pipeline",
    "content_text": "## Phần 1: Giới thiệu về Tập đoàn TechVibe\nTập đoàn Công nghệ TechVibe là một doanh nghiệp hàng đầu trong lĩnh vực trí tuệ nhân tạo tại Việt Nam. TechVibe được thành lập vào năm 2024 bởi ông Nguyễn Minh Trí, một chuyên gia lâu năm về Machine Learning. Trụ sở chính của TechVibe được đặt tại Thành phố Hồ Chí Minh. Ngay từ khi thành lập, công ty đã tập trung nghiên cứu sản phẩm cốt lõi mang tên VibeAI, một hệ thống AI Assistant thế hệ mới hỗ trợ doanh nghiệp tối ưu hóa quy trình vận hành và chăm sóc khách hàng tự động.\n\n## Phần 2: Sự hợp tác giữa TechVibe và Ngân hàng VietBank\nVào tháng 5 năm 2025, Tập đoàn Công nghệ TechVibe đã ký kết thỏa thuận hợp tác chiến lược với Ngân hàng VietBank. Đại diện ký kết phía TechVibe là ông Nguyễn Minh Trí trong vai trò Tổng Giám đốc. Theo thỏa thuận này, VietBank sẽ tích hợp hệ thống trợ lý ảo VibeAI vào ứng dụng ngân hàng số của mình nhằm cải thiện trải nghiệm người dùng. Dự án hợp tác này được kỳ vọng sẽ giúp ngân hàng VietBank giảm thiểu 40% thời gian phản hồi yêu cầu từ khách hàng.\n\n## Phần 3: Công nghệ của VibeAI trên hạ tầng Cloud\nSản phẩm VibeAI của TechVibe được phát triển dựa trên các mô hình ngôn ngữ lớn (LLM) tiên tiến nhất và chạy trên hạ tầng điện toán đám mây Amazon Web Services (AWS). Hệ thống VibeAI áp dụng kiến trúc Microservices để đảm bảo khả năng mở rộng quy mô lớn khi phục vụ hàng triệu người dùng cùng lúc. Đối tác ngân hàng VietBank đánh giá rất cao độ bảo mật và tính ổn định của giải pháp này khi vận hành thử nghiệm trên môi trường cloud của AWS."
  }'
```

*Sau khi gửi thành công, API sẽ trả về `id` của document dưới dạng UUID. Hãy lưu lại giá trị này (Ví dụ: `e3a5c2d8-4f1b-9a8c-7d6e-5f4b3c2a1b0d`).*

### Bước 2: Kiểm Tra Trạng Thái Hoàn Thành
Gọi API check status liên tục đến khi trạng thái chuyển sang `completed`:
```bash
curl -X GET "http://localhost:8000/api/v1/knowledge/e3a5c2d8-4f1b-9a8c-7d6e-5f4b3c2a1b0d/status" \
  -H "Authorization: Bearer <FIREBASE_JWT_TOKEN>" \
  -H "X-Workspace-Id: <WORKSPACE_UUID>"
```

---

## 3. Hướng Dẫn Đối Chiếu Database: THẾ NÀO LÀ ĐẠT?

Hãy kết nối vào Postgres container để bắt đầu đối chiếu dữ liệu:
```bash
docker exec -it flae-agents-postgres-1 psql -U postgres
```

### Tiêu Chí 1: Kiểm Tra Trạng Thái Metadata tại `flae_db`
Chạy lệnh SQL để lấy thông tin tài liệu:
```sql
\c flae_db;

SELECT title, status, chunk_count, entity_count, relation_count, error_message 
FROM knowledge_documents 
WHERE id = 'e3a5c2d8-4f1b-9a8c-7d6e-5f4b3c2a1b0d';
```

**👉 Kết quả hiển thị như thế nào là ĐẠT?**
Bảng kết quả trả về trong terminal phải hiển thị chính xác như sau:

| title | status | chunk_count | entity_count | relation_count | error_message |
| :--- | :--- | :---: | :---: | :---: | :--- |
| Tài liệu mẫu TechVibe | **completed** | **3** | **5** (hoặc ±2) | **6** (hoặc ±2) | *NULL* |

> [!NOTE]
> - `status` bắt buộc phải là `completed`. Nếu là `failed`, ingestion đã lỗi, kiểm tra cột `error_message`.
> - `chunk_count` phải bằng `3` (vì dữ liệu mẫu có 3 phần tách biệt rõ ràng bởi tiêu đề markdown, cấu trúc chunking tương ứng sẽ chia thành 3 chunks).
> - `entity_count` và `relation_count` > 0 thể hiện bước trích xuất bằng LangGraph Extractor Agent đã chạy thành công.

---

### Tiêu Chí 2: Kiểm Tra Dữ Liệu Chunks tại `rag_db`
Chuyển sang `rag_db` và cài đặt workspace context:
```sql
\c rag_db;
SET app.current_workspace_id = 'YOUR_WORKSPACE_UUID_HERE'; -- Thay bằng UUID thật
```

Chạy truy vấn lấy danh sách các chunks được cắt:
```sql
SELECT chunk_id, 
       left(text, 50) || '...' as content_preview,
       token_count,
       jsonb_array_length(entity_ids) as num_entities,
       jsonb_array_length(relation_ids) as num_relations,
       (embedding IS NOT NULL) as has_embedding
FROM public.chunks 
WHERE source_document_id = 'e3a5c2d8-4f1b-9a8c-7d6e-5f4b3c2a1b0d'
ORDER BY chunk_id;
```

**👉 Kết quả hiển thị như thế nào là ĐẠT?**
Bạn phải thấy chính xác **3 dòng dữ liệu** tương ứng với 3 phần trong file dữ liệu mẫu:

| chunk_id | content_preview | token_count | num_entities | num_relations | has_embedding |
| :--- | :--- | :---: | :---: | :---: | :---: |
| *chunk_uuid_1* | ## Phần 1: Giới thiệu về Tập đoàn TechVibe... | ~100 - 150 | > 0 | > 0 | **t** (True) |
| *chunk_uuid_2* | ## Phần 2: Sự hợp tác giữa TechVibe và Ngâ... | ~100 - 150 | > 0 | > 0 | **t** (True) |
| *chunk_uuid_3* | ## Phần 3: Công nghệ của VibeAI trên hạ t... | ~100 - 150 | > 0 | > 0 | **t** (True) |

**Điểm mấu chốt để đánh giá ĐẠT:**
1. **Chia Chunk Logic**: Cột `content_preview` phải thể hiện việc chia đoạn đúng theo cấu trúc ngữ nghĩa (bắt đầu bằng tiêu đề `# Phần 1`, `# Phần 2`, `# Phần 3`).
2. **Has Embedding**: Cột `has_embedding` phải hiển thị là `t` (True). Bạn có thể kiểm tra xem chiều vector có khớp với cấu hình không:
   ```sql
   SELECT vector_dims(embedding) FROM public.chunks WHERE source_document_id = 'e3a5c2d8-4f1b-9a8c-7d6e-5f4b3c2a1b0d' LIMIT 1;
   -- Kết quả phải ra đúng dimensions cấu hình (ví dụ: 768).
   ```
3. **Liên Kết Graph**: Cột `num_entities` và `num_relations` phải > 0. Điều này chứng tỏ chunks đã được đính kèm danh sách thực thể và mối quan hệ để phục vụ truy vấn Hybrid Graph RAG sau này.
