# FLAE Agent — Lean PRD MVP

**Phiên bản:** v0.4  
**Ngày cập nhật:** 2026-05-06  
**Trạng thái:** Draft tinh gọn  
**Phạm vi MVP:** Chat Agent, Analyst Agent, Customer Memory, Follow-up Suggestions, Omnichannel Inbox, Knowledge Base, Morning Briefing, Agent Reliability Harness  
**Tạm gác khỏi MVP:** Voice Agent, Growth Agent, Campaign Automation nâng cao

---

## 1. Tóm tắt sản phẩm

FLAE Agent là nền tảng AI dành cho SMB Việt Nam, giúp chủ shop/doanh nghiệp nhỏ quản lý khách hàng, tin nhắn, tri thức bán hàng và báo cáo vận hành thông qua một đội ngũ agent có kiểm soát.

Thay vì chỉ là chatbot trả lời FAQ, FLAE hướng tới vai trò:

> **Đội ngũ AI không quên khách hàng của bạn.**

FLAE giúp doanh nghiệp:

- gom tin nhắn từ nhiều kênh vào một inbox;
- gợi ý hoặc tự động trả lời khách trong tình huống an toàn;
- ghi nhớ lịch sử khách hàng, nhu cầu, vấn đề và hành vi mua hàng;
- nhắc follow-up khách có khả năng mua hoặc cần chăm sóc;
- tạo briefing hằng ngày về việc cần xử lý;
- đảm bảo AI không vượt quyền nhờ approval, guardrails và audit log.

---

## 2. Vấn đề cần giải quyết

SMB Việt Nam thường gặp các vấn đề:

1. Tin nhắn khách hàng rải rác ở Facebook, Zalo, website.
2. Chủ shop và nhân viên dễ sót khách, trả lời chậm hoặc thiếu nhất quán.
3. Nhân viên không nhớ lịch sử mua hàng, khiếu nại, sở thích của từng khách.
4. Dữ liệu đơn hàng, hội thoại và khách hàng không được kết nối thành insight dễ hành động.
5. AI chatbot thông thường dễ trả lời sai, bịa thông tin hoặc tự ý làm việc nhạy cảm.

---

## 3. Định vị sản phẩm

FLAE không định vị là chatbot đơn lẻ, mà là **AI Workforce Platform cho SMB**.

Điểm khác biệt chính:

- **Memory-first:** AI nhớ khách hàng, sản phẩm, chính sách và lịch sử tương tác.
- **Agent-first:** Người dùng giao việc cho các agent thay vì cấu hình phần mềm phức tạp.
- **Human-in-control:** Hành động nhạy cảm cần người duyệt.
- **Realtime-first:** Inbox, briefing, approval và agent status cập nhật realtime.
- **Reliability-first:** Mọi agent run, tool call và quyết định quan trọng có log, guardrail và feedback loop.

---

## 4. Đối tượng người dùng

### Primary users

- Chủ shop online.
- Chủ doanh nghiệp nhỏ.
- Quản lý bán hàng.
- Đội chăm sóc khách hàng 1–10 người.

### Ngách ưu tiên ban đầu

- Shop bán hàng qua Facebook/Zalo/website.
- Mỹ phẩm, thời trang, local brand.
- Spa, clinic nhỏ, trung tâm đào tạo nhỏ.
- F&B hoặc dịch vụ có khách quay lại nhiều lần.

---

## 5. Phạm vi MVP

### In scope

| Module | Mục tiêu |
|---|---|
| Authentication & Workspace | Đăng nhập, tạo workspace, phân tách tenant |
| Workspace Setup | Nhập thông tin doanh nghiệp hoặc kết nối Haravan/KiotViet nếu có |
| Knowledge Base | Upload tài liệu, FAQ, chính sách, sản phẩm |
| Omnichannel Inbox | Website Chat, Facebook Messenger, Zalo OA |
| Chat Agent | Gợi ý trả lời, auto-reply an toàn, human takeover |
| Customer Memory | Hồ sơ AI cho từng khách hàng |
| Follow-up Suggestions | Phát hiện khách cần chăm sóc lại |
| Analyst Agent | Báo cáo đơn giản, insight, cảnh báo bất thường |
| Morning Briefing | Feed hằng ngày về việc quan trọng cần xử lý |
| Agent Reliability Harness | Agent contract, guardrails, approval, audit log |
| Integration Health | Theo dõi trạng thái kết nối kênh và nền tảng bán hàng |

