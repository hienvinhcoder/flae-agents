# PRD Lean — FLAE Agent

## 1. Tóm tắt sản phẩm

**FLAE Agent** là nền tảng AI Workforce dành cho SMB tại Việt Nam, giúp doanh nghiệp vận hành chăm sóc khách hàng, phân tích dữ liệu và xử lý tương tác đa kênh bằng một đội ngũ agent có kiểm soát.

Thay vì bắt chủ doanh nghiệp dùng nhiều dashboard và phần mềm rời rạc, FLAE gom các tác vụ vận hành hằng ngày vào một trải nghiệm hội thoại: đọc báo cáo, xử lý inbox, nhận cảnh báo, duyệt hành động AI và theo dõi khách hàng.

**Định vị:**  
FLAE là “đội ngũ nhân viên AI có kiểm soát” cho SMB Việt Nam: dễ dùng như chat, nhưng có memory, approval, audit log và human takeover.

---

## 2. Người dùng mục tiêu

### Nhóm chính

- Chủ shop online.
- Chủ doanh nghiệp nhỏ.
- Quản lý bán hàng/vận hành.
- Đội chăm sóc khách hàng nhỏ từ 1–10 người.

### Ngành ưu tiên ban đầu

- Shop thương mại điện tử.
- Local brand.
- Spa/phòng khám nhỏ.
- Trung tâm đào tạo nhỏ.
- F&B quy mô nhỏ.
- Doanh nghiệp bán hàng qua Facebook, Zalo, website và hotline.

---

## 3. Vấn đề cần giải quyết

SMB tại Việt Nam thường gặp 5 vấn đề chính:

1. **Tin nhắn phân tán nhiều kênh**: Facebook, Zalo, website, hotline khiến phản hồi dễ sót và thiếu nhất quán.
2. **Thiếu nhân sự vận hành**: chủ doanh nghiệp phải kiêm bán hàng, CSKH, phân tích và marketing.
3. **Dữ liệu rời rạc**: đơn hàng, khách hàng, chat, cuộc gọi và báo cáo không nằm chung một nơi.
4. **Dashboard khó hành động**: nhiều số liệu nhưng không trả lời rõ “hôm nay cần làm gì?”.
5. **AI thiếu kiểm soát**: chatbot dễ trả lời sai, bịa thông tin hoặc vượt quyền nếu không có guardrails.

---

## 4. Nguyên tắc sản phẩm

- **Conversational-first:** người dùng giao việc cho AI như giao việc cho nhân viên.
- **Human-in-control:** hành động nhạy cảm cần duyệt, sửa hoặc takeover.
- **Memory-first:** agent hiểu doanh nghiệp, sản phẩm, chính sách, khách hàng và lịch sử tương tác.
- **Realtime-first:** inbox, briefing, approval và agent state cập nhật theo thời gian thực.
- **Reliability-first:** agent phải có quyền hạn rõ ràng, log, eval và cơ chế học từ lỗi.

---

## 5. Phạm vi MVP

### In scope

1. **Authentication & Workspace Setup**
   - Đăng nhập.
   - Tạo workspace doanh nghiệp.
   - Nhập thông tin cơ bản về ngành hàng, sản phẩm/dịch vụ.

2. **Knowledge Base / Trí nhớ doanh nghiệp**
   - Upload tài liệu.
   - Thêm FAQ, chính sách, link sản phẩm.
   - Agent truy xuất tri thức để trả lời và phân tích.

3. **My Agent Team**
   - Quản lý 3 agent MVP: Chat Agent, Analyst Agent, Voice Agent.
   - Bật/tắt agent.
   - Xem trạng thái, vai trò và quyền hạn cơ bản.

4. **Omnichannel Inbox**
   - Hợp nhất hội thoại từ Website Chat, Facebook Messenger và Zalo OA.
   - Xem/gửi tin nhắn.
   - AI draft reply.
   - Auto-reply cho tình huống an toàn.
   - Human takeover.

