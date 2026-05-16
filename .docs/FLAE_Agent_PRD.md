# FLAE Agent — Lean PRD MVP

**Phiên bản:** v1.0
**Trạng thái:** Approved
**Cập nhật:** 2026-05-08
**Triết lý thiết kế cốt lõi:** **Agent-First** & **Reliability-First**

---

## 1. Tóm tắt & Triết lý sản phẩm

FLAE Agent là **AI Workforce Platform** (Nền tảng nhân sự AI) dành cho các SMB tại Việt Nam. Thay vì cấu hình các chatbot phức tạp theo luồng kịch bản (rule-based), người dùng FLAE sẽ "giao việc" cho một đội ngũ các AI Agents tự chủ.

**Định vị:** FLAE là "đội ngũ nhân viên AI có kiểm soát" cho SMB Việt Nam: dễ dùng như chat, nhưng có memory, approval, audit log và human takeover.

Triết lý cốt lõi:
- **Agent-First:** Hệ thống được thiết kế xoay quanh các tác vụ của Agent. Người dùng đóng vai trò là "Quản lý" giám sát và phê duyệt.
- **Memory-First:** Đội ngũ AI không bao giờ quên khách hàng nhờ hệ thống trí nhớ ngắn hạn và dài hạn.
- **Reliability-First (Kiểm soát an toàn):** AI được bọc trong một kiến trúc **Agent Harness** vững chắc để đảm bảo không bịa đặt, không vượt quyền và luôn có con người kiểm soát (Human-in-the-loop).

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
- Doanh nghiệp bán hàng qua Facebook, Zalo, website.

---

## 3. Agent Harness: "Hệ điều hành" cho AI

Để vận hành các Agents một cách an toàn và tin cậy trong môi trường doanh nghiệp, FLAE áp dụng kiến trúc **Agent Harness** (Công thức: `Agent = LLM + Harness`). Harness đóng vai trò là lớp cơ sở hạ tầng bọc ngoài LLM, chịu trách nhiệm:

1. **Governance & Guardrails (Kiểm soát rủi ro):** Thiết lập các ranh giới (Agent Contract) để đảm bảo Agent chỉ được làm những việc trong thẩm quyền. Những hành động nhạy cảm (như hoàn tiền, gửi báo giá đặc biệt) bắt buộc phải đưa vào **Approval Queue** để con người duyệt.
2. **State & Memory Management (Quản lý trạng thái & Trí nhớ):** Duy trì ngữ cảnh xuyên suốt nhiều phiên làm việc.
3. **Tool Orchestration (Điều phối công cụ):** Cung cấp môi trường an toàn (sandbox) để Agent gọi các API bên ngoài.
4. **Error Recovery & Observability (Phục hồi lỗi & Giám sát):** Cơ chế tự động thử lại (retry) hoặc tự sửa lỗi (self-correct) khi gọi tool thất bại, lưu trữ Audit Logs.

---

## 4. Phạm vi MVP

### In scope

1. **Authentication & Workspace Setup** — Đăng nhập, tạo workspace, nhập thông tin doanh nghiệp.
2. **Knowledge Base** — Upload tài liệu, FAQ, chính sách. Agent truy xuất để trả lời.
3. **My Agent Team** — Quản lý 4 agents: Flae Agent, Chat Agent, Analyst Agent, Voice Agent. Bật/tắt, xem trạng thái.
4. **Omnichannel Inbox** — Hợp nhất hội thoại từ Website Chat, Facebook Messenger, Zalo OA. AI draft/auto-reply, human takeover.
5. **Business Data Integrations** — Tích hợp Haravan & KiotViet (read-only). Đồng bộ doanh thu, đơn hàng, sản phẩm, tồn kho, khách hàng.
6. **Morning Briefing** — Feed báo cáo buổi sáng: doanh thu, khách mới, hội thoại chưa xử lý, cảnh báo bất thường.
7. **Agent Reliability Harness** — Agent Contract, Tool guardrails, Approval queue, Audit log, Evals cơ bản.

### Out of scope

- Growth Hub / Growth Agent (tự chạy chiến dịch marketing).
- Tự động chạy ads.
- Workflow automation phức tạp kiểu Zapier.
- Tích hợp sâu nhiều sàn TMĐT.
- Multi-branch enterprise management.
- AI tự ra quyết định tài chính/khuyến mãi mà không cần duyệt.
- Voice Agent outbound calling (chỉ xử lý transcript trong MVP).

