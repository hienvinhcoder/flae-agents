# IDEA: Đăng ký, Đăng nhập & Quản lý Workspace (Authentication & Workspace)

## 1. Summary (Tóm tắt)
Tính năng xác thực người dùng (Authentication) và khởi tạo/tham gia không gian làm việc (Workspace). Đây là điểm chạm đầu tiên của người dùng khi truy cập vào nền tảng FLAE Agent, giúp định danh người dùng, bảo mật hệ thống và phân tách dữ liệu theo từng doanh nghiệp riêng biệt.

## 2. Context (Bối cảnh)

### Project (Dự án)
FLAE Agent

### Current Situation (Tình trạng hiện tại)
Hệ thống chưa có cơ chế kiểm soát người dùng truy cập. Cần có một hệ thống tài khoản an toàn để bảo vệ thông tin doanh nghiệp và cho phép phân quyền sử dụng các tác nhân AI (Chat Agent, Analyst Agent, Voice Agent).

### Problem (Vấn đề)
- Cần phân tách dữ liệu rõ ràng giữa các doanh nghiệp (Tenant isolation).
- Chủ doanh nghiệp cần mời nhân viên vào cùng quản lý hệ thống mà vẫn giữ an toàn dữ liệu.
- Quá trình tạo tài khoản của các phần mềm B2B thường phức tạp, gây rào cản cho chủ shop nhỏ lẻ tại Việt Nam.

## 3. Goal (Mục tiêu)

### Main Goal (Mục tiêu chính)
Tạo ra luồng Onboarding nhanh chóng, mượt mà và bảo mật cao thông qua Firebase Auth (Google Login + Email/Password).

### Expected Outcome (Kết quả mong đợi)
- Người dùng đăng nhập/đăng ký thành công dưới 30 giây.
- Chủ doanh nghiệp có thể tạo Workspace mới và khai báo thông tin cơ bản dễ dàng.
- Nhân viên có thể tham gia vào Workspace có sẵn thông qua liên kết hoặc mã mời.
- Dữ liệu hoàn toàn được phân tách (tenant_id riêng biệt).

## 4. Target Users (Người dùng mục tiêu)

### Main Users (Người dùng chính)
- Chủ shop online, chủ doanh nghiệp nhỏ (Role: Owner).
- Quản lý bán hàng, vận hành (Role: Admin).
- Nhân viên chăm sóc khách hàng (Role: Member).

### User Needs (Nhu cầu của người dùng)
- Owner: Muốn tạo tài khoản nhanh, thiết lập thông tin doanh nghiệp ngay để xem AI hoạt động thế nào.
- Admin/Member: Muốn truy cập hệ thống nhanh chóng bằng lời mời từ Owner.

### Desired Feeling (Cảm giác mong muốn)
Nhanh gọn, đáng tin cậy, chuyên nghiệp và bảo mật.

## 5. Scope (Phạm vi)

### In Scope (Trong phạm vi)
- Đăng nhập/Đăng ký qua Google (Social Login).
- Đăng nhập/Đăng ký qua Email và Mật khẩu.
- Chức năng Quên mật khẩu.
- Màn hình khởi tạo Workspace (Tên doanh nghiệp, ngành hàng, mô tả ngắn).
- Chức năng mời thành viên và tham gia Workspace có sẵn.
- Quản lý Role (Owner, Admin, Member).

### Out of Scope (Ngoài phạm vi)
- Đăng nhập bằng Apple ID, Github, Facebook (sẽ bổ sung sau nếu cần).
- Xác thực 2 bước (2FA).
- Single Sign-On (SSO) doanh nghiệp (SAML, Okta).

### Assumptions (Các giả định)
- Đa số người dùng SMB tại Việt Nam đều có và quen sử dụng tài khoản Google/Gmail.
- Người dùng sẽ dùng 1 tài khoản email để tham gia/tạo 1 Workspace duy nhất trong giai đoạn MVP (hoặc cho phép 1 email thuộc nhiều workspace nếu cần thiết, nhưng ưu tiên 1-1 trước cho đơn giản).