5. **Business Data Integrations**
   - Tích hợp với nền tảng quản lý bán hàng để lấy dữ liệu doanh thu, đơn hàng, sản phẩm, tồn kho và khách hàng.
   - MVP bắt buộc hỗ trợ trước Haravan và KiotViet.
   - Giai đoạn đầu ưu tiên quyền đọc dữ liệu, tạo báo cáo, cảnh báo và đề xuất hành động.
   - Chưa cho agent tự ghi ngược dữ liệu quan trọng nếu chưa có approval rõ ràng.

6. **Flae Agent tổng**
   - Là agent giao tiếp chính với chủ doanh nghiệp.
   - Có thể trả lời câu hỏi về doanh số, đơn hàng, sản phẩm, tồn kho, khách hàng thông qua tools được cấp quyền.
   - Có thể điều phối các agent chuyên môn để thực hiện yêu cầu phức tạp, ví dụ tạo chiến dịch khảo sát bằng voice.

7. **Morning Briefing**
   - Feed báo cáo buổi sáng.
   - Tóm tắt doanh thu, khách hàng, hội thoại cần xử lý, cảnh báo bất thường.

8. **Voice Agent MVP**
   - Nhận transcript cuộc gọi.
   - Tóm tắt nội dung.
   - Trích xuất intent, thông tin khách hàng và follow-up task.
   - Hỗ trợ tạo và chuẩn bị chiến dịch khảo sát bằng voice khi được Flae Agent điều phối.

9. **Agent Reliability Harness**
   - Agent Contract.
   - Tool guardrails.
   - Approval queue.
   - Audit log.
   - Evals nội bộ cơ bản.

### Out of scope

- Growth Hub đầy đủ.
- Growth Agent tự chạy chiến dịch marketing.
- Tự động chạy ads.
- Workflow automation phức tạp kiểu Zapier.
- Tích hợp sâu nhiều sàn thương mại điện tử.
- Multi-branch enterprise management.
- AI tự ra quyết định tài chính/khuyến mãi mà không cần duyệt.

---

## 6. Agent trong MVP

| Agent | Vai trò | Phạm vi MVP |
|---|---|---|
| Flae Agent | Agent tổng giao tiếp với chủ doanh nghiệp | Nhận yêu cầu, trả lời câu hỏi kinh doanh, gọi tool dữ liệu, điều phối Chat/Analyst/Voice Agent khi cần |
| Chat Agent | Chăm sóc khách hàng đa kênh | Draft reply, auto-reply an toàn, phân loại intent, chuyển người khi cần |
| Analyst Agent | Phân tích số liệu và tạo báo cáo | Daily briefing, cảnh báo bất thường, trả lời câu hỏi phân tích cơ bản |
| Voice Agent | Xử lý tương tác giọng nói | Tóm tắt transcript, trích xuất intent, tạo follow-up task, hỗ trợ tạo chiến dịch khảo sát bằng voice |
| Growth Agent | Tăng trưởng/marketing | Post-MVP |

---

## 7. Tính năng chính

## 7.1 Morning Briefing

**Mục tiêu:** giúp chủ doanh nghiệp biết ngay hôm nay cần tập trung vào việc gì.

**Nội dung MVP:**

- Doanh thu hôm qua/hôm nay.
- Số khách mới.
- Hội thoại chưa xử lý.
- Khách cần phản hồi gấp.
- Cảnh báo bất thường.
- Gợi ý hành động trong ngày.

**Acceptance criteria:**

- Người dùng thấy briefing feed sau khi đăng nhập.
- Mỗi item có tiêu đề, nội dung ngắn, agent gửi, thời gian và CTA.
- CTA điều hướng sang inbox, báo cáo hoặc approval queue.
- Feed cập nhật realtime.

---

## 7.2 Omnichannel Inbox

**Kênh MVP:**

| Kênh | Ưu tiên | Ghi chú |
|---|---:|---|
| Website Chat | P0 | Widget do FLAE kiểm soát, dễ triển khai trước |
| Facebook Messenger | P0 | Kênh phổ biến với shop online Việt Nam |
| Zalo OA | P0 | Kênh quan trọng cho SMB Việt Nam |

**Chức năng MVP:**

