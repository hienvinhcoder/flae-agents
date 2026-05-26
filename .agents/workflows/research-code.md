---
description: Tài liệu hóa codebase như hiện tại kết hợp với thư mục thoughts để lấy ngữ cảnh lịch sử
model: opus
---

# Nghiên cứu Codebase (Research Codebase)

Bạn được giao nhiệm vụ thực hiện nghiên cứu toàn diện trên toàn bộ codebase để trả lời các câu hỏi của người dùng bằng cách tạo ra các sub-agent song song và tổng hợp kết quả của chúng.

## QUAN TRỌNG: NHIỆM VỤ DUY NHẤT CỦA BẠN LÀ TÀI LIỆU HÓA VÀ GIẢI THÍCH CODEBASE NHƯ NÓ ĐANG TỒN TẠI HÔM NAY
- KHÔNG đề xuất cải tiến hoặc thay đổi trừ khi người dùng yêu cầu rõ ràng
- KHÔNG thực hiện phân tích nguyên nhân gốc rễ (root cause analysis) trừ khi người dùng yêu cầu rõ ràng
- KHÔNG đề xuất các cải tiến trong tương lai trừ khi người dùng yêu cầu rõ ràng
- KHÔNG phê bình cách triển khai hoặc chỉ ra các vấn đề
- KHÔNG khuyến nghị cấu trúc lại (refactoring), tối ưu hóa hoặc thay đổi kiến trúc
- CHỈ mô tả những gì đang tồn tại, nó tồn tại ở đâu, hoạt động như thế nào và các thành phần tương tác với nhau ra sao
- Bạn đang tạo một bản đồ kỹ thuật/tài liệu của hệ thống hiện tại

## Thiết lập ban đầu (Initial Setup):

Khi lệnh này được gọi, hãy phản hồi bằng:
```
Tôi đã sẵn sàng nghiên cứu codebase. Vui lòng cung cấp câu hỏi nghiên cứu hoặc lĩnh vực bạn quan tâm, và tôi sẽ phân tích kỹ lưỡng bằng cách khám phá các thành phần và liên kết liên quan.
```

Sau đó đợi truy vấn nghiên cứu từ người dùng.

## Các bước cần thực hiện sau khi nhận được truy vấn nghiên cứu:

1. **Đọc bất kỳ file nào được đề cập trực tiếp trước tiên:**
   - Nếu người dùng đề cập đến các file cụ thể (ticket, tài liệu, JSON), hãy đọc TOÀN BỘ chúng trước tiên
   - **QUAN TRỌNG**: Sử dụng công cụ Read KHÔNG CÓ tham số limit/offset để đọc toàn bộ file
   - **TỐI QUAN TRỌNG**: Tự đọc các file này trong ngữ cảnh chính trước khi tạo bất kỳ sub-task nào
   - Điều này đảm bảo bạn có đầy đủ ngữ cảnh trước khi phân rã nghiên cứu

2. **Phân tích và phân rã câu hỏi nghiên cứu:**
   - Chia nhỏ truy vấn của người dùng thành các khu vực nghiên cứu có thể kết hợp được
   - Dành thời gian suy nghĩ kỹ (ultrathink) về các pattern cơ bản, các kết nối và các tác động kiến trúc mà người dùng có thể đang tìm kiếm
   - Xác định các thành phần, pattern hoặc khái niệm cụ thể để điều tra
   - Tạo kế hoạch nghiên cứu bằng cách sử dụng TodoWrite để theo dõi tất cả các subtask
   - Xem xét thư mục, file hoặc pattern kiến trúc nào có liên quan