## 6. Main User Flow (Luồng người dùng chính)

1. Người dùng truy cập trang Đăng nhập/Đăng ký.
2. Chọn Đăng nhập qua Google (hoặc nhập Email/Password).
3. Hệ thống xác thực qua Firebase Auth.
4. Kiểm tra trạng thái người dùng:
   - Nếu đã có Workspace: Chuyển hướng vào Morning Briefing Dashboard.
   - Nếu chưa có Workspace và có mã mời: Tham gia Workspace hiện tại theo Role được phân.
   - Nếu chưa có Workspace: Hiển thị màn hình Tạo Workspace (Nhập Tên doanh nghiệp, Ngành hàng).
5. Hoàn tất Onboarding và chuyển vào Dashboard.

### Entry Point (Điểm bắt đầu)
Màn hình Landing Page -> Nút "Đăng nhập" / "Bắt đầu miễn phí". Hoặc người dùng click vào link mời tham gia.

### End Point (Điểm kết thúc)
Người dùng truy cập thành công vào màn hình Morning Briefing Dashboard của Workspace.

## 7. UX Direction (Định hướng UX)

### Experience Style (Phong cách Trải nghiệm)
- Hiện đại, tối giản, Glassmorphism nhẹ (theo Design System Green Growth).
- Chia nhỏ các bước Onboarding (Step-by-step wizard) để người dùng không bị ngợp.

### Key UX Principles (Nguyên tắc UX cốt lõi)
- Ít thao tác gõ chữ nhất có thể (Sử dụng Google Login).
- Rõ ràng trong thông báo lỗi (ví dụ: Sai mật khẩu, Email đã tồn tại).
- Không yêu cầu thiết lập quá nhiều cấu hình thừa trong bước đầu tiên.

### Information to Display (Thông tin cần hiển thị)
- Logo FLAE Agent và câu Slogan.
- Các nút đăng nhập (Google, Email).
- Form điền thông tin (Email, Pass).
- Form tạo Workspace (Tên, Ngành hàng dropdown).

### Main User Actions (Hành động chính của người dùng)
- Click Đăng nhập Google.
- Nhập Email/Password.
- Điền form tạo Workspace.
- Chấp nhận lời mời tham gia Workspace.

### Primary CTA (Nút CTA chính)
"Tiếp tục với Google", "Tạo Workspace", "Đăng nhập".

### Secondary CTA (Nút CTA phụ)
"Quên mật khẩu", "Bạn chưa có tài khoản? Đăng ký ngay".

## 8. Conceptual Data (Dữ liệu Ý niệm)

### Main Objects (Các đối tượng chính)
- Người dùng (User).
- Không gian làm việc (Workspace / Tenant).
- Lời mời (Invitation).

### Required Information (Thông tin bắt buộc)
- User ID: Định danh người dùng.
- Email: Email liên hệ / đăng nhập.
- Name: Tên hiển thị.
- Workspace ID: Định danh doanh nghiệp.
- Workspace Name: Tên doanh nghiệp.
- User Role: Quyền hạn (Owner, Admin, Member).

### Input (Đầu vào)
Từ người dùng: Thông tin xác thực (Google/Email), Thông tin Workspace ban đầu.

### Output (Đầu ra)
Từ hệ thống: Session đăng nhập hợp lệ (Firebase Token), Workspace được khởi tạo sẵn sàng cho cấu hình Agent.

## 9. States & Edge Cases (Trạng thái & Trường hợp ngoại lệ)

### Loading State (Trạng thái Đang tải)
Hiển thị spinner hoặc skeleton trên form khi đang kết nối với Firebase Auth / Backend. Nút CTA chuyển sang trạng thái disabled.

