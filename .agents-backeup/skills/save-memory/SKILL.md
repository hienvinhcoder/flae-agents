---
name: save-memory
description: Kỹ năng quản lý vòng đời Context. Tự động tổng hợp thay đổi để tạo file `feature_done.md` cho tính năng vừa code, đồng thời truy vết và cập nhật cảnh báo cho các tính năng cũ nếu có sự thay đổi về tài nguyên dùng chung.
triggers:
  - "save memory"
  - "/save-memory"
  - "/feature-done"
---

# MỤC TIÊU CỦA SKILL
Cung cấp cho Agent khả năng "tư duy hệ thống" và quản lý tài liệu tự động. Skill này đảm nhiệm 2 vai trò cốt lõi mỗi khi một tính năng (feature) hoàn thành:
1. **Tổng hợp:** Đúc kết các thay đổi code thành file `feature_done.md` cho tính năng vừa thực hiện để làm Cầu nối bộ nhớ.
2. **Cập nhật lan truyền:** Dò tìm sự phụ thuộc (dependencies) trong source code để tìm ra các tính năng cũ bị ảnh hưởng bởi thay đổi dùng chung và cập nhật cảnh báo cho chúng.

# CÁCH THỨC HOẠT ĐỘNG (QUY TRÌNH KỸ NĂNG)

Agent áp dụng Skill này cần tuân thủ 4 bước chính sau:

## 1. Tạo cầu nối bộ nhớ (Generate Feature Done)
Dựa trên những code vừa thay đổi (thông qua bộ nhớ phiên làm việc hoặc sử dụng `git diff` / đọc trực tiếp source code):
- Viết một tóm tắt ngắn gọn mang tính ngữ nghĩa (Semantic) về quá trình implement.
- Tạo mới (hoặc cập nhật) file `feature_done.md` nằm trực tiếp bên trong thư mục của tính năng vừa làm (Ví dụ: `docs/features/[tên_feature]/feature_done.md`).
- File phải nêu rõ: Danh sách file bị ảnh hưởng, Logic/State mới thêm, và Cấu trúc Database thay đổi (nếu có).

## 2. Nhận diện tài nguyên dùng chung (Identify Shared Resources)
Từ các thay đổi ở Bước 1, hãy kiểm tra:
- Có file nào thuộc thư mục `core/`, `shared/`, `helpers/`, `models/`, `services/` bị chỉnh sửa không?
- Có thay đổi nào trong Database Schema (ví dụ: Firestore Pydantic models) không?
- Có thay đổi nào trong Component UI dùng chung (Angular Standalone Components) không?
=> Nếu có, lập danh sách các hàm, class, hoặc biến dùng chung vừa bị thay đổi.

## 3. Truy vết ảnh hưởng (Impact Tracing)
Nếu phát hiện có thay đổi dùng chung ở Bước 2, sử dụng công cụ tìm kiếm chuẩn xác (tool `grep_search`) để quét toàn bộ source code.
- **Tìm gì:** Tìm các từ khóa là tên của class, interface, database model, hoặc service dùng chung đã được xác định.
- **Tìm ở đâu:** Quét qua các thư mục chứa logic của các features khác (VD: `docs/features/`).
- **Kết quả:** Lập danh sách các tính năng cũ (Feature A, Feature C) có import/gọi đến các đoạn code dùng chung vừa bị sửa.

## 4. Lan truyền cập nhật Context (Cascade Update)
Với mỗi tính năng cũ bị ảnh hưởng được tìm thấy ở Bước 3:
- Tìm đến thư mục của tính năng đó và mở file `feature_done.md` (hoặc file tài liệu context nội bộ của nó).
- Ghi nối (append) một khối thông báo vào cuối file để cảnh báo về thay đổi.

**Ví dụ format ghi chú thêm vào feature_done.md của tính năng cũ:**
```markdown
> ⚠️ **[CẬP NHẬT LAN TRUYỀN - {Ngày tháng}]**
> Tính năng này có thể bị ảnh hưởng bởi thay đổi mới từ **[Tên Feature mới]**.
> - **Lý do:** Logic dùng chung `{Tên class/hàm/model}` đã bị sửa đổi.
> - **Hành động:** Khi maintain tính năng này, Agent và Human cần kiểm tra lại sự tương thích với kiến trúc mới.
```

# NGUYÊN TẮC QUAN TRỌNG
- Việc tạo/cập nhật `feature_done.md` cho tính năng mới (Bước 1) là **BẮT BUỘC**, cho dù không có bất kỳ thay đổi logic dùng chung nào.
- **KHÔNG sửa code của tính năng cũ** nếu không có lệnh trực tiếp từ Human. Skill này CHỈ phục vụ việc cập nhật tài liệu cảnh báo.
- Bắt buộc phải tận dụng tool tìm kiếm nội dung file (`grep_search`) ở Bước 3 để đảm bảo không bỏ sót bất kỳ file nào import logic bị thay đổi.