### Out of scope MVP

- Voice Agent.
- Growth Agent đầy đủ.
- Tự động chạy ads.
- Broadcast/campaign automation nâng cao.
- Workflow automation dạng Zapier.
- Multi-branch enterprise management.
- AI tự động hoàn tiền, giảm giá, hủy đơn không cần duyệt.

---

## 6. Agent trong MVP

| Agent | Vai trò | MVP |
|---|---|---|
| Chat Agent | Hỗ trợ trả lời khách đa kênh | P0 |
| Analyst Agent | Tóm tắt số liệu, phát hiện insight/cảnh báo | P0 |
| Memory Agent | Trích xuất và cập nhật trí nhớ khách hàng | P0 |
| Follow-up Agent | Phát hiện cơ hội chăm sóc lại khách | P0 |
| Voice Agent | Xử lý cuộc gọi/giọng nói | Post-MVP |
| Growth Agent | Tạo chiến dịch tăng trưởng | Post-MVP |

---

## 7. Tính năng chính

## 7.1 Workspace Setup

Sau đăng nhập, người dùng tạo workspace theo 2 trường hợp:

### Trường hợp 1: Đã có cửa hàng trên Haravan/KiotViet

- Người dùng chọn nền tảng đang dùng.
- Hệ thống OAuth/kết nối API.
- FLAE tự lấy thông tin cửa hàng, sản phẩm, khách hàng, đơn hàng cơ bản.
- Hệ thống tạo workspace và dữ liệu khởi tạo tự động.

### Trường hợp 2: Chưa có nền tảng quản lý

- Người dùng nhập form thủ công:
  - tên doanh nghiệp;
  - ngành hàng;
  - mô tả sản phẩm/dịch vụ;
  - chính sách bán hàng;
  - kênh bán chính.

### Acceptance criteria

- Người dùng tạo được workspace.
- Workspace có `tenant_id` riêng.
- Có thể chọn kết nối Haravan/KiotViet hoặc nhập thủ công.
- Dữ liệu tenant được phân tách rõ.

---

## 7.2 Omnichannel Inbox

Inbox gom hội thoại từ:

- Website Chat;
- Facebook Messenger;
- Zalo OA.

### Chức năng MVP

- Xem danh sách hội thoại realtime.
- Xem/gửi tin nhắn.
- Gắn trạng thái: `new`, `open`, `waiting`, `resolved`.
- Gắn intent: hỏi giá, tư vấn sản phẩm, đổi trả, khiếu nại, đặt lịch, khác.
- AI draft reply.
- Auto-reply với FAQ/chính sách an toàn.
- Human takeover.
- Audit log cho mọi tin nhắn do AI đề xuất/gửi.

---

## 7.3 Chat Agent

Chat Agent hỗ trợ CSKH đa kênh.

### Nhiệm vụ

- Phân loại intent hội thoại.
- Truy xuất Knowledge Base.
- Truy xuất Customer Memory.
- Soạn nháp trả lời.
- Tự động trả lời khi đủ an toàn.
- Chuyển người khi confidence thấp hoặc tình huống nhạy cảm.

### Các mode

| Mode | Mô tả |
|---|---|
| Draft only | AI chỉ soạn nháp, người dùng duyệt/gửi |
| Auto-reply safe | AI tự trả lời câu hỏi an toàn, confidence cao |
| Human takeover | Người thật tiếp quản hội thoại |

### Tình huống phải escalation