3. **Tạo các tác vụ sub-agent song song để nghiên cứu toàn diện:**
   - Tạo nhiều Task agent để nghiên cứu các khía cạnh khác nhau cùng một lúc
   - Hiện tại chúng ta có các agent chuyên biệt biết cách thực hiện các tác vụ nghiên cứu cụ thể:

   **Đối với nghiên cứu codebase:**
   - Sử dụng agent **codebase-locator** để tìm nơi các file và thành phần đang sống (WHERE)
   - Sử dụng agent **codebase-analyzer** để hiểu cách code cụ thể hoạt động (HOW) (không phê bình)
   - Sử dụng agent **codebase-pattern-finder** để tìm các ví dụ về các pattern hiện có (không đánh giá)

   **QUAN TRỌNG**: Tất cả các agent đều là người lập tài liệu (documentarian), không phải là người phê bình. Họ sẽ mô tả những gì đang tồn tại mà không đề xuất cải tiến hoặc xác định vấn đề.

   **Đối với thư mục thoughts:**
   - Sử dụng agent **thoughts-locator** để khám phá các tài liệu nào đang tồn tại về chủ đề này
   - Sử dụng agent **thoughts-analyzer** để trích xuất các thông tin chi tiết chính từ các tài liệu cụ thể (chỉ những tài liệu có liên quan nhất)

   **Đối với nghiên cứu web (chỉ khi người dùng yêu cầu rõ ràng):**
   - Sử dụng agent **web-search-researcher** cho tài liệu và tài nguyên bên ngoài
   - NẾU bạn sử dụng các agent nghiên cứu web, hãy hướng dẫn họ trả về các LIÊN KẾT (LINKS) cùng với kết quả tìm thấy, và vui lòng ĐÍNH KÈM các liên kết đó vào báo cáo cuối cùng của bạn

   **Đối với các ticket Linear (nếu liên quan):**
   - Sử dụng agent **linear-ticket-reader** để lấy thông tin chi tiết đầy đủ của một ticket cụ thể
   - Sử dụng agent **linear-searcher** để tìm các ticket liên quan hoặc ngữ cảnh lịch sử

   Chìa khóa là sử dụng các agent này một cách thông minh:
   - Bắt đầu với các locator agent để tìm những gì đang tồn tại
   - Sau đó sử dụng các analyzer agent trên những kết quả hứa hẹn nhất để tài liệu hóa cách chúng hoạt động
   - Chạy nhiều agent song song khi chúng đang tìm kiếm những thứ khác nhau
   - Mỗi agent đều biết công việc của mình - chỉ cần nói cho nó biết bạn đang tìm kiếm cái gì
   - Không viết các prompt chi tiết về CÁCH tìm kiếm - các agent đã biết điều đó rồi
   - Nhắc nhở các agent rằng họ đang tài liệu hóa, không phải đánh giá hay cải tiến

4. **Đợi tất cả các sub-agent hoàn thành và tổng hợp kết quả:**
   - QUAN TRỌNG: Đợi TOÀN BỘ các tác vụ sub-agent hoàn thành trước khi tiếp tục
   - Biên soạn tất cả các kết quả của sub-agent (cả codebase và các kết quả từ thoughts)
   - Ưu tiên các kết quả từ codebase thực tế làm nguồn sự thật chính (primary source of truth)
   - Sử dụng kết quả từ thoughts/ làm ngữ cảnh lịch sử bổ sung
   - Kết nối các kết quả tìm thấy trên các thành phần khác nhau
   - Đính kèm các đường dẫn file và số dòng cụ thể để tham chiếu
   - Xác minh tất cả các đường dẫn thoughts/ là chính xác (ví dụ: `thoughts/allison/` chứ không phải `thoughts/shared/` cho các file cá nhân)
   - Làm nổi bật các pattern, kết nối và các quyết định kiến trúc
   - Trả lời các câu hỏi cụ thể của người dùng bằng bằng chứng cụ thể

5. **Thu thập siêu dữ liệu (metadata) cho tài liệu nghiên cứu:**
   - Chạy script `hack/spec_metadata.sh` để tạo tất cả metadata liên quan
   - Tên file: `thoughts/shared/research/YYYY-MM-DD-ENG-XXXX-description.md`
     - Định dạng: `YYYY-MM-DD-ENG-XXXX-description.md` trong đó:
       - YYYY-MM-DD là ngày hôm nay
       - ENG-XXXX là số hiệu ticket (bỏ qua nếu không có ticket)
       - description là một mô tả ngắn bằng định dạng kebab-case về chủ đề nghiên cứu
     - Ví dụ:
       - Có ticket: `2025-01-08-ENG-1478-parent-child-tracking.md`
       - Không có ticket: `2025-01-08-authentication-flow.md`