- Xem danh sách hội thoại realtime.
- Xem và gửi tin nhắn.
- AI tạo draft reply.
- Approve/edit/reject draft.
- Auto-reply cho FAQ an toàn.
- Human takeover.
- Gắn trạng thái: new, open, waiting, resolved.
- Gắn intent: hỏi giá, tư vấn, đổi trả, khiếu nại, đặt lịch, khác.

**AI response mode:**

| Mode | Mô tả | Dùng khi |
|---|---|---|
| Draft only | AI chỉ soạn nháp | Giai đoạn đầu hoặc nội dung nhạy cảm |
| Auto-reply safe | AI tự trả lời khi confidence cao | FAQ, chính sách rõ ràng |
| Human takeover | Người thật tiếp quản | Khiếu nại, hoàn tiền, giá đặc biệt, lỗi hệ thống |

---

## 7.3 Knowledge Base

**Mục tiêu:** giúp agent trả lời dựa trên dữ liệu thật của doanh nghiệp thay vì suy đoán.

**Input MVP:**

- PDF, DOCX, TXT, CSV.
- Link sản phẩm/chính sách.
- FAQ thủ công.
- Chính sách đổi trả, bảo hành, thanh toán, giao hàng.

**Yêu cầu:**

- Agent ưu tiên thông tin từ Knowledge Base của workspace.
- Nếu không có thông tin chắc chắn, agent không được bịa.
- Câu trả lời nhạy cảm nên có nguồn nội bộ.
- Người dùng xem được trạng thái tài liệu: pending, processing, ready, failed.

---

## 7.4 Business Data Integrations

**Mục tiêu:** kết nối FLAE với các nền tảng quản lý bán hàng/POS để agent có dữ liệu vận hành thật, từ đó trả lời câu hỏi, tạo báo cáo, phát hiện vấn đề và đề xuất hành động.

**Nền tảng MVP:**

| Nền tảng | Ưu tiên | Dữ liệu cần lấy |
|---|---:|---|
| Haravan | P0 | Doanh thu, đơn hàng, sản phẩm, tồn kho, khách hàng |
| KiotViet | P0 | Doanh thu, đơn hàng, sản phẩm, tồn kho, khách hàng |

**Loại dữ liệu cần đồng bộ:**

- Doanh thu.
- Đơn hàng.
- Sản phẩm.
- Tồn kho.
- Khách hàng.

**Quyền agent trong MVP:**

- Đọc dữ liệu từ nền tảng tích hợp.
- Trả lời câu hỏi của chủ doanh nghiệp.
- Tạo báo cáo và cảnh báo.
- Đề xuất hành động tiếp theo.
- Không tự động ghi ngược dữ liệu quan trọng nếu chưa có approval/harness rõ ràng.

**Ví dụ câu hỏi:**

- “Hôm nay doanh thu bao nhiêu?”
- “Đơn hàng nào chưa giao?”
- “Sản phẩm nào bán chạy nhất tuần này?”
- “Khách hàng nào mua nhiều nhất?”
- “Tồn kho sản phẩm A còn bao nhiêu?”
- “Vì sao doanh thu hôm qua giảm?”

**Acceptance criteria:**

- Người dùng có thể kết nối Haravan hoặc KiotViet trong workspace.
- Hệ thống hiển thị trạng thái kết nối: active, needs_auth, error, paused.
- Flae Agent có thể gọi tool đọc dữ liệu để trả lời câu hỏi kinh doanh.
- Analyst Agent có thể dùng dữ liệu tích hợp để tạo briefing và báo cáo.
- Mỗi lần agent truy xuất dữ liệu phải được ghi log để audit.

---

## 7.5 Flae Agent tổng

**Mục tiêu:** Flae Agent là đầu mối giao tiếp chính giữa chủ doanh nghiệp và toàn bộ hệ thống agent.

Người dùng không cần biết nên hỏi Chat Agent, Analyst Agent hay Voice Agent. Họ chỉ cần nói với Flae Agent, còn Flae sẽ tự hiểu ý định, gọi tool phù hợp hoặc điều phối agent chuyên môn.

**Nhiệm vụ MVP:**

- Trả lời câu hỏi về doanh số, đơn hàng, tồn kho, sản phẩm và khách hàng.
- Gọi data tools từ Haravan/KiotViet.
- Tạo báo cáo nhanh theo yêu cầu.
- Tạo cảnh báo hoặc insight cho Morning Briefing.
- Điều phối Chat Agent, Analyst Agent và Voice Agent khi yêu cầu liên quan đến nhiều bước.