- Khiếu nại nghiêm trọng.
- Hoàn tiền/hủy đơn/giảm giá riêng.
- Chính sách không rõ.
- Confidence thấp.
- Khách tức giận.
- Vấn đề pháp lý, y tế, tài chính hoặc cam kết nhạy cảm.

---

## 7.4 Customer Memory

Customer Memory là tính năng thay thế Voice Agent trong MVP.

Mỗi khách hàng có một hồ sơ AI gồm:

- tóm tắt lịch sử tương tác;
- sản phẩm từng hỏi/mua;
- sở thích;
- vấn đề từng gặp;
- mức độ nhạy cảm về giá/ship;
- sentiment gần nhất;
- lifecycle stage;
- việc cần follow-up.

### Ví dụ AI Summary Card

```text
Ngọc Anh
- Đã mua Retinol Serum 0.5% một lần.
- Quan tâm sản phẩm cho da nhạy cảm.
- Từng phản hồi giao hàng chậm.
- Có khả năng mua lại nếu được tư vấn giao nhanh.
```

### Mục tiêu

Giúp nhân viên hoặc AI trả lời khách với đầy đủ ngữ cảnh, không phải đọc lại toàn bộ lịch sử chat.

---

## 7.5 Follow-up Suggestions

Follow-up Agent phát hiện các cơ hội chăm sóc lại khách.

### Trigger MVP

- Khách hỏi giá nhưng chưa mua sau 24–48h.
- Khách hỏi sản phẩm nhưng chưa được phản hồi.
- Khách cũ lâu chưa quay lại.
- Khách từng khiếu nại cần chăm sóc lại.
- Khách có đơn hàng gần đến chu kỳ mua lại.

### Output

- Tạo follow-up task.
- Gợi ý nội dung nhắn lại.
- Cho phép approve/edit/send.

---

## 7.6 Knowledge Base

Knowledge Base lưu tri thức doanh nghiệp cho agent.

### Input MVP

- PDF, DOCX, TXT, CSV.
- FAQ thủ công.
- Link sản phẩm/chính sách.
- Dữ liệu sản phẩm/đơn hàng từ Haravan/KiotViet nếu có.

### Yêu cầu

- Có trạng thái xử lý: `pending`, `processing`, `ready`, `failed`.
- Agent ưu tiên trả lời dựa trên KB.
- Nếu không có nguồn chắc chắn, AI không được bịa.
- Câu trả lời nhạy cảm nên có nguồn nội bộ.

---

## 7.7 Analyst Agent & Morning Briefing

Analyst Agent tạo insight đơn giản, dễ hành động.

### Morning Briefing gồm

- Doanh thu hôm qua/hôm nay nếu có dữ liệu.
- Số hội thoại mới/chưa xử lý.
- Khách cần follow-up.
- Sản phẩm được hỏi nhiều.
- Cảnh báo bất thường.
- CTA để xử lý ngay.

### Ví dụ briefing item

```text
12 khách đã hỏi giá nhưng chưa được follow-up trong 48h.
CTA: Tạo tin nhắn chăm sóc lại
```

---

## 7.8 Agent Reliability Harness

Harness là lớp kiểm soát độ tin cậy cho agent.

### Thành phần MVP

- Agent Contract.
- Tool Guardrails.
- Approval Queue.
- Audit Log.
- Feedback Loop.
- Eval cases cơ bản.

### Agent Contract cần định nghĩa

- Agent được phép làm gì.
- Tool nào được gọi.
- Hành động nào cần duyệt.
- Khi nào phải chuyển người.
- Output schema bắt buộc.

### Approval Queue

Dùng cho:

- gửi tin nhắn nhạy cảm;
- hoàn tiền/hủy đơn/giảm giá;
- trả lời khiếu nại;
- gửi follow-up quan trọng;
- hành động confidence thấp.

---

## 8. Memory & Graph Strategy

FLAE dùng memory theo 3 lớp:

```text
Firestore/Postgres = source of truth & realtime app state
Graphiti/Graph DB = temporal relationship memory
Vector Search = semantic retrieval cho tài liệu/chính sách
```

### Nguyên tắc