### Empty State (Trạng thái Trống)
N/A (Tuy nhiên nếu người dùng chưa có Workspace, sẽ thấy màn hình yêu cầu tạo/tham gia).

### Error State (Trạng thái Lỗi)
- Nhập sai mật khẩu/email.
- Mạng gián đoạn.
- Mã mời (Invite Code) đã hết hạn hoặc không tồn tại.
(Hiển thị thông báo Toast/Inline đỏ rõ ràng).

### Success State (Trạng thái Thành công)
Thông báo chào mừng nhỏ (Welcome) và chuyển mượt mà vào Dashboard.

### Edge Cases (Trường hợp ngoại lệ)
- Người dùng đã đăng ký bằng Email/Password, nhưng lần sau lại click "Đăng nhập bằng Google" với cùng email (Hệ thống cần liên kết tài khoản tự động qua Firebase).
- Người dùng được mời bằng email A, nhưng đăng nhập bằng email B (Hệ thống từ chối truy cập).

## 10. Product Constraints (Ràng buộc Sản phẩm)

### UX Constraints (Ràng buộc UX)
- Phải theo đúng bộ màu và font chữ của Design System `docs/DESIGN.md`.

### Business Constraints (Ràng buộc Kinh doanh)
- Một Workspace phải có ít nhất 1 Owner. Không thể xóa User nếu đó là Owner duy nhất.

### High-Level Data Constraints (Ràng buộc Dữ liệu cấp cao)
- Dữ liệu Workspace phải hoàn toàn cô lập bằng `tenant_id`.
- Mọi request API lên Backend sau khi đăng nhập đều phải kèm token xác thực.

### High-Level Technical Constraints (Ràng buộc Kỹ thuật cấp cao)
- Bắt buộc sử dụng Firebase Authentication.
- Không tự lưu plaintext password dưới database.

## 11. Completion Checklist (Danh sách kiểm tra hoàn thành)

- [x] Người dùng mục tiêu đã rõ ràng
- [x] Mục tiêu chính đã rõ ràng
- [x] Luồng người dùng chính đã rõ ràng
- [x] Thông tin chính cần hiển thị đã rõ ràng
- [x] Hành động chính của người dùng đã rõ ràng
- [x] Các trạng thái tải/trống/lỗi/thành công đã rõ ràng
- [x] Các mục trong phạm vi và ngoài phạm vi đã rõ ràng
- [x] Các giả định và câu hỏi mở đã được ghi lại

## 12. Open Questions (Câu hỏi Mở)

- Trong tương lai, một người dùng có được phép làm Owner/Member của nhiều Workspace khác nhau (Multi-tenant access) hay không? MVP hiện tại sẽ ưu tiên 1 User - 1 Workspace hay mở rộng ngay từ đầu?
- Việc gửi email lời mời (Invite Email) sẽ dùng dịch vụ nào (SendGrid, Firebase Extensions)?

## 13. Notes for Next Workflows (Lưu ý cho các Workflow tiếp theo)

### For Design Brief Agent (Cho Tác nhân Thiết kế Brief)
Cần thiết kế các màn hình: Login/Register, Tạo Workspace (Step 1-2), Accept Invitation. Tập trung vào không gian sạch, khoảng trắng và typography. Có thể tham khảo màn hình `docs/mock-ui/login.html` đã có.

### For Frontend Plan Agent (Cho Tác nhân Kế hoạch Frontend)
Thiết lập Auth Guard cho Angular Routing. Tích hợp `@angular/fire/auth`. Quản lý state của session và tenant_id bằng Signals.

### For Backend Plan Agent (Cho Tác nhân Kế hoạch Backend)
Tạo middleware xác thực Firebase JWT. Viết logic tạo cấu trúc collection cho Workspace (tenant) và gán Role cho User trong Firestore.

### For Spec Agent (Cho Tác nhân Đặc tả)
Cần mô tả chi tiết Firebase Auth rules, cấu trúc document của collection `users` và `workspaces` trên Firestore.