---

## 5. Danh sách Agent & Bộ công cụ (Tools)

Mỗi Agent trong hệ thống được cấp quyền sử dụng một tập hợp các công cụ (Tools) cụ thể thông qua Harness.

### 5.1. Flae Agent (Tổng điều phối)
- **Nhiệm vụ:** Đầu mối giao tiếp chính giữa chủ doanh nghiệp và toàn bộ hệ thống. Nhận yêu cầu, trả lời câu hỏi kinh doanh, điều phối agents chuyên môn.
- **Công cụ được cấp:**
  - `query_business_data`: Đọc dữ liệu doanh thu, đơn hàng, tồn kho từ Haravan/KiotViet.
  - `query_knowledge_base`: Tra cứu chính sách, FAQ.
  - `dispatch_to_agent`: Điều phối yêu cầu tới Chat/Analyst/Voice Agent.
  - `create_quick_report`: Tạo báo cáo nhanh theo yêu cầu.
  - `create_approval_request`: Gửi yêu cầu duyệt cho hành động tác động ra ngoài.

### 5.2. Chat Agent
- **Nhiệm vụ:** Giao tiếp trực tiếp đa kênh với khách hàng, đề xuất trả lời hoặc tự động trả lời nếu an toàn.
- **Công cụ được cấp:**
  - `get_conversation_context`: Lấy lịch sử chat.
  - `query_knowledge_base`: Tra cứu chính sách, FAQ.
  - `get_customer_profile`: Lấy thông tin & trí nhớ khách hàng.
  - `draft_customer_reply`: Soạn nháp câu trả lời.
  - `send_customer_message`: Gửi tin nhắn trực tiếp (bị kiểm soát bởi Guardrails).
  - `create_approval_request`: Gửi yêu cầu duyệt cho chủ shop khi không chắc chắn.
  - `handoff_to_human`: Chuyển đoạn chat cho nhân viên.
  - `extract_and_save_memory`: Trích xuất thông tin, sở thích từ đoạn chat và cập nhật hồ sơ khách hàng (tính năng Memory tích hợp).

### 5.3. Analyst Agent
- **Nhiệm vụ:** Tổng hợp số liệu, báo cáo Morning Briefing, phát hiện bất thường và cơ hội chăm sóc lại.
- **Công cụ được cấp:**
  - `query_daily_metrics`: Lấy số liệu tin nhắn, đơn hàng, doanh thu.
  - `query_business_data`: Đọc dữ liệu từ Haravan/KiotViet.
  - `generate_morning_briefing`: Tạo bản tin tóm tắt đầu ngày.
  - `detect_follow_up_opportunity`: Tìm kiếm cơ hội chăm sóc khách (tính năng Follow-up tích hợp).
  - `create_follow_up_task`: Tạo task nhắc nhở trên hệ thống.
  - `generate_analyst_report`: Tạo báo cáo phân tích theo yêu cầu.

### 5.4. Voice Agent
- **Nhiệm vụ:** Xử lý transcript cuộc gọi, tóm tắt nội dung, trích xuất intent và follow-up task.
- **Công cụ được cấp:**
  - `process_transcript`: Xử lý và lưu transcript cuộc gọi.
  - `summarize_call`: Tóm tắt nội dung cuộc gọi.
  - `extract_call_intent`: Trích xuất intent, thông tin khách hàng.
  - `create_follow_up_task`: Tạo follow-up task từ cuộc gọi.
  - `flag_low_confidence`: Đánh dấu transcript không rõ cần kiểm tra.

---

## 6. Core Workflows (Luồng xử lý chính)

### 6.1. Xử lý tin nhắn khách hàng

1. **Tiếp nhận:** Webhook nhận tin nhắn từ Zalo/Facebook/Website → Lưu vào Inbox (Firestore).
2. **Kích hoạt:** Celery trigger tiến trình của Chat Agent.
3. **Suy luận & Truy xuất (LangGraph):** Chat Agent đọc tin nhắn, tự động gọi tools để lấy lịch sử chat (`get_conversation_context`) và thông tin khách hàng (`get_customer_profile`).
4. **Kiểm duyệt (Guardrails — Rule-based):** Chat Agent soạn câu trả lời. Harness kiểm tra:
   - Câu trả lời **có citation** từ KB? ✅
   - Nội dung **không chứa từ khóa nhạy cảm** (hoàn tiền, giảm giá, hủy đơn, khiếu nại, cam kết giá...)? ✅
   - Nếu cả 2 điều kiện đạt → **An toàn** (auto-reply).
   - Nếu bất kỳ điều kiện nào **không đạt** → **Nhạy cảm** (đưa vào Approval Queue).