- Không dùng graph làm database chính.
- Operational data vẫn nằm ở Firestore/Postgres.
- Graphiti nhận dữ liệu qua episode ledger.
- Graph là derived intelligence layer cho agent reasoning.

---

## 9. Graphiti-ready Data Model

Để tích hợp tốt với Graphiti, hệ thống cần `graph_episodes` làm event/episode ledger.

### `graph_episodes`

```json
{
  "id": "episode_123",
  "tenant_id": "tenant_abc",
  "group_id": "tenant_abc",
  "subject_type": "customer",
  "subject_id": "cus_123",
  "episode_type": "conversation_summary",
  "source_type": "conversation",
  "source_id": "conv_123",
  "occurred_at": "2026-05-06T09:00:00+07:00",
  "episode_body": "Khách Ngọc Anh hỏi lại sản phẩm Retinol Serum 0.5%, quan tâm giao nhanh.",
  "structured_payload": {
    "customer_id": "cus_123",
    "products_mentioned": ["prod_retinol_05"],
    "issues_mentioned": ["shipping_speed"]
  },
  "graphiti_status": "pending",
  "retry_count": 0,
  "last_error": null
}
```

### Episode types MVP

- `customer_message`
- `agent_reply`
- `conversation_summary`
- `order_created`
- `order_completed`
- `customer_preference_detected`
- `customer_complaint`
- `follow_up_created`
- `memory_corrected`

### Graph entity types MVP

- Customer
- Product
- ProductCategory
- Order
- Conversation
- Issue
- Preference
- Policy
- Channel

### Graph edge types MVP

- `ASKED_ABOUT`
- `PURCHASED`
- `PLACED_ORDER`
- `COMPLAINED_ABOUT`
- `PREFERS`
- `SENSITIVE_TO`
- `MENTIONED`
- `HAS_POLICY`
- `INTERACTED_ON`

---

## 10. Firestore Collection Model MVP

```text
tenants/{tenantId}
  users/{userId}
  agents/{agentId}
  agent_contracts/{contractId}
  agent_runs/{runId}
  tool_calls/{toolCallId}
  approvals/{approvalId}
  audit_logs/{logId}

  integrations/{integrationId}
  customers/{customerId}
  customer_identities/{identityId}
  customer_memories/{memoryId}
  follow_up_tasks/{taskId}

  conversations/{conversationId}
    messages/{messageId}

  conversation_summaries/{summaryId}
  knowledge_sources/{sourceId}
  knowledge_jobs/{jobId}
  briefing_items/{itemId}
  reports/{reportId}
  graph_episodes/{episodeId}
  graph_sync_jobs/{jobId}
  eval_cases/{evalCaseId}
  eval_runs/{evalRunId}
```

---

## 11. Key Data Models

### `customer_memories`

```json
{
  "id": "mem_123",
  "tenant_id": "tenant_abc",
  "customer_id": "cus_123",
  "memory_type": "preference",
  "content": "Khách quan tâm sản phẩm dành cho da nhạy cảm.",
  "confidence": 0.87,
  "source_conversation_id": "conv_123",
  "source_message_ids": ["msg_123"],
  "status": "active",
  "valid_from": "timestamp",
  "valid_until": null,
  "graph_sync_status": "synced"
}
```

### `follow_up_tasks`

```json
{
  "id": "task_123",
  "tenant_id": "tenant_abc",
  "customer_id": "cus_123",
  "reason": "Khách hỏi giá nhưng chưa mua sau 48h.",
  "suggested_message": "Dạ chị còn quan tâm sản phẩm này không ạ...",
  "priority": "high",
  "status": "pending",
  "due_at": "timestamp",
  "created_by": "follow_up_agent"
}
```

### `agent_runs`