6. **Tạo tài liệu nghiên cứu:**
   - Sử dụng siêu dữ liệu đã thu thập ở bước 4
   - Cấu trúc tài liệu với YAML frontmatter theo sau là nội dung:
     ```markdown
     ---
     date: [Ngày giờ hiện tại kèm múi giờ theo định dạng ISO]
     researcher: [Tên người nghiên cứu từ thoughts status]
     git_commit: [Hash commit hiện tại]
     branch: [Tên branch hiện tại]
     repository: [Tên repository]
     topic: "[Câu hỏi/Chủ đề của người dùng]"
     tags: [research, codebase, tên-các-thành-phần-liên-quan]
     status: complete
     last_updated: [Ngày hiện tại theo định dạng YYYY-MM-DD]
     last_updated_by: [Tên người nghiên cứu]
     ---

     # Nghiên cứu: [Câu hỏi/Chủ đề của người dùng]

     **Ngày**: [Ngày giờ hiện tại kèm múi giờ từ bước 4]
     **Người nghiên cứu**: [Tên người nghiên cứu từ thoughts status]
     **Git Commit**: [Hash commit hiện tại từ bước 4]
     **Chi nhánh (Branch)**: [Tên branch hiện tại từ bước 4]
     **Kho lưu trữ (Repository)**: [Tên repository]

     ## Câu hỏi nghiên cứu
     [Truy vấn gốc của người dùng]

     ## Tóm tắt
     [Tài liệu mức cao về những gì đã được tìm thấy, trả lời câu hỏi của người dùng bằng cách mô tả những gì đang tồn tại]

     ## Kết quả chi tiết

     ### [Thành phần/Khu vực 1]
     - Mô tả những gì đang tồn tại ([file.ext:line](link))
     - Cách nó kết nối với các thành phần khác
     - Chi tiết triển khai hiện tại (không đánh giá)

     ### [Thành phần/Khu vực 2]
     ...

     ## Tham chiếu Code
     - `path/to/file.py:123` - Mô tả những gì ở đó
     - `another/file.ts:45-67` - Mô tả về khối code

     ## Tài liệu Kiến trúc
     [Các pattern, quy ước và triển khai thiết kế hiện tại được tìm thấy trong codebase]

     ## Ngữ cảnh lịch sử (từ thoughts/)
     [Các hiểu biết liên quan từ thư mục thoughts/ kèm tham chiếu]
     - `thoughts/shared/something.md` - Quyết định lịch sử về X
     - `thoughts/local/notes.md` - Khảo sát trước đây về Y
     Lưu ý: Các đường dẫn loại bỏ "searchable/" ngay cả khi tìm thấy ở đó

     ## Nghiên cứu liên quan
     [Các liên kết đến tài liệu nghiên cứu khác trong thoughts/shared/research/]

     ## Các câu hỏi mở
     [Bất kỳ khu vực nào cần điều tra thêm]
     ```

7. **Thêm permalinks GitHub (nếu có thể áp dụng):**
   - Kiểm tra xem có đang ở nhánh main hoặc commit đã được push chưa: `git branch --show-current` và `git status`
   - Nếu ở trên main/master hoặc đã push, hãy tạo permalinks GitHub:
     - Lấy thông tin repo: `gh repo view --json owner,name`
     - Tạo permalinks: `https://github.com/{owner}/{repo}/blob/{commit}/{file}#L{line}`
   - Thay thế các tham chiếu file cục bộ bằng permalinks trong tài liệu

8. **Đồng bộ và trình bày kết quả:**
   - Chạy `humanlayer thoughts sync` để đồng bộ thư mục thoughts
   - Trình bày một bản tóm tắt ngắn gọn các kết quả cho người dùng
   - Đính kèm các tham chiếu file chính để dễ dàng điều hướng
   - Hỏi xem họ có câu hỏi tiếp theo hoặc cần làm rõ điều gì không

9. **Xử lý các câu hỏi tiếp theo:**
   - Nếu người dùng có câu hỏi tiếp theo, hãy nối tiếp vào cùng một tài liệu nghiên cứu đó
   - Cập nhật các trường frontmatter `last_updated` và `last_updated_by` để phản ánh bản cập nhật
   - Thêm `last_updated_note: "Thêm nghiên cứu tiếp theo cho [mô tả ngắn]"` vào frontmatter
   - Thêm một phần mới: `## Nghiên cứu tiếp theo [timestamp]`
   - Tạo các sub-agent mới khi cần thiết để điều tra thêm
   - Tiếp tục cập nhật tài liệu và đồng bộ hóa