5. **Thực thi (Action):**
   - *Nếu An toàn:* Auto-reply trực tiếp.
   - *Nếu Nhạy cảm/Tự tin thấp:* Chặn lại, đưa vào Approval Queue chờ con người duyệt.
6. **Hậu xử lý:** Sau khi chat xong, Chat Agent tự động trích xuất và cập nhật `customer_memories` (Memory tích hợp).

### 6.2. Hỏi đáp dữ liệu kinh doanh

1. Chủ doanh nghiệp hỏi Flae Agent về doanh thu, đơn hàng, tồn kho, sản phẩm hoặc khách hàng.
2. Flae Agent xác định intent và nguồn dữ liệu cần dùng.
3. Flae Agent gọi tool đọc dữ liệu từ Haravan/KiotViet hoặc dữ liệu đã đồng bộ.
4. Analyst Agent hỗ trợ phân tích nếu câu hỏi cần so sánh, tìm nguyên nhân hoặc tạo insight.
5. Flae Agent trả lời bằng ngôn ngữ tự nhiên, nêu rõ khoảng thời gian và nguồn dữ liệu.
6. Nếu có đề xuất hành động, hệ thống phân biệt rõ giữa **số liệu thực tế** và **gợi ý**.

### 6.3. Morning Briefing

1. Scheduled job (Celery Beat) tổng hợp dữ liệu đầu ngày.
2. Analyst Agent phân tích: doanh thu, khách mới, hội thoại chưa xử lý, cảnh báo bất thường.
3. Harness kiểm tra output schema.
4. Items được lưu vào `briefing_items` (Firestore).
5. Frontend hiển thị trong feed realtime.

### 6.4. Voice call summary

1. Transcript được import hoặc ghi nhận.
2. Voice Agent tóm tắt.
3. Trích xuất intent, thông tin khách hàng và việc cần làm.
4. Nếu transcript không rõ, đánh dấu cần kiểm tra.
5. Lưu summary vào customer profile/conversation.

---

## 7. Dữ liệu Trí nhớ & Graph Strategy

Dữ liệu là cốt lõi của tính năng "Memory-First". Chúng ta định hình dữ liệu theo hướng chuẩn bị sẵn cho Graph Database (Graphiti) bằng cách lưu dạng các "tập phim" (Episodes).

### 7.1. Customer Memory Model (Trí nhớ ngắn/dài hạn)
```json
{
  "id": "mem_123",
  "customer_id": "cus_123",
  "memory_type": "preference",
  "content": "Khách quan tâm sản phẩm dành cho da nhạy cảm.",
  "confidence": 0.87,
  "source_conversation_id": "conv_123",
  "status": "active"
}
```

### 7.2. Graph Episode Ledger (Nhật ký sự kiện)
Mọi tương tác đều được ghi lại thành Episode, sau này Agent sẽ dùng dữ liệu này để suy luận quan hệ phức tạp.
```json
{
  "id": "episode_123",
  "subject_id": "cus_123",
  "episode_type": "customer_preference_detected",
  "occurred_at": "2026-05-08T09:00:00Z",
  "episode_body": "Khách Ngọc Anh quan tâm kem chống nắng vật lý, hỏi về thời gian giao hàng.",
  "graphiti_status": "pending"
}
```

---

## 8. Business Data Integrations

### Nền tảng MVP

| Nền tảng | Ưu tiên | Dữ liệu cần lấy |
|---|:---:|---|
| Haravan | P0 | Doanh thu, đơn hàng, sản phẩm, tồn kho, khách hàng |
| KiotViet | P0 | Doanh thu, đơn hàng, sản phẩm, tồn kho, khách hàng |

### Quyền Agent trong MVP
- ✅ Đọc dữ liệu từ nền tảng tích hợp.
- ✅ Trả lời câu hỏi của chủ doanh nghiệp.
- ✅ Tạo báo cáo và cảnh báo.
- ✅ Đề xuất hành động tiếp theo.
- ❌ **Không** tự động ghi ngược dữ liệu quan trọng nếu chưa có approval rõ ràng.