```json
{
  "id": "run_123",
  "tenant_id": "tenant_abc",
  "agent_id": "chat_agent",
  "orchestrator": "langgraph_celery",
  "status": "waiting_approval",
  "current_node": "approval_gate",
  "input_ref": "conversations/conv_123/messages/msg_123",
  "output_ref": "conversations/conv_123/messages/draft_123",
  "confidence": 0.72,
  "requires_approval": true,
  "langgraph": {
    "thread_id": "run_123",
    "checkpoint_namespace": "chat_agent",
    "checkpoint_id": "ckpt_456"
  },
  "celery": {
    "task_id": "celery_abc"
  }
}
```

---

## 12. Technical Architecture

### Frontend

- Angular 19+.
- Standalone components.
- TailwindCSS.
- Angular Signals + NgRx SignalStore.
- Firebase Auth.
- Firestore realtime listeners.

### Backend

- FastAPI.
- Firebase Admin.
- Firestore / Cloud Storage.
- Celery + Redis.
- LangGraph for agent orchestration.
- LangGraph checkpointer for agent state/resume.
- Graphiti/FalkorDB or compatible graph backend for long-term memory.
- Vector search for KB retrieval.

### Workflow approach

MVP dùng:

```text
Celery = background task execution
LangGraph = agent orchestration
LangGraph checkpoint = resume/interruption/human-in-loop
Firestore = operational state, approval, audit, realtime UI
```

Temporal chưa cần trong MVP. Có thể cân nhắc post-MVP cho workflow dài, nhiều ngày, nhiều side-effect hoặc campaign/broadcast lớn.

---

## 13. Core Agent Flow

### New customer message

```text
1. Webhook nhận tin nhắn.
2. Lưu message vào Firestore.
3. Celery trigger Chat Agent run.
4. LangGraph chạy:
   - resolve customer identity
   - load conversation context
   - load customer memory
   - query Graphiti nếu có
   - retrieve Knowledge Base
   - draft reply
   - guardrail check
5. Nếu safe: gửi hoặc tạo draft theo setting.
6. Nếu risky: tạo approval request.
7. Sau hội thoại: Memory Agent tạo summary, memory và graph episode.
8. Graph sync worker sync episode sang Graphiti.
```

---

## 14. Tools cần có

### Chat tools

- `get_conversation_context`
- `draft_customer_reply`
- `send_customer_message`
- `classify_conversation_intent`
- `handoff_to_human`

### Memory tools

- `resolve_customer_identity`
- `get_customer_profile`
- `get_customer_memory`
- `extract_conversation_memory`
- `write_customer_memory`
- `update_customer_summary`
- `create_graph_episode`
- `query_customer_graph`

### Business integration tools

- `search_products`
- `get_product_detail`
- `check_inventory`
- `get_customer_orders`
- `get_order_detail`

### Follow-up tools

- `detect_follow_up_opportunity`
- `create_follow_up_task`
- `generate_follow_up_message`
- `dismiss_follow_up_task`

### Harness tools

- `validate_agent_contract`
- `validate_tool_input`
- `check_sensitive_action`
- `create_approval_request`
- `write_audit_log`
- `record_feedback`

---

## 15. Security & Reliability

### Tenant isolation

- Mọi document có `tenant_id` hoặc nằm trong namespace tenant.
- Firestore Rules giới hạn user theo workspace.
- Backend verify Firebase JWT và role trước khi mutation.

### AI permissions

- Agent không có quyền như user.
- Mỗi agent bị giới hạn bởi Agent Contract.
- Tool có side effect cần idempotency key, audit log và guardrail.

### Data privacy

- Không lưu token/secrets trong logs.
- Hạn chế đưa PII vào graph nếu không cần.
- Memory nhạy cảm cần confidence và nguồn rõ ràng.
- User có thể sửa/xóa memory sai.

---

## 16. Success Metrics

### Product metrics

- Tỉ lệ hoàn tất onboarding.
- Số workspace active.
- Số kênh inbox được kết nối.
- Số hội thoại xử lý qua FLAE.
- Số AI draft được tạo.
- Tỉ lệ draft được approve/edit/reject.
- Số follow-up task được tạo và xử lý.
- Tỉ lệ briefing item được click.

### Agent quality metrics

- Answer accuracy.
- Hallucination rate.
- Escalation precision.
- Guardrail failure rate.
- Approval rate.
- Edit rate.
- Reject rate.
- Average confidence.

### Business outcome metrics

- Thời gian phản hồi khách giảm.
- Tỉ lệ bỏ sót khách giảm.
- Số khách được follow-up tăng.
- Tỉ lệ chuyển đổi từ follow-up.
- Tần suất chủ shop đọc briefing.

---

## 17. Roadmap đề xuất

### Phase 0 — Foundation

- Angular/FastAPI/Firebase boilerplate.
- Auth + tenant model.
- Firestore rules.
- Base UI design system.

### Phase 1 — Workspace + Knowledge Base

- Workspace setup manual.
- Haravan/KiotViet connection skeleton.
- Upload KB.
- Processing status.
- Basic retrieval.

### Phase 2 — Inbox + Chat Agent

- Website Chat widget.
- Inbox UI.
- Facebook Messenger connector.
- Zalo OA connector.
- AI draft reply.
- Human takeover.

### Phase 3 — Customer Memory + Follow-up

- Customer AI Summary Card.
- Conversation summary.
- Customer memories.
- Follow-up task generation.
- Memory correction.

### Phase 4 — Harness & Approval

- Agent Contract Registry.
- Tool guardrails.
- Approval queue.
- Audit logs.
- Feedback loop.

### Phase 5 — Analyst + Morning Briefing

- Daily briefing.
- Basic insight cards.
- Conversation/order anomaly detection.
- Follow-up and inbox alerts.

### Phase 6 — Graphiti integration

- `graph_episodes` ledger.
- Graph sync worker.
- Customer/product/order relationship graph.
- Graph retrieval for Chat/Analyst Agent.

### Post-MVP

- Voice Agent.
- Growth Agent.
- Campaign automation.
- Temporal for durable business workflows if needed.

---

## 18. Rủi ro và hướng giảm thiểu

| Rủi ro | Hướng giảm thiểu |
|---|---|
| AI trả lời sai chính sách | KB retrieval, citation, confidence threshold, approval |
| Graph memory bị bẩn | Episode filtering, confidence threshold, human correction |
| Identity resolution sai | `customer_identities`, verified mapping, merge review |
| Tích hợp Facebook/Zalo phức tạp | Làm Website Chat trước, adapter pattern, integration health |
| Overengineering graph quá sớm | Firestore structured memory trước, Graphiti sau |
| Tool side effect bị chạy lặp | Idempotency key, audit log, tool_call_id |
| Chi phí LLM tăng | Conversation summary thay vì sync từng message, batch jobs |

---

## 19. Quyết định hiện tại

| Chủ đề | Quyết định |
|---|---|
| Voice Agent | Tạm gác khỏi MVP |
| Feature thay thế | Customer Memory + Follow-up Suggestions |
| Orchestration MVP | Celery + LangGraph + Checkpointer |
| Temporal | Post-MVP nếu workflow dài/phức tạp |
| Graph strategy | Graphiti-ready qua `graph_episodes` ledger |
| Source of truth | Firestore/Postgres |
| Graph role | Temporal relationship memory cho agent reasoning |
| Inbox channels | Website Chat, Facebook Messenger, Zalo OA |
| Commerce integrations | Haravan + KiotViet trước |
| Reliability | Agent Harness là bắt buộc |

---

## 20. Next Steps

1. Thiết kế chi tiết onboarding workspace: Haravan/KiotViet OAuth hoặc manual form.
2. Viết Firestore model cho customer, conversation, memory, follow-up, graph episode.
3. Tạo Agent Contract v1 cho Chat Agent, Memory Agent, Follow-up Agent, Analyst Agent.
4. Build Website Chat + Inbox trước.
5. Build AI draft reply với draft-only mode.
6. Build Customer AI Summary Card.
7. Build `graph_episodes` ledger nhưng chưa cần bật Graphiti ngay.
8. Sau khi có dữ liệu thật, tích hợp Graphiti cho relationship retrieval.