**Ví dụ yêu cầu:**

- “Hôm nay tình hình kinh doanh sao rồi?”
- “Có đơn nào chưa giao không?”
- “Sản phẩm nào đang sắp hết hàng?”
- “Tạo cho tôi một chiến dịch khảo sát bằng voice.”

**Ví dụ luồng điều phối chiến dịch khảo sát bằng voice:**

1. Chủ shop yêu cầu Flae Agent tạo chiến dịch khảo sát bằng voice.
2. Flae Agent hỏi hoặc suy ra mục tiêu khảo sát, nhóm khách hàng và nội dung cần hỏi.
3. Flae Agent gọi Analyst Agent để chọn nhóm khách hàng phù hợp từ dữ liệu đơn hàng/khách hàng.
4. Flae Agent gọi Voice Agent để tạo kịch bản cuộc gọi và cấu hình chiến dịch.
5. Nếu chiến dịch có tác động ra ngoài, hệ thống tạo approval request.
6. Chủ shop approve/edit/reject trước khi chiến dịch được kích hoạt.

**Yêu cầu reliability:**

- Flae Agent phải phân biệt rõ câu trả lời dựa trên dữ liệu thật và nhận định/gợi ý.
- Các hành động tác động ra ngoài như gọi khách, gửi khảo sát, gửi tin hàng loạt phải cần approval.
- Flae Agent không được tự thay đổi dữ liệu đơn hàng, tồn kho, khách hàng nếu chưa được cấp quyền rõ ràng.

---

## 7.6 Analyst Agent

**Nhiệm vụ MVP:**

- Tạo báo cáo ngày/tuần.
- Phát hiện hội thoại quá hạn xử lý.
- Cảnh báo doanh thu hoặc lượng hội thoại bất thường.
- Trả lời câu hỏi phân tích bằng ngôn ngữ tự nhiên.
- Tạo item cho Morning Briefing.

**Yêu cầu:**

- Báo cáo phải nêu rõ khoảng thời gian dữ liệu.
- Phân biệt số liệu thực tế và nhận định/gợi ý.
- Không suy diễn nếu thiếu dữ liệu.
- Báo cáo quan trọng phải lưu lại để audit.

---

## 7.7 Voice Agent

**Phạm vi MVP:**

- Lưu transcript cuộc gọi.
- Tóm tắt nội dung.
- Trích xuất intent.
- Trích xuất thông tin khách hàng.
- Tạo follow-up task.
- Đánh dấu transcript confidence thấp.

**Post-MVP:**

- Nhận cuộc gọi inbound tự động.
- Gọi outbound theo kịch bản.
- Voice bot xử lý FAQ.
- Live handoff cho người thật.

---

## 7.8 Agent Reliability Harness

**Mục tiêu:** đảm bảo agent hoạt động đúng quyền hạn, có kiểm soát và có thể kiểm tra lại.

**Thành phần MVP:**

1. **Agent Contract**
   - Vai trò agent.
   - Tool được phép dùng.
   - Hành động cần duyệt.
   - Tình huống phải chuyển người.
   - Output schema bắt buộc.

2. **Tool Guardrails**
   - Kiểm tra quyền agent.
   - Validate input/output.
   - Chặn hành động vượt quyền.
   - Chặn gửi thông tin nhạy cảm hoặc không có nguồn.

3. **Approval Queue**
   - Người dùng approve/edit/reject hành động AI.
   - Áp dụng cho hoàn tiền, giảm giá, khiếu nại, hủy đơn, nội dung confidence thấp.

4. **Audit Log & Trace**
   - Lưu agent run.
   - Lưu tool call.
   - Lưu context/retrieval đã dùng.
   - Lưu người duyệt và quyết định duyệt.

5. **Evaluation Harness**
   - Test case cho Chat Agent.
   - Test case cho Analyst Agent.
   - Test case cho Voice Agent summary.
   - Replay các hội thoại lỗi.

---

## 8. Luồng người dùng chính

