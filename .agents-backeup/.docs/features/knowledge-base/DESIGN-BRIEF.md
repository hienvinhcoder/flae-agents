# Knowledge Base Management — Design Brief

Tài liệu hướng dẫn chi tiết về UI/UX và thiết kế giao diện cho tính năng quản lý Cơ sở Tri thức (Knowledge Base) theo phong cách **Sunset Fire Dark Mode** của dự án FALE.

---

## 1. Phong Cách Thiết Kế Chủ Đạo
Tuân thủ nghiêm ngặt hệ thống thiết kế tại [DESIGN.md](file:///.docs/DESIGN.md):
- **Tone màu chủ đạo**: Tối, ấm áp (Dark Warm) kết hợp điểm nhấn cam hoàng hôn (Sunset Orange) cho các hành động chính và tím AI (AI Purple) cho các thông số liên quan đến trí tuệ nhân tạo.
- **Tỉ lệ màu sắc**:
  - `70% bg-app` (#140F0B) và `bg-surface` (#1F1711) làm nền chính.
  - `20% primary` (#FB923C - Sunset Orange) cho CTA, active states.
  - `10% semantic / AI accent` (Tím AI `#C084FC`, Xanh Graph `#4ADE80`, Đỏ Error `#F87171`) cho trạng thái và số liệu.
- **Kiểu chữ (Typography)**:
  - Font Sans chính: Inter/Geist.
  - Font Monospace: Geist Mono / JetBrains Mono (áp dụng cho code block, metadata kỹ thuật như chunk_count, token_usage).

---

## 2. Cấu Trúc Layout & Giao Diện Chi Tiết

### 2.1 Trang Danh Sách Tài Liệu (Knowledge List Page)
- **Header**:
  - Tiêu đề: "Cơ Sở Tri Thức" (`text-text-primary text-3xl font-bold tracking-tight`).
  - Nút hành động ở góc phải:
    - Nút phụ: "Nhập nội dung" (`Secondary Button` - icon `lucide-pencil-line` + Text "Nhập trực tiếp").
    - Nút chính: "Tải lên tài liệu" (`Primary Button` với hiệu ứng `shadow-primary` - icon `lucide-upload` + Text "Tải lên tài liệu").
- **Bộ lọc & Tìm kiếm**:
  - Ô tìm kiếm: `Search Input` tích hợp icon `lucide-search`.
  - Dropdown lọc trạng thái: All, Pending, Processing, Completed, Failed.
- **Bảng danh sách (`document-table`)**:
  - Cấu trúc: `Table Wrapper` (`rounded-2xl border border-border bg-surface overflow-hidden`).
  - Table Header (`bg-subtle text-text-muted`): Tiêu đề, Định dạng, Trạng thái, Số khối (Chunks), Người tải, Ngày tạo, Hành động.
  - Table Row (`border-t border-border text-text-secondary hover:bg-white/5`):
    - **Tiêu đề**: Hiển thị tên tài liệu, nếu có mô tả phụ thì hiển thị nhỏ hơn bên dưới (`text-text-muted text-xs`).
    - **Định dạng**: Hiển thị dạng Badge nhỏ (ví dụ: `PDF` màu đỏ nhạt, `MD` màu xanh lam nhạt).
    - **Trạng thái**: Sử dụng component `status-badge`.
    - **Số khối**: Hiển thị số lượng chunks dạng font monospace (`text-text-muted font-mono`). Nếu đang xử lý hiển thị `-`.
    - **Hành động**: Các nút icon (Ghost button) ở cuối dòng:
      - Xem chi tiết (`lucide-eye` hoặc `lucide-chevron-right`).
      - Chạy lại ingestion khi bị lỗi (`lucide-refresh-cw` - chỉ xuất hiện khi status là `failed`).
      - Xóa tài liệu (`lucide-trash-2` - màu `text-error/70 hover:text-error hover:bg-error/10`).

### 2.2 Trạng Thái Trống (Empty State)
- Xuất hiện khi chưa có tài liệu nào trong workspace.
- **Thiết kế**:
  - Căn giữa trang.
  - Sử dụng icon lớn `lucide-database-backup` hoặc `lucide-folder-open` màu `text-text-disabled` (kích thước `w-16 h-16`, mờ nhẹ).
  - Tiêu đề: "Chưa có tài liệu nào" (`text-text-primary text-lg font-semibold mt-4`).
  - Mô tả: "Tải lên tài liệu PDF, Markdown hoặc nhập nội dung trực tiếp để xây dựng cơ sở tri thức cho AI" (`text-text-muted text-sm max-w-md mt-2`).
  - Nút CTA lớn ở dưới: "Tải lên tài liệu đầu tiên" (`Primary Button`).

### 2.3 Modal Tải Lên Tài Liệu (Upload File Modal)
- Nền backdrop tối mờ có blur: `backdrop-blur-md bg-app/80`.
- Khung Modal: `Modal Panel` (`bg-surface border border-border-strong rounded-2xl shadow-elevated p-6 max-w-md w-full`).
- **Vùng Kéo Thả (Drag & Drop Zone)**:
  - Viền đứt nét màu border mạnh khi hover hoặc dragover: `border-2 border-dashed border-border hover:border-primary/50 transition duration-200`.
  - Icon `lucide-cloud-upload` màu `text-primary` nằm ở giữa vùng drag-drop.
  - Text hướng dẫn: "Kéo thả tệp vào đây hoặc nhấn để chọn" (`text-text-primary text-sm font-medium`).
  - Subtext: "Hỗ trợ: PDF, Markdown (.md), Text (.txt) - Tối đa 50MB" (`text-text-muted text-xs`).
- **Danh sách file được chọn (File List Preview)**:
  - Khi có file được chọn, hiển thị tên file, dung lượng, và nút xóa nhanh file đó trước khi upload.
  - Ô nhập "Tiêu đề tài liệu" (Tùy chọn, mặc định lấy tên file).
  - Ô nhập "Mô tả ngắn".
- **Footer**:
  - Nút "Hủy": Secondary button.
  - Nút "Tải lên": Primary button (có loading spinner nếu đang thực hiện upload).

### 2.4 Modal Nhập Nội Dung Trực Tiếp (Manual Input Modal)
- Khung Modal lớn hơn: `max-w-2xl`.
- Layout chia làm 2 tab hoặc split-view (viết bên trái, xem trước Markdown bên phải):
  - **Tab Soạn Thảo (Edit)**:
    - Input nhập tiêu đề (`Text Input`).
    - Textarea lớn nhập nội dung (`Textarea`), sử dụng font monospace (`font-mono`) cho nội dung văn bản.
  - **Tab Xem Trước (Preview)**:
    - Render Markdown cơ bản với các thẻ tiêu đề, bullet points, code block định dạng rõ ràng để người dùng kiểm tra cấu trúc.
- **Footer**:
  - Nút "Hủy" và nút "Lưu tài liệu".

### 2.5 Panel Chi Tiết Tài Liệu (Document Detail Panel - Slide-over)
- Xuất hiện dạng trượt (Slide-over) từ cạnh phải màn hình.
- Hiệu ứng chuyển cảnh trượt mượt mà (`transition-transform duration-300`).
- **Nội dung hiển thị**:
  - Nút đóng (Icon `lucide-x` góc trên cùng bên phải).
  - Tiêu đề tài liệu và loại file.
  - Phần hiển thị **Trạng thái chi tiết** (`ingestion-progress`):
    - Biểu đồ tiến trình dạng line hoặc thanh progress: `Pending -> Processing (Parser) -> Chunking -> Creating Graph -> Completed`.
  - **Số liệu xử lý (Metrics Section)**:
    - Bố cục dạng Grid (2x2):
      - **Số khối văn bản (Chunks)**: Số lượng + icon `lucide-blocks` (`text-ai`).
      - **Thực thể (Entities)**: Số lượng + icon `lucide-tag` (`text-graph`).
      - **Mối quan hệ (Relations)**: Số lượng + icon `lucide-git-branch` (`text-primary`).
      - **Thời gian xử lý**: Số giây + icon `lucide-timer` (`text-info`).
  - **Thống kê Token (Token Usage)**:
    - Hiển thị danh sách token sử dụng cho LLM/Embedding dưới dạng thanh tiến trình nhỏ hoặc bảng phân rã nhỏ: Prompt Tokens, Completion Tokens, Total Tokens.
  - **Thông báo lỗi (Error Section)**:
    - Nếu trạng thái là `failed`, hiển thị một vùng màu đỏ nhạt (`Error Card` - `border-error/30 bg-error/10 text-error p-4 rounded-xl`) chứa thông tin chi tiết lỗi và nút bấm "Chạy lại tiến trình xử lý" (`lucide-refresh-cw`).
  - **Hành động cuối trang**:
    - Nút xóa tài liệu khỏi cơ sở tri thức (`Destructive Button`).

---

## 3. Quy Tắc Trạng Thái Giao Diện (State Rules)

| Trạng thái (Status) | Màu sắc (Color) | Icon sử dụng | Mô tả UI / Animation |
| :--- | :--- | :--- | :--- |
| **Pending** | `warning` (Vàng) | `lucide-clock` | Chờ đưa vào hàng đợi xử lý. Không nhấp nháy. |
| **Processing** | `info` (Xanh dương) | `lucide-loader-2` | Đang phân tích, chunking hoặc tạo Graph. Icon xoay tròn (`animate-spin`). |
| **Completed** | `success` (Xanh lá) | `lucide-check-circle-2`| Đã hoàn thành nạp vào DB và Graph. |
| **Failed** | `error` (Đỏ) | `lucide-alert-circle` | Xảy ra lỗi trong quá trình xử lý. |

---

## 4. Micro-animations & Trải Nghiệm Người Dùng (UX)
1. **Hiệu ứng Pulsing (Processing)**:
   - Khi tài liệu ở trạng thái `processing`, badge trạng thái sẽ có một chấm tròn nhỏ nhấp nháy (`animate-ping`) bên cạnh text "Đang xử lý".
2. **Kéo thả File tương tác mượt mà**:
   - Khi kéo tệp qua vùng drop-zone, nền của vùng này chuyển sang `bg-primary-soft` và viền chuyển sang màu cam sáng `border-primary` để báo hiệu sẵn sàng nhận file.
3. **Slide-over Smoothness**:
   - Slide-over panel xuất hiện với transition: `transform ease-in-out duration-300` và backdrop mờ dần `ease-in duration-300`.
4. **Tooltips**:
   - Thêm tooltip cho các nút icon hành động (ví dụ: nút "Xóa", "Thử lại", "Chi tiết") để tăng tính dễ hiểu.