### Acceptance criteria
- Người dùng có thể kết nối Haravan hoặc KiotViet trong workspace.
- Hệ thống hiển thị trạng thái kết nối: `active`, `needs_auth`, `error`, `paused`.
- Flae Agent có thể gọi tool đọc dữ liệu để trả lời câu hỏi kinh doanh.
- Analyst Agent có thể dùng dữ liệu tích hợp để tạo briefing và báo cáo.
- Mỗi lần agent truy xuất dữ liệu phải được ghi log để audit.

---

## 9. Security & Permissions

### Tenant Isolation
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

### AI Permissions
Agent không có toàn quyền như user. Mỗi agent bị giới hạn bởi Agent Contract:
- Chat Agent không được xóa khách hàng.
- Analyst Agent không được gửi tin nhắn cho khách.
- Voice Agent không được cam kết hoàn tiền.
- Flae Agent không được ghi ngược dữ liệu vào Haravan/KiotViet.

---

## 10. UI/UX MVP

### Nguyên tắc trải nghiệm
- Thân thiện, ít thuật ngữ kỹ thuật.
- Rõ ràng, có kiểm soát.
- Realtime.
- Tập trung vào hành động tiếp theo.

### Màn hình MVP
1. Login / Signup.
2. Workspace onboarding.
3. Morning Briefing feed.
4. Flae Agent Chat (giao tiếp chính với chủ DN).
5. My Agent Team (quản lý agents).
6. Knowledge Base.
7. Omnichannel Inbox.
8. Conversation detail.
9. Approval Queue.
10. Analyst Reports.
11. Voice Call Summaries.
12. Settings / Integrations (kết nối Haravan/KiotViet, kênh chat).

### Omnichannel Inbox — Chi tiết

**Kênh MVP (theo thứ tự triển khai):**

| Kênh | Ưu tiên | Thứ tự |
|---|:---:|:---:|
| Website Chat | P0 | 1st — Widget do FLAE kiểm soát, dễ nhất |
| Facebook Messenger | P0 | 2nd — API ổn định, phổ biến |
| Zalo OA | P0 | 3rd — API phức tạp hơn, cần approval từ Zalo |

**AI Response Mode:**

| Mode | Mô tả | Dùng khi |
|---|---|---|
| Draft only | AI chỉ soạn nháp | Giai đoạn đầu hoặc nội dung nhạy cảm |
| Auto-reply safe | AI tự trả lời khi có KB citation & không nhạy cảm | FAQ, chính sách rõ ràng |
| Human takeover | Người thật tiếp quản | Khiếu nại, hoàn tiền, giá đặc biệt, lỗi hệ thống |

---

## 11. Non-functional Requirements

### Performance
- Inbox realtime update dưới 1–2 giây sau khi Firestore có dữ liệu mới.
- Background jobs không block UI.
- AI draft reply xuất hiện đủ nhanh cho ngữ cảnh CSKH.

### Reliability
- Tool calls có side effect phải idempotent nếu có thể.
- Agent run lỗi phải có trạng thái `failed` và error reason.
- Không gửi tin nhắn nếu guardrail fail.

### Observability
- Log agent runs, tool calls, approval decisions, integration errors.
- Dashboard nội bộ cho failed jobs và failed agent runs.

### Scalability
- Firestore schema tối ưu theo tenant.
- Messages nằm trong subcollection.
- Background workers có thể scale ngang.
- Knowledge processing tách khỏi request lifecycle.

---

## 12. Đo lường thành công (Success Metrics)

### 12.1. Product Metrics (Giá trị doanh nghiệp)
- Số workspace tạo mới.
- Tỉ lệ hoàn tất onboarding.
- Số tài liệu KB được upload.
- Số hội thoại được xử lý.
- Tỉ lệ hội thoại được xử lý tự động (Auto-resolution rate).
- Thời gian phản hồi khách hàng trung bình (Response time).
- Tỉ lệ draft được approve vs edit vs reject.