## Lưu ý quan trọng:
- Luôn sử dụng các Task agent song song để tối đa hóa hiệu quả và giảm thiểu việc sử dụng context
- Luôn chạy nghiên cứu codebase mới - không bao giờ chỉ dựa vào các tài liệu nghiên cứu hiện có
- Thư mục thoughts/ cung cấp ngữ cảnh lịch sử để bổ sung cho các kết quả thực tế
- Tập trung vào việc tìm kiếm các đường dẫn file và số dòng cụ thể để nhà phát triển tham khảo
- Tài liệu nghiên cứu phải độc lập và chứa đầy đủ ngữ cảnh cần thiết
- Mỗi prompt của sub-agent phải cụ thể và tập trung vào các thao tác tài liệu chỉ đọc (read-only)
- Tài liệu hóa các kết nối chéo giữa các thành phần và cách các hệ thống tương tác với nhau
- Bao gồm ngữ cảnh thời gian (khi nghiên cứu được thực hiện)
- Liên kết đến GitHub khi có thể để làm tham chiếu lâu dài
- Giữ cho agent chính tập trung vào việc tổng hợp, không phải đọc file sâu
- Yêu cầu các sub-agent tài liệu hóa các ví dụ và pattern sử dụng như chúng đang tồn tại
- Khám phá toàn bộ thư mục thoughts/, không chỉ thư mục con research
- **TỐI QUAN TRỌNG**: Bạn và tất cả các sub-agent là người lập tài liệu, không phải người đánh giá
- **GHI NHỚ**: Tài liệu hóa những gì ĐANG CÓ, không phải những gì NÊN CÓ
- **KHÔNG ĐƯA RA KHUYẾN NGHỊ**: Chỉ mô tả trạng thái hiện tại của codebase
- **Đọc file**: Luôn đọc TOÀN BỘ các file được đề cập (không dùng limit/offset) trước khi tạo các sub-task
- **Thứ tự quan trọng**: Thực hiện chính xác theo các bước được đánh số
  - LUÔN LUÔN đọc các file được đề cập trước khi tạo sub-task (bước 1)
  - LUÔN LUÔN đợi tất cả các sub-agent hoàn thành trước khi tổng hợp (bước 4)
  - LUÔN LUÔN thu thập siêu dữ liệu trước khi viết tài liệu (bước 5 trước bước 6)
  - KHÔNG BAO GIỜ viết tài liệu nghiên cứu với các giá trị tạm thời (placeholder)
- **Xử lý đường dẫn**: Thư mục thoughts/searchable/ chứa các liên kết cứng (hard link) để tìm kiếm
  - Luôn tài liệu hóa các đường dẫn bằng cách CHỈ loại bỏ "searchable/" - giữ lại tất cả các thư mục con khác
  - Ví dụ về các chuyển đổi chính xác:
    - `thoughts/searchable/allison/old_stuff/notes.md` → `thoughts/allison/old_stuff/notes.md`
    - `thoughts/searchable/shared/prs/123.md` → `thoughts/shared/prs/123.md`
    - `thoughts/searchable/global/shared/templates.md` → `thoughts/global/shared/templates.md`
  - KHÔNG BAO GIỜ thay đổi allison/ thành shared/ hoặc ngược lại - giữ nguyên cấu trúc thư mục chính xác
  - Điều này đảm bảo các đường dẫn chính xác cho việc chỉnh sửa và điều hướng
- **Tính nhất quán của frontmatter**:
  - Luôn bao gồm frontmatter ở đầu tài liệu nghiên cứu
  - Giữ các trường frontmatter nhất quán trên tất cả các tài liệu nghiên cứu
  - Cập nhật frontmatter khi thêm nghiên cứu tiếp theo
  - Sử dụng snake_case cho tên trường có nhiều từ (ví dụ: `last_updated`, `git_commit`)
  - Các tag phải liên quan đến chủ đề nghiên cứu và các thành phần được nghiên cứu