## 8.1 Onboarding

1. Người dùng đăng ký/đăng nhập.
2. Tạo workspace và thiết lập thông tin doanh nghiệp qua 2 phương thức:
   - **Nhập form thủ công:** Điền thông tin doanh nghiệp cơ bản.
   - **Tích hợp nền tảng:** Kết nối trực tiếp đến các nền tảng quản lý hiện tại (như Haravan, KiotViet) để đồng bộ thông tin cửa hàng (cơ chế này cũng giúp kiểm tra và tránh trường hợp nhiều account FLAE kết nối trùng 1 cửa hàng).
3. Upload tài liệu hoặc thêm FAQ.
4. Bật Chat Agent, Analyst Agent, Voice Agent.
5. Kết nối Website Chat, Facebook Messenger và Zalo OA.
6. Hệ thống tạo Morning Briefing mẫu.

## 8.2 Xử lý tin nhắn khách hàng

1. Khách gửi tin qua Website Chat, Facebook Messenger hoặc Zalo OA.
2. Tin nhắn được lưu vào Firestore.
3. Inbox cập nhật realtime.
4. Chat Agent phân loại intent và truy xuất Knowledge Base.
5. Harness kiểm tra confidence, nguồn và quyền hạn.
6. Nếu an toàn: AI tạo draft hoặc auto-reply.
7. Nếu nhạy cảm: tạo approval request.
8. Người dùng approve/edit/reject.
9. Hệ thống gửi tin và lưu audit log.

## 8.3 Hỏi đáp dữ liệu kinh doanh

1. Chủ doanh nghiệp hỏi Flae Agent về doanh thu, đơn hàng, tồn kho, sản phẩm hoặc khách hàng.
2. Flae Agent xác định intent và nguồn dữ liệu cần dùng.
3. Flae Agent gọi tool đọc dữ liệu từ Haravan/KiotViet hoặc dữ liệu đã đồng bộ.
4. Analyst Agent hỗ trợ phân tích nếu câu hỏi cần so sánh, tìm nguyên nhân hoặc tạo insight.
5. Flae Agent trả lời bằng ngôn ngữ tự nhiên, nêu rõ khoảng thời gian và nguồn dữ liệu.
6. Nếu có đề xuất hành động, hệ thống phân biệt rõ giữa số liệu thực tế và gợi ý.

## 8.4 Tạo chiến dịch khảo sát bằng voice

1. Chủ shop nói: “Tạo cho tôi một chiến dịch khảo sát bằng voice.”
2. Flae Agent xác định mục tiêu chiến dịch, nhóm khách hàng và nội dung cần khảo sát.
3. Nếu thiếu thông tin quan trọng, Flae Agent hỏi bổ sung.
4. Analyst Agent chọn hoặc đề xuất segment khách hàng từ dữ liệu tích hợp.
5. Voice Agent tạo kịch bản gọi và nội dung khảo sát.
6. Hệ thống tạo approval request trước khi kích hoạt chiến dịch.
7. Sau khi được duyệt, chiến dịch mới được thực hiện hoặc chuyển sang trạng thái sẵn sàng chạy.

## 8.5 Morning Briefing

1. Scheduled job tổng hợp dữ liệu.
2. Analyst Agent phân tích.
3. Harness kiểm tra output schema.
4. Item được lưu vào `briefing_items`.
5. Frontend hiển thị trong feed realtime.

## 8.6 Voice call summary

1. Transcript được import hoặc ghi nhận.
2. Voice Agent tóm tắt.
3. Trích xuất intent, thông tin khách hàng và việc cần làm.
4. Nếu transcript không rõ, đánh dấu cần kiểm tra.
5. Lưu summary vào customer profile/conversation.

---

## 9. Yêu cầu chức năng MVP