### 12.2. Agent Quality Metrics (Độ an toàn của Harness)
- **Hallucination Rate:** Tần suất AI đưa ra thông tin sai lệch so với Knowledge Base.
- **Guardrail Failure Rate:** Số lần Agent vượt rào/thực hiện hành động trái phép (phải xấp xỉ 0).
- **Approval Rate / Edit Rate / Reject Rate:** Tỉ lệ con người đồng ý/sửa/từ chối các đề xuất của AI.
- **Escalation Precision:** Độ chính xác khi chuyển cho con người.
- **Tool guardrail failure rate.**

### 12.3. Business Outcome Metrics
- Thời gian phản hồi khách giảm.
- Tỉ lệ bỏ sót tin nhắn giảm.
- Chủ doanh nghiệp đọc báo cáo thường xuyên hơn.
- Số việc được xử lý từ Morning Briefing tăng.

---

## 13. Rủi ro chính

| Rủi ro | Mức độ | Giảm thiểu |
|---|:---:|---|
| Agent trả lời sai chính sách | Cao | KB citation, rule-based confidence, approval, evals |
| AI gửi tin nhắn không phù hợp | Cao | Draft-first, guardrails, human takeover |
| Tích hợp Zalo/Facebook phức tạp | Cao | Triển khai theo thứ tự Website Chat → Facebook → Zalo, có integration health |
| Tích hợp Haravan/KiotViet khác biệt dữ liệu | Cao | Chuẩn hóa data adapter, mapping schema nội bộ, log lỗi đồng bộ |
| Firestore schema khó scale | Trung bình | Query-first design, subcollection messages |
| Voice Agent vượt phạm vi MVP | Trung bình | Bắt đầu từ transcript summary, chưa làm outbound |
| Chi phí graph/vector tăng | Trung bình | Bắt đầu tối giản, theo dõi usage, tách storage theo giai đoạn |

---

## 14. Roadmap (6 Phases)

### Phase 0 — Foundation
- Frontend Angular + Tailwind CSS.
- Backend FastAPI + Firedantic.
- Firebase Auth + Firestore + Storage.
- Tenant model & Security Rules.
- Base design system.

### Phase 1 — Knowledge Base + Harness Core
- Upload tài liệu & processing pipeline.
- Agent Contract Registry.
- Agent run logs & tool call logs.
- Basic RAG retrieval tool.

### Phase 2 — Inbox + Chat Agent
- Inbox UI.
- Website Chat widget → Facebook Messenger → Zalo OA connectors.
- AI draft reply & auto-reply (rule-based confidence).
- Human takeover.
- Approval queue & send-message guardrails.
- Memory integration (extract & save customer memories).

### Phase 3 — Integrations + Flae Agent + Analyst Agent
- Haravan & KiotViet connectors (read-only).
- Flae Agent: hỏi đáp dữ liệu kinh doanh, điều phối agents.
- Daily briefing generator.
- Analyst reports & basic anomaly detection.
- Follow-up opportunity detection.
- Briefing feed realtime.

### Phase 4 — Voice Agent MVP
- Transcript ingestion.
- Call summary & intent extraction.
- Follow-up task creation.
- Confidence/escalation handling.

### Phase 5 — Evals & Production Hardening
- Eval cases cho Chat Agent, Analyst, Voice.
- Replay failed traces.
- Internal quality dashboard.
- Better observability.

### Phase 6 — Growth Hub (Post-MVP)
- Growth suggestions.
- Campaign drafts.
- Customer segment insights.
- Marketing approval workflow.

---

## 15. Quyết định hiện tại

| Chủ đề | Quyết định |
|---|---|
| Agent MVP | Flae Agent (tổng), Chat, Analyst, Voice |
| Memory | Tích hợp trong Chat Agent (không agent riêng) |
| Follow-up | Tích hợp trong Analyst Agent |
| Growth Hub | Post-MVP |
| Confidence Score | Rule-based: KB citation + sensitive keyword filter |
| Data read | Firestore Real-time First |
| Backend | FastAPI + Firebase Admin + Firedantic |
| Background jobs | Celery + Redis |
| Frontend | Angular 20+ + Signals + Tailwind CSS |
| Reliability | Agent Reliability Harness bắt buộc |
| Human control | Human takeover + approval queue |
| Kênh inbox MVP | Website Chat → Facebook Messenger → Zalo OA (theo thứ tự) |
| Tích hợp quản lý MVP | Haravan + KiotViet (read-only) |
| Quyền dữ liệu agent | Đọc dữ liệu, báo cáo/cảnh báo, đề xuất; ghi ngược cần approval |
