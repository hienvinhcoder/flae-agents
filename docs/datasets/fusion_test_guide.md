# Hướng Dẫn Kiểm Thử Và Đánh Giá Quy Trình Entity Fusion (TGS-RAG)

Tài liệu này hướng dẫn chi tiết cách kiểm nghiệm và đánh giá chất lượng của thuật toán **Entity & Relation Fusion** (gộp trùng lặp, tính tần suất, kế thừa mô tả) dựa trên việc chạy thử với tệp dữ liệu mẫu [sample_data.md](file:///Users/nguyenhienvinh/projects/flae-agents/docs/datasets/sample_data.md).

---

## 1. Kết Quả Fusion Kỳ Vọng Trên Dữ Liệu Mẫu

Trong file dữ liệu mẫu [sample_data.md](file:///Users/nguyenhienvinh/projects/flae-agents/docs/datasets/sample_data.md), các thông tin được thiết kế có sự chồng chéo có chủ đích giữa 3 phần văn bản. Dưới đây là cách thuật toán Fusion xử lý khi đạt chuẩn:

### A. Đối với các Thực Thể (Entities)
Các thực thể sau xuất hiện lặp lại qua các chunk và **BẮT BUỘC** phải được gộp (Fusion) thành 1 dòng duy nhất trong database:
*   **TechVibe** (xuất hiện ở cả Phần 1, Phần 2 và Phần 3).
*   **Nguyễn Minh Trí** (xuất hiện ở Phần 1 và Phần 2).
*   **VibeAI** (xuất hiện ở cả 3 Phần).
*   **VietBank** (xuất hiện ở Phần 2 và Phần 3).

### B. Đối với các Mối Quan Hệ (Relationships)
Mối quan hệ giữa **TechVibe** và **Nguyễn Minh Trí** xuất hiện ở:
*   *Phần 1*: "TechVibe được thành lập vào năm 2024 bởi ông Nguyễn Minh Trí..."
*   *Phần 2*: "Đại diện ký kết phía TechVibe là ông Nguyễn Minh Trí trong vai trò Tổng Giám đốc."

👉 Khi gộp thành công, mối quan hệ này chỉ còn **1 dòng**, tần suất (`frequency`) bằng **2**, và mô tả (`description`) của nó sẽ được nối từ hai phần trên bằng ký tự phân tách ` | `.

---

## 2. Hướng Dẫn Đối Chiếu Database: THẾ NÀO LÀ ĐẠT?

Sau khi chạy Ingestion hoàn tất, kết nối vào Postgres container của `rag_db`:
```bash
docker exec -it flae-agents-postgres-1 psql -U postgres -d rag_db
SET app.current_workspace_id = 'YOUR_WORKSPACE_UUID_HERE'; -- Thiết lập workspace context
```

### Tiêu Chí 1: Kiểm Tra Kết Quả Fusion Thực Thể (`entities`)
Chạy câu lệnh SQL sau để kiểm tra xem các thực thể có được gộp và cộng dồn tần suất hay không:

```sql
SELECT entity_name,
       entity_type,
       frequency,
       jsonb_array_length(source_chunk_ids) as num_chunks,
       left(description, 100) || '...' as final_description
FROM public.entities
WHERE entity_name IN ('TechVibe', 'Nguyễn Minh Trí', 'VibeAI', 'VietBank', 'AWS')
   OR entity_name IN ('Tập đoàn Công nghệ TechVibe', 'Ngân hàng VietBank')
ORDER BY frequency DESC;
```

**👉 Kết quả hiển thị như thế nào là ĐẠT?**
Bạn phải thấy các dòng dữ liệu trả về tương tự như bảng sau (tên thực thể có thể biến đổi nhẹ tùy theo LLM trích xuất):

| entity_name | entity_type | frequency | num_chunks | final_description |
| :--- | :--- | :---: | :---: | :--- |
| **TechVibe** (hoặc Tập đoàn TechVibe) | organization | **3** | **3** | Tập đoàn Công nghệ TechVibe là một doanh nghiệp hàng đầu trong lĩnh vực trí tuệ nhân tạo... *(Giữ lại mô tả dài nhất)* |
| **VibeAI** | product (hoặc other) | **3** | **3** | Một trợ lý ảo AI Assistant thế hệ mới hỗ trợ doanh nghiệp tối ưu hóa quy trình vận hành... |
| **Nguyễn Minh Trí** | person | **2** | **2** | Sáng lập TechVibe vào năm 2024, chuyên gia Machine Learning, Tổng Giám đốc... |
| **VietBank** (hoặc Ngân hàng VietBank) | organization | **2** | **2** | Đối tác ký kết hợp tác chiến lược với TechVibe để tích hợp trợ lý ảo... |
| **AWS** (hoặc Amazon Web Services) | organization | **1** | **1** | Hạ tầng điện toán đám mây Amazon Web Services chạy sản phẩm VibeAI... |

> [!IMPORTANT]
> **Điểm cần đối chiếu để đánh giá ĐẠT:**
> 1. **Tính độc nhất**: Không có 2 dòng thực thể nào có tên giống hệt nhau (Ví dụ: Không được xuất hiện 2 dòng cùng tên `TechVibe` với ID khác nhau).
> 2. **Tần suất chính xác**: Các cột `frequency` và `num_chunks` đối với *TechVibe* và *VibeAI* bắt buộc phải bằng **3**, *Nguyễn Minh Trí* và *VietBank* phải bằng **2**.
> 3. **Description**: Cột `final_description` không được rỗng và phải kế thừa mô tả chi tiết nhất (thường là mô tả dài nhất thu thập được qua các chunk).

---

### Tiêu Chí 2: Kiểm Tra Kết Quả Fusion Quan Hệ (`relationships`)
Chạy câu lệnh SQL sau để kiểm tra việc gộp các quan hệ đan xen:

```sql
SELECT source_name,
       target_name,
       frequency,
       jsonb_array_length(source_chunk_ids) as num_chunks,
       description
FROM public.relationships
WHERE (source_name ILIKE '%Trí%' AND target_name ILIKE '%TechVibe%')
   OR (source_name ILIKE '%TechVibe%' AND target_name ILIKE '%Trí%')
LIMIT 1;
```

**👉 Kết quả hiển thị như thế nào là ĐẠT?**
Bạn phải thấy **chỉ có 1 dòng duy nhất** được trả về với cấu trúc nối chuỗi (concatenation) như sau:

| source_name | target_name | frequency | num_chunks | description |
| :--- | :--- | :---: | :---: | :--- |
| Nguyễn Minh Trí | TechVibe | **2** | **2** | *[Mô tả ở Phần 1]* **` | `** *[Mô tả ở Phần 2]* |

> [!NOTE]
> - `frequency` và `num_chunks` bắt buộc phải bằng **2**.
> - Trường `description` bắt buộc phải có ký tự phân tách ` | ` thể hiện việc nối thông tin thành công từ cả 2 chunk (không bị ghi đè hay mất thông tin).

---

### Tiêu Chí 3: Kiểm Tra Tính Đồng Bộ Tham Chiếu Chéo
Để đảm bảo liên kết Graph RAG hoạt động trơn tru, chạy query kiểm tra xem các chunk có liên kết ngược lại đúng các thực thể đã được gộp hay không:

```sql
-- Tìm chunk chứa thực thể 'Nguyễn Minh Trí'
SELECT chunk_id, left(text, 70) || '...' as chunk_preview
FROM public.chunks
WHERE entity_ids @> (
    SELECT jsonb_build_array(entity_id)
    FROM public.entities
    WHERE entity_name = 'Nguyễn Minh Trí'
);
```

**👉 Kết quả hiển thị như thế nào là ĐẠT?**
Lệnh trên phải trả về chính xác **2 dòng chunk** (Tương ứng với Phần 1 và Phần 2 của tài liệu mẫu). Điều này chứng minh rằng mặc dù thực thể `Nguyễn Minh Trí` đã được gộp thành 1 dòng duy nhất trong bảng `entities`, nhưng các chunk gốc sinh ra nó vẫn giữ được mối liên kết chính xác tới nó thông qua mảng `entity_ids`.