| Nhóm | Requirement | Priority |
|---|---|---:|
| Auth | Đăng nhập bằng Firebase Auth | P0 |
| Workspace | Tạo workspace và tenant isolation | P0 |
| Workspace | Role cơ bản: owner, admin, member | P1 |
| KB | Upload tài liệu và lưu metadata | P0 |
| KB | Background job xử lý tài liệu | P0 |
| KB | Agent retrieval từ KB | P0 |
| Inbox | Realtime conversation list | P0 |
| Inbox | Gửi tin nhắn thủ công | P0 |
| Inbox | AI draft reply | P0 |
| Inbox | Approve/edit/reject draft | P0 |
| Inbox | Human takeover | P0 |
| Inbox | Website Chat connector | P0 |
| Inbox | Facebook Messenger connector | P0 |
| Inbox | Zalo OA connector | P0 |
| Integration | Haravan connector | P0 |
| Integration | KiotViet connector | P0 |
| Integration | Đồng bộ doanh thu, đơn hàng, sản phẩm, tồn kho, khách hàng | P0 |
| Integration | Theo dõi trạng thái kết nối | P0 |
| Flae Agent | Hỏi đáp dữ liệu kinh doanh qua tools | P0 |
| Flae Agent | Điều phối agent chuyên môn theo yêu cầu chủ shop | P0 |
| Flae Agent | Tạo approval request cho hành động tác động ra ngoài | P0 |
| Analyst | Daily briefing | P0 |
| Analyst | Phát hiện hội thoại quá hạn | P0 |
| Analyst | Phân biệt fact và insight | P0 |
| Voice | Lưu transcript | P0 |
| Voice | Tóm tắt transcript | P0 |
| Voice | Trích xuất intent/follow-up | P0 |
| Voice | Chuẩn bị chiến dịch khảo sát bằng voice | P1 |
| Harness | Agent Contract | P0 |
| Harness | Tool call log | P0 |
| Harness | Guardrails cho side-effect tools | P0 |
| Harness | Approval queue | P0 |
| Harness | Agent run trace | P0 |
| Harness | Evals cơ bản | P1 |

---

## 10. Security & permissions

### Tenant isolation

- Mọi dữ liệu nằm trong tenant namespace hoặc có `tenant_id`.
- Firestore Security Rules giới hạn user chỉ đọc/ghi workspace của mình.
- Backend mutation verify JWT và role trước khi ghi dữ liệu.

### Role cơ bản

| Role | Quyền |
|---|---|
| Owner | Toàn quyền workspace, billing, integrations, agent settings |
| Admin | Quản lý agent, inbox, KB, approvals |
| Member | Xử lý inbox, xem briefing, gửi phản hồi |
| Viewer | Chỉ xem báo cáo và briefing |

### AI permissions

Agent không có toàn quyền như user. Mỗi agent bị giới hạn bởi Agent Contract.

Ví dụ:

- Chat Agent không được xóa khách hàng.
- Analyst Agent không được gửi tin nhắn cho khách.
- Voice Agent không được cam kết hoàn tiền.
- Growth Agent không được gửi broadcast nếu chưa được duyệt.

---

## 14. UI/UX MVP

### Nguyên tắc trải nghiệm

- Thân thiện.
- Rõ ràng.
- Có kiểm soát.
- Realtime.
- Ít thuật ngữ kỹ thuật.
- Tập trung vào hành động tiếp theo.

### Màn hình MVP

1. Login / Signup.
2. Workspace onboarding.
3. Morning Briefing feed.
4. My Agent Team.
5. Knowledge Base.
6. Omnichannel Inbox.
7. Conversation detail.
8. Approval Queue.
9. Analyst Reports.
10. Voice Call Summaries.
11. Settings / Integrations.

---

## 15. Non-functional requirements

### Performance

- Inbox realtime update dưới 1–2 giây sau khi Firestore có dữ liệu mới.
- Background jobs không block UI.
- AI draft reply xuất hiện đủ nhanh cho ngữ cảnh CSKH.

### Reliability

- Tool calls có side effect phải idempotent nếu có thể.
- Agent run lỗi phải có trạng thái `failed` và error reason.
- Không gửi tin nhắn nếu guardrail fail.

### Observability

- Log agent runs.
- Log tool calls.
- Log approval decisions.
- Log integration errors.
- Dashboard nội bộ cho failed jobs và failed agent runs.

### Scalability

- Firestore schema tối ưu theo tenant.
- Messages nằm trong subcollection.
- Background workers có thể scale ngang.
- Knowledge processing tách khỏi request lifecycle.

---

