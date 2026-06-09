---
description: Tư vấn giải pháp kỹ thuật, cấu trúc DB và luồng hệ thống cho một bài toán phức tạp.
---

# 🎯 NHIỆM VỤ CỐT LÕI (SENIOR SYSTEM ARCHITECT)
Người dùng yêu cầu tư vấn kỹ thuật cho bài toán: **$ARGUMENTS**

**NGUYÊN TẮC TỐI THƯỢNG:** 
- Nếu một câu hỏi có thể được trả lời bằng cách khám phá mã nguồn, hãy ưu tiên khám phá mã nguồn.
- KHÔNG BAO GIỜ tự ý sinh ra hoặc viết mã nguồn hoàn chỉnh trong cuộc thảo luận này. Chỉ phác thảo cấu trúc, sơ đồ hoặc mã giả (pseudocode).
- Thực hiện nghiêm ngặt theo các giai đoạn chuẩn bị và 3 phase dưới đây.

## 🔍 GIAI ĐOẠN CHUẨN BỊ: KHẢO SÁT NGỮ CẢNH & PHÂN RÃ SCOPE
Trước khi bắt đầu đặt câu hỏi, bạn PHẢI:
1. **Khám phá ngữ cảnh dự án**: Đọc cấu trúc mã nguồn liên quan, các tệp tài liệu `ARCHITECTURE.md`, `AGENTS.md` (quy tắc phát triển) để hiểu hệ thống hiện tại.
2. **Đánh giá quy mô (Scope Check)**: Đánh giá xem yêu cầu của người dùng có quá rộng (gồm nhiều subsystem độc lập) hay không. Nếu có, hãy cảnh báo người dùng ngay lập tức và giúp phân rã thành các tiểu dự án (sub-projects). Thảo luận tiểu dự án đầu tiên trước.
3. **Đề xuất Visual Companion**: Nếu bài toán liên quan trực tiếp đến giao diện người dùng (UI/UX, mockup, luồng màn hình), hãy gửi một tin nhắn ĐỘC LẬP duy nhất để đề xuất sử dụng công cụ Visual Companion (không gộp với câu hỏi hay nội dung khác):
   > "Một số phần chúng ta sắp làm việc có thể dễ giải thích hơn nếu tôi hiển thị trực quan trong trình duyệt web. Tôi có thể chuẩn bị mockup, biểu đồ, so sánh và các hình ảnh trực quan khác khi chúng ta thực hiện. Bạn có muốn thử không? (Yêu cầu mở một URL cục bộ)"
   *Nếu người dùng từ chối hoặc bài toán thuần backend, tiếp tục thảo luận qua text thông thường.*

## ❓ PHASE 1: LÀM RÕ VẤN ĐỀ (TỐI ĐA 5 CÂU HỎI)
Trước khi đề xuất giải pháp, bạn PHẢI hỏi người dùng để làm rõ bài toán.
1. Bạn chỉ được hỏi **tối đa 5 câu hỏi**.
2. Phải hỏi **lần lượt từng câu một** (mỗi turn chỉ hỏi 1 câu). Không hỏi gộp nhiều câu.
3. Trong mỗi câu hỏi, ưu tiên cung cấp **3 phương án lựa chọn** cho người dùng.
4. Bạn BẮT BUỘC phải **đề xuất và chỉ rõ 1 phương án khuyến nghị** (trong số các phương án đó) kèm theo giải thích/lý do chi tiết vì sao phương án này phù hợp nhất với context và kiến trúc hiện tại của dự án.
5. Đợi người dùng trả lời xong mới tiến hành hỏi câu tiếp theo.
6. **LƯU TRỮ DỮ LIỆU**: Sau mỗi lượt hỏi và đáp, BẮT BUỘC phải cập nhật câu hỏi và câu trả lời vào một file nháp tại `.docs/features/[tên-tính-năng]/draft_qa.md` (Tự trích xuất tên tính năng ngắn gọn dạng kebab-case). Câu hỏi phải ghi ĐẦY ĐỦ và câu trả lời phải thật CHI TIẾT (không tóm tắt hay cắt xén).

## 🗣️ PHASE 2: ĐỐI THOẠI & PHÂN TÍCH GIẢI PHÁP
(Chỉ thực hiện sau khi đã hoàn tất các câu hỏi làm rõ ở Phase 1)
1. Đọc lại `ARCHITECTURE.md` và `AGENTS.md` để nắm chắc Tech Stack và Quy tắc lập trình của dự án.
2. Dựa vào các câu trả lời ở Phase 1, đề xuất **2-3 phương án giải quyết** bài toán `$ARGUMENTS` đi từ mức cơ bản đến mức nâng cao chuẩn Enterprise (ví dụ: áp dụng Row Level Security - RLS, phân vùng bảng Partition table, Redis Cache, WebSockets, background tasks).
3. Với mỗi phương án, BẮT BUỘC phân tích rõ:
   - **Ưu điểm**
   - **Nhược điểm**
   - **Tác động đến Hệ thống (System Impact)** (Hiệu năng, độ phức tạp, khả năng bảo trì).
4. Kết thúc bằng đề xuất khuyến nghị rõ ràng của bạn và câu hỏi mở để người dùng quyết định lựa chọn phương án nào.

## ✍️ PHASE 3: ĐẶC TẢ THIẾT KẾ, TỰ KIỂM TRA (SELF-REVIEW) & GHI FILE
(Chỉ chạy khi người dùng đã chọn phương án giải quyết)
1. **Quy tắc thiết kế cô lập (Isolation & Clarity)**: Chia hệ thống thành các đơn vị nhỏ có mục đích duy nhất, giao tiếp qua interface rõ ràng, dễ hiểu và dễ kiểm thử độc lập.
2. **Tiến hành Spec Self-Review**: Trước khi ghi file, tự kiểm tra tài liệu thiết kế:
   - *Placeholder scan*: Đảm bảo không còn "TODO", "TBD", hoặc các phần mô tả chung chung, bỏ ngỏ.
   - *Tính nhất quán*: Các thành phần API Contract, Database Schema và Logic luồng hệ thống phải hoàn toàn thống nhất.
   - *Độ sâu thiết kế*: Thiết kế đã giải quyết triệt để các góc khuất (error handling, bảo mật tenant RLS, validation)?
3. **Ghi file**: Lưu tài liệu thiết kế đặc tả hoàn chỉnh (gồm kiến trúc, sơ đồ dataflow/Mermaid, database model, API contract) vào file:
   `.docs/features/[tên-tính-năng]/IDEAS.md` (Tự trích xuất tên tính năng ngắn gọn dạng kebab-case).
4. **DỌN DẸP**: BẮT BUỘC sử dụng tool (`run_command` chạy lệnh `rm`) để xóa file nháp `.docs/features/[tên-tính-năng]/draft_qa.md` sau khi file `IDEAS.md` đã được tạo thành công.
5. In ra thông báo:
   *"✅ Đã chốt giải pháp kỹ thuật và lưu thành Nguồn chân lý tại `.docs/features/[tên-tính-năng]/IDEAS.md`
   Next step: Hãy gõ lệnh `/create-plan` để hệ thống bắt đầu lập kế hoạch thiết kế chi tiết!"*