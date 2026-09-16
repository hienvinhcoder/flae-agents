# Product Requirements Document (PRD) — FLAE

- **Trạng thái:** Draft — Open Questions đã chốt theo đề xuất MVP (2026-09-09)
- **Phạm vi tài liệu:** MVP
- **Danh mục sản phẩm:** Tầng ngữ cảnh / Company Memory cho AI của doanh nghiệp. FLAE không thay thế Claude, Cursor, ChatGPT, Codex hay các hệ thống nguồn; FLAE đứng giữa chúng và cung cấp một bức tranh hiểu biết dùng chung, có nguồn, luôn được làm mới.
- **Nguyên tắc traceability:** Mã `FR-xx`, `NFR-xx`, `SM-xx`, `OQ-xx` là định danh ổn định. Không tái sử dụng mã đã bỏ. `OQ-xx` bên dưới là quyết định đã chốt, không còn là câu hỏi mở.
- **Tài liệu kỹ thuật tham chiếu:** [TGS-RAG](https://arxiv.org/html/2605.05643v1); [Company Memory contract](specs/agent_memory_contract.md)
- **Đối chiếu định vị:** Cùng loại “context layer / company brain” (ví dụ [Pensieve](https://pensieve.uk/)): kết nối nguồn nghiệp vụ → bản đồ đã chắt lọc → giữ hiện tại → MCP. FLAE dùng **TGS-RAG** và nêu **mâu thuẫn theo thời gian**. MVP **không ingest GitHub/source code**: mã nguồn đã là graph memory của coding agent.

## Quyết định nền

1. Một workspace / Company Memory mỗi tenant; một owner. Invite thành viên và nhiều không gian: hậu MVP (`OQ-01`).
2. MCP là điều kiện hoàn thành MVP (`OQ-08`).
3. Connector MVP: Google Drive, Notion, Slack. GitHub (`FR-18`) và HubSpot: ngoài MVP (`OQ-04`).
4. Connector chỉ đọc. Upload file thủ công là nguồn bổ sung.
5. Sản phẩm người dùng thấy là bản đồ ngữ cảnh (context/topic pages). `KB=(C,G,M)` là lớp kỹ thuật.
6. Graph FLAE là đồ thị nghiệp vụ, không thay AST/call graph của coding agent.

## 1. Context & Problem Statement

Các AI agent như Claude, Cursor, Codex hay ChatGPT có thể đọc công cụ và thực hiện tác vụ, nhưng mỗi phiên chúng phải **học lại công ty từ đầu**. Agent tìm Notion, Slack, Drive để tự ghép bức tranh: người dùng chờ, trả token cho từng tài liệu, và nếu đọc nhầm nguồn thì mọi bước sau dựng trên điều không đúng. Điều vừa suy ra **không được giữ lại**.

Kết nối agent thẳng vào công cụ chỉ cho **quyền truy cập**, không cho **hiểu biết**. Ngữ cảnh nghiệp vụ nằm rải rác giữa tài liệu, thảo luận, CRM và quyết định — không nằm trong source code. Coding agent đã đọc graph của codebase; FLAE lấp **hiểu biết công ty bên ngoài code**.

FLAE là **tầng ngữ cảnh sống**. Người dùng kết nối nguồn một lần. FLAE chắt lọc thành bản đồ từ tổng quan công ty xuống khách hàng, sản phẩm, dự án, quyết định — mỗi khẳng định có citation. Khi Slack hoặc spec đổi, trang bị ảnh hưởng được viết lại. Agent cắm qua **MCP**, đọc bản đồ rồi mới truy xuất đúng chỗ.

Lớp kỹ thuật: TGS-RAG (chunk ↔ graph hai chiều). Topic/context là lớp điều hướng; citation luôn trỏ revision nguồn, không trỏ bản tóm tắt.

MVP: xác thực → kết nối nguồn / upload → xây và làm mới Company Memory → duyệt bản đồ trên web → agent đọc qua MCP. Chat in-app không phải tiêu chí hoàn thành MVP (`OQ-19`).

## 2. FLAE đứng ở đâu trong stack

```
AI đang dùng (Claude, Cursor, ChatGPT, Codex)
        │  đọc để định hướng  (MCP, Streamable HTTP)
        ▼
FLAE — Company Memory (bản đồ Product / Customers / Engineering / GTM / …)
        │  xây từ, chỉ đọc
        ▼
Nguồn MVP: Notion, Slack, Google Drive  (+ upload file)
```

## 3. Đối tượng người dùng

### Persona A — Founder hoặc nhóm startup 1–2 người

- Dữ liệu nghiệp vụ trong Drive, Notion, Slack. Codebase do coding agent đọc riêng.
- Onboarding: đăng nhập → kết nối nguồn hoặc upload → thấy bản đồ có citation → copy MCP → một truy vấn thử.

### Persona B — Chủ doanh nghiệp / vận hành / sản phẩm tại SME

- Cấp quyền connector, xem cây trang/chủ đề, kiểm tra nguồn và độ tươi. Không phải hiểu embeddings hay Temporal.

### Persona C — Kỹ sư cấu hình agent

- Gắn Claude, Cursor, ChatGPT, Codex vào Company Memory. Cần tool định hướng và tool truy xuất sâu, lỗi chẩn đoán được.

MVP: một owner trên một workspace; chưa có mời thành viên.

## 4. Phạm vi (Scope)

| Trong phạm vi MVP | Ngoài phạm vi MVP |
|---|---|
| Firebase Auth: email/password và Google Sign-In. | Magic link. Invite thành viên, org RBAC. |
| Một workspace / tenant, một owner. | Nhiều Company Memory trên một tài khoản. |
| Upload PDF, Markdown, TXT; tối đa 50 MB/file; Firebase Storage. | DOCX, CSV; ingest GitHub/source code (`FR-18`). |
| Đồng bộ Drive, Notion, Slack theo phạm vi người dùng **chọn**. Slack: channel công khai đã chọn, kèm thread và file trong channel đó. | HubSpot, Jira, Linear, DM/private Slack, ghi ngược lên nguồn. |
| Chunk + graph TGS-RAG + trang ngữ cảnh dẫn xuất có citation. Sync thủ công + lịch 15 phút. | Tagging thủ công bắt buộc; webhook sync (hậu MVP). |
| Web: connector, bản đồ ngữ cảnh, citation, cấu hình MCP, chỉ số distillation/độ tươi/MCP. | Chat in-app là tiêu chí hoàn thành MVP. Dashboard BI. Mobile native. |
| MCP Streamable HTTP, credential theo workspace, mint/revoke bởi owner. | Fine-tune / train trên dữ liệu khách. Billing, marketplace connector. |
| Frontend React + Tailwind, `#F97316`, Glassmorphism; **Firebase Hosting**. Backend FastAPI + `uv`, Temporal, PostgreSQL, Docker, LangChain, LangGraph, LangSmith, Terraform, GitHub Actions, Cloud Run. | CMEK. Hosting frontend trên Cloud Run. |

## 5. Functional Requirements (FR)

| Mã | Yêu cầu chức năng có thể quan sát |
|---|---|
| **FR-01** | Đăng nhập email/password hoặc Google Sign-In qua Firebase Authentication; phiên hợp lệ; chỉ truy cập dữ liệu đúng workspace. |
| **FR-02** | Đăng xuất hoặc token hết hạn thì cắt quyền và từ chối request cần xác thực. |
| **FR-03** | Xác thực lần đầu: tạo hoặc liên kết đúng **một** workspace; owner thấy bản đồ ngữ cảnh của workspace đó. |
| **FR-04** | Upload file PDF, Markdown hoặc TXT ≤ 50 MB: lưu Firebase Storage, tạo bản ghi tài liệu, trả đã tiếp nhận hoặc lỗi có lý do. |
| **FR-05** | Tài liệu đã tiếp nhận → workflow Temporal; trạng thái tối thiểu: chờ, đang xử lý, hoàn tất, thất bại. |
| **FR-06** | Workflow hoàn tất phải có (1) chunk có provenance, (2) entity/relation/graph và liên kết hai chiều TGS-RAG, (3) trang ngữ cảnh dẫn xuất duyệt được từ tổng quan xuống chủ đề. |
| **FR-07** | Workflow thất bại giữ trạng thái thất bại và lỗi đủ để biết tài liệu nào chưa vào memory; retry theo `NFR-07`. |
| **FR-08** | Danh sách nguồn/tài liệu: tên, loại, trạng thái, cập nhật gần nhất, lỗi gần nhất nếu có. |
| **FR-09** | Kết nối Google Drive: lưu đúng tenant; người dùng **chọn folder/file** rồi mới nhập. Không đồng bộ cả Drive nếu chưa chọn. |
| **FR-10** | Kết nối Notion: lưu đúng tenant; người dùng **chọn page/database** rồi mới nhập. |
| **FR-11** | Kết nối Slack: lưu đúng tenant; người dùng **chọn channel công khai**; nhập message, thread và file trong các channel đó. Không ingest DM hay private channel ở MVP. |
| **FR-12** | Sync lấy dữ liệu mới/đã đổi trong phạm vi đã chọn, cập nhật bản ghi, đưa vào workflow. Kích hoạt: nút thủ công bất kỳ lúc nào **và** lịch mỗi 15 phút khi connector còn hiệu lực. |
| **FR-13** | Đồng bộ lại nhận diện theo ID nguồn: revision mới thay thế view hiện hành, không nhân bản. Xóa ở nguồn → tombstone, loại khỏi retrieval hiện hành; revision cũ giữ theo `OQ-07`. |
| **FR-14** | MCP: tool định hướng (đọc bản đồ/context/topic) rồi tool truy xuất TGS (văn bản + graph). Không bắt agent dump toàn bộ nguồn thô. |
| **FR-15** | Provenance bắt buộc: `source_type`, tên tài liệu, URL nếu có, `document_id`, `revision_id`, `chunk_id`, `context_id`/`topic_id`; tùy chọn: graph path, độ tin cậy. Không citation vào bản tóm tắt. |
| **FR-16** | MCP Streamable HTTP. Owner mint/revoke **Bearer token theo workspace**. Token không hợp lệ hoặc khác tenant bị từ chối. |
| **FR-17** | LangChain/LangGraph; LLM `gemini-2.5-flash`; embedding `gemini-embedding-001` (1024 chiều). Đổi model qua cấu hình môi trường, không qua UI MVP. Trace LangSmith theo `NFR-13`. |
| **FR-18** | **Hoãn — ngoài MVP.** Connector GitHub. Không tái sử dụng mã này. |
| **FR-19** | Web: duyệt cây trang/chủ đề, số trang, thời điểm cập nhật, nguồn đóng góp, nội dung kèm citation. Hệ thống tự đề xuất cấu trúc; không bắt tạo taxonomy trước ingest. |
| **FR-20** | Evidence mới gắn vào trang phù hợp hoặc tạo trang mới. Không bắt người dùng tag từng tài liệu. |
| **FR-21** | Quyết định/spec/tài liệu nguồn đổi → viết lại trang bị ảnh hưởng kèm citation mới trong `NFR-18`. |
| **FR-22** | Ngắt nguồn hoặc xóa Company Memory: dữ liệu đó ngừng retrieval ngay; xóa cứng trong 30 ngày (`OQ-07`). |
| **FR-23** | Connector chỉ đọc. Không tạo/sửa/xóa file, page hay message trên nguồn. |
| **FR-24** | UI tối thiểu: trạng thái connector, tỷ lệ distillation (trang / tài liệu nguồn), lần cập nhật bản đồ, số lần đọc MCP nếu có. |

## 6. Non-Functional Requirements (NFR)

| Mã | Yêu cầu phi chức năng và tiêu chí nghiệm thu |
|---|---|
| **NFR-01** | API tương tác (không ingestion/LLM dài): p95 ≤ **1 giây** ở **20** request đồng thời. |
| **NFR-02** | Upload ≤ 50 MB: p95 xác nhận đã tiếp nhận ≤ **5 giây** (không tính truyền phía client). |
| **NFR-03** | Ingestion tài liệu chuẩn (≤ 20 trang / ~8k token): p95 đến hoàn tất (chunk + graph + trang duyệt được) ≤ **10 phút**. |
| **NFR-04** | MCP retrieval ở workspace chuẩn (≤ 500 tài liệu, ≤ 20k chunk, ≤ 5k entity, ≤ 200 trang): p95 ≤ **5 giây**, không gồm thời gian model phía agent. |
| **NFR-05** | Scale ngang Cloud Run/worker cho **50 tenant**, **20** workflow đồng thời, **10** MCP đồng thời khi vẫn đạt `NFR-01`–`NFR-04`. Không state chỉ trong một container. |
| **NFR-06** | Uptime tháng API+MCP ≥ **99.5%**, không tính bảo trì đã thông báo; đo health check bên ngoài. |
| **NFR-07** | Idempotency key cho mọi ingestion/sync. Retry lỗi tạm thời **3 lần**, backoff mũ (≈ 1s / 4s / 16s). Hết retry → thất bại theo `FR-07`. |
| **NFR-08** | RPO ≤ **24 giờ**, RTO ≤ **8 giờ**. Test restore **mỗi tháng**. |
| **NFR-09** | Mọi API/MCP được bảo vệ verify Firebase ID token (API) hoặc Bearer workspace (MCP) phía server. Không tin user/tenant ID do client tự khai. |
| **NFR-10** | Mọi dữ liệu scope theo workspace. Không đọc/sửa/sync/truy vấn tenant khác. Không gộp dữ liệu tenant để phục vụ tenant khác. |
| **NFR-11** | TLS 1.2+. At-rest theo dịch vụ quản lý. Không CMEK ở MVP. Region mặc định **asia-southeast1**. Gemini có thể xử lý ngoài region — phải công bố trong chính sách dữ liệu. |
| **NFR-12** | OAuth least privilege, scope đọc. Secret triển khai trên **GCP Secret Manager**. Token connector mã hóa at-rest (Fernet/`ENCRYPTION_KEY`). Không commit, không nhúng image, không log nguyên văn. Ngắt kết nối: xóa token local và revoke phía provider nếu API cho phép. |
| **NFR-13** | Structured log, correlation ID, metric lỗi/độ trễ. LangSmith: trace đã redaction; không gửi thân tài liệu đầy đủ hay prompt chứa nội dung khách. Production: 100% lỗi, 10% thành công. Retention log/trace **30 ngày**. |
| **NFR-14** | Docker/Terraform/GitHub Actions. Pipeline: lint/test/build trước deploy. Production cần approval. Rollback: revision Cloud Run / release Firebase Hosting trước đó. |
| **NFR-15** | FastAPI, `uv`, Temporal, PostgreSQL, LangChain, LangGraph, LangSmith, Cloud Run. |
| **NFR-16** | React, Tailwind, `#F97316`, Glassmorphism. Frontend production: **Firebase Hosting**. |
| **NFR-17** | Môi trường mới từ Terraform trong repo, trừ secret. Đổi production qua GitHub Actions. |
| **NFR-18** | Sau sync thành công, trang bị ảnh hưởng hiện tại hoặc đang cập nhật quan sát được; p95 refresh ≤ **15 phút** cho thay đổi chuẩn. |
| **NFR-19** | Dữ liệu khách chỉ xây Company Memory đúng tenant. Không train/fine-tune mô hình FLAE hay bên thứ ba. |
| **NFR-20** | MCP trả bản đồ/đoạn đã chắt lọc + citation, không dump kho nguồn. Đo ở `SM-09`. |

## 7. Success Metrics

| Mã | Chỉ số | Cách đo | Mục tiêu MVP |
|---|---|---|---|
| **SM-01** | Onboarding cốt lõi | Đăng nhập + workspace + ≥1 nguồn hoàn tất + ≥1 trang ngữ cảnh / người bắt đầu onboarding | ≥ **60%** trong **7 ngày** |
| **SM-02** | Thời gian đến ngữ cảnh đầu tiên | p50/p95 từ đăng nhập lần đầu đến trang đầu tiên hoàn tất | p50 ≤ **30 phút**, p95 ≤ **2 giờ** |
| **SM-03** | Ingestion thành công | Tài liệu hợp lệ hoàn tất / tài liệu hợp lệ tiếp nhận | ≥ **90%**/tuần |
| **SM-04** | Sync thành công | Sync không lỗi / tổng sync, tách Drive, Notion, Slack | ≥ **90%**/tuần |
| **SM-05** | MCP kích hoạt | Tenant hoàn tất ≥1 truy vấn MCP hợp lệ / tenant bắt đầu cấu hình MCP | ≥ **50%** |
| **SM-06** | Retrieval có provenance | Bộ ≥ 50 câu hỏi nội bộ: precision/recall bằng chứng; % response có provenance hợp lệ | Provenance ≥ **95%**; precision ≥ **0.60**; recall ≥ **0.70** |
| **SM-07** | Context đủ để trả lời đúng | % truy vấn benchmark mà context chứa thông tin cần (ground truth / review người) | ≥ **70%** |
| **SM-08** | Ổn định | Uptime, error rate API, workflow thất bại sau retry | Uptime `NFR-06`; API error < **1%**; workflow fail sau retry < **5%** |
| **SM-09** | Hiệu quả vs tìm nguồn thô | Token + số search/tool call so với baseline; chất lượng không giảm | ≥ **20%** ít token; chất lượng không thấp hơn baseline |
| **SM-10** | Distillation | Trang ngữ cảnh hiện hành / tài liệu nguồn (`FR-24`) | Tỷ lệ **< 1.0**; không mất citation |
| **SM-11** | Độ tươi | Từ thay đổi đã sync đến trang mang citation mới | Khớp `NFR-18` (p95 ≤ 15 phút) |

## 8. Quyết định đã chốt (OQ)

| Mã | Quyết định |
|---|---|
| **OQ-01** | 1 workspace/tenant, 1 owner. Không invite, không org RBAC trong MVP. |
| **OQ-02** | Email/password + Google Sign-In. Không magic link. |
| **OQ-03** | PDF, Markdown, TXT. Tối đa 50 MB/file. Không DOCX/CSV ở MVP. |
| **OQ-04** | Drive, Notion, Slack. Không HubSpot. GitHub hoãn (`FR-18`). |
| **OQ-05** | Người dùng chọn folder/page/channel trước khi ingest. Slack: channel công khai đã chọn + thread + file. Không DM, không private channel. |
| **OQ-06** | Sync thủ công + lịch 15 phút. Webhook hậu MVP. |
| **OQ-07** | Đổi nguồn → revision mới, view hiện hành cập nhật, revision cũ giữ **90 ngày**. Xóa nguồn → tombstone, khỏi retrieval ngay. Ngắt nguồn / xóa workspace: khỏi retrieval ngay, xóa cứng ≤ **30 ngày**. |
| **OQ-08** | MCP bắt buộc. Streamable HTTP. Bearer token theo workspace, owner mint/revoke. |
| **OQ-09** | Hai tool: định hướng bản đồ và truy xuất sâu. Schema bắt buộc như `FR-15`. |
| **OQ-10** | `gemini-2.5-flash` + `gemini-embedding-001`. Đổi model bằng env, không UI. |
| **OQ-11** | Ngưỡng như `NFR-01`–`NFR-05`, `NFR-18`. Workspace chuẩn: 500 tài liệu / 20k chunk / 5k entity / 200 trang. |
| **OQ-12** | 99.5% uptime; 3 retry backoff mũ; RPO 24h; RTO 8h; test restore hàng tháng. |
| **OQ-13** | `asia-southeast1`. Không CMEK. Gemini có thể ra ngoài region — công bố, không chặn MVP. |
| **OQ-14** | GCP Secret Manager + mã hóa token connector at-rest. Revoke khi ngắt kết nối. |
| **OQ-15** | LangSmith redaction, không body tài liệu đầy đủ. Sample 100% lỗi / 10% success. Retention 30 ngày. |
| **OQ-16** | local / staging / production. Production: GitHub Actions + approval. Rollback revision trước. |
| **OQ-17** | Frontend: Firebase Hosting. Backend: Cloud Run. |
| **OQ-18** | Mục tiêu như cột “Mục tiêu MVP” mục 7. |
| **OQ-19** | Web MVP = bản đồ + connector + MCP. Chat in-app không chặn hoàn thành MVP; không xây chat mới cho MVP. |