## 16. Success metrics

### Product metrics

- Số workspace tạo mới.
- Tỉ lệ hoàn tất onboarding.
- Số tài liệu KB được upload.
- Số hội thoại được xử lý.
- Số AI drafts được tạo.
- Tỉ lệ draft được approve.
- Tỉ lệ human takeover.
- Số briefing item được đọc/click.

### Agent quality metrics

- Answer accuracy.
- Hallucination rate.
- Escalation precision.
- Approval rate.
- Edit rate.
- Reject rate.
- Tool guardrail failure rate.

### Business outcome metrics

- Thời gian phản hồi khách giảm.
- Tỉ lệ bỏ sót tin nhắn giảm.
- Chủ doanh nghiệp đọc báo cáo thường xuyên hơn.
- Số việc được xử lý từ Morning Briefing tăng.

---

## 17. Roadmap

### Phase 0 — Foundation

- Frontend Angular.
- Backend FastAPI.
- Firebase Auth + Firestore + Storage.
- Tenant model.
- Firestore Security Rules.
- Base design system.

### Phase 1 — Knowledge Base + Harness Core

- Upload tài liệu.
- Processing pipeline.
- Agent Contract Registry.
- Agent run logs.
- Tool call logs.
- Basic retrieval tool.

### Phase 2 — Inbox + Chat Agent

- Inbox UI.
- Website Chat widget.
- Facebook Messenger connector.
- Zalo OA connector.
- AI draft reply.
- Human takeover.
- Approval queue.
- Send-message guardrails.

### Phase 3 — Analyst Agent + Morning Briefing

- Daily briefing generator.
- Analyst reports.
- Basic anomaly detection.
- Briefing feed realtime.

### Phase 4 — Voice Agent MVP

- Transcript ingestion.
- Call summary.
- Intent extraction.
- Follow-up task.
- Confidence/escalation handling.

### Phase 5 — Evals & Production Hardening

- Eval cases cho Chat Agent.
- Eval cases cho Analyst/Voice.
- Replay failed traces.
- Internal quality dashboard.
- Better observability.

### Phase 6 — Growth Hub Post-MVP

- Growth suggestions.
- Campaign drafts.
- Customer segment insights.
- Marketing approval workflow.

---

## 18. Rủi ro chính

| Rủi ro | Mức độ | Giảm thiểu |
|---|---:|---|
| Agent trả lời sai chính sách | Cao | KB citation, confidence threshold, approval, evals |
| AI gửi tin nhắn không phù hợp | Cao | Draft-first, guardrails, human takeover |
| Tích hợp Zalo/Facebook phức tạp | Cao | Triển khai theo thứ tự Website Chat → Facebook → Zalo, có integration health |
| Tích hợp Haravan/KiotViet khác biệt dữ liệu | Cao | Chuẩn hóa data adapter, mapping schema nội bộ, log lỗi đồng bộ |
| Firestore schema khó scale | Trung bình | Query-first design, subcollection messages |
| Voice Agent vượt phạm vi MVP | Trung bình | Bắt đầu từ transcript summary, chưa làm outbound |
| Chi phí graph/vector tăng | Trung bình | Bắt đầu tối giản, theo dõi usage, tách storage theo giai đoạn |

---

## 19. Quyết định hiện tại

| Chủ đề | Quyết định |
|---|---|
| Agent MVP | Flae Agent tổng, Chat, Analyst, Voice |
| Growth Hub | Post-MVP |
| Data read | Firestore Real-time First |
| Backend | FastAPI + Firebase Admin + Firedantic |
| Background jobs | Celery + Redis |
| Frontend | Angular 19+ + Signals + NgRx SignalStore |
| Memory | Knowledge Base + Knowledge Graph + vector retrieval |
| Reliability | Agent Reliability Harness bắt buộc |
| Human control | Human takeover + approval queue |
| Kênh inbox MVP | Website Chat + Facebook Messenger + Zalo OA |
| Tích hợp quản lý MVP | Haravan + KiotViet |
| Quyền dữ liệu agent | Đọc dữ liệu, tạo báo cáo/cảnh báo, đề xuất hành động; ghi ngược cần approval/post-MVP |

---



