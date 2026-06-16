# Feature Done: Tách Parser Service (Knowledge Base)

Tài liệu đúc kết quá trình tái cấu trúc, tách các logic liên quan đến parser văn bản (`convert_pdf_to_markdown` và `preprocess_text`) ra khỏi `ingestion_service.py` sang `parser_service.py` để tối ưu hóa kích thước file và nâng cao tính modular.

## Ngày hoàn thành: 2026-06-09

## Các file bị ảnh hưởng
- **Tạo mới:**
  - `backend/app/services/knowalge_base/parser_service.py`
  - `backend/tests/services/test_parser_service.py`
- **Sửa đổi:**
  - `backend/app/services/knowalge_base/ingestion_service.py`
  - `backend/app/temporal/activities/ingestion.py`
  - `backend/tests/services/test_ingestion_service.py`

## Logic & Cấu trúc mới thêm
- Tạo class `ParserService` chứa các static methods:
  - `convert_pdf_to_markdown(file_content: bytes, file_name: str) -> str`: Chuyển đổi PDF sang Markdown sử dụng `pymupdf4llm` hoặc fallback `pymupdf` nếu thư viện kia không khả dụng.
  - `preprocess_text(text: str) -> str`: Xử lý loại bỏ các placeholder hình ảnh và link ảnh Markdown không cần thiết trong văn bản.
- Trách nhiệm của class `ParserService` được giới hạn hoàn toàn trong việc parse và tiền xử lý thô văn bản.

## Kết quả kiểm thử & Độ tin cậy
- Đã thực hiện chạy bộ test bằng lệnh `uv run pytest tests/services/test_parser_service.py tests/services/test_ingestion_service.py` với kết quả **6 passed** (không có lỗi phát sinh).
- Logic tách ra vẫn đảm bảo tính tương thích tuyệt đối cho hoạt động ingestion pipeline của Temporal.
