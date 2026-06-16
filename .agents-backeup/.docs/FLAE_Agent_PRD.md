# PRD: Company Memory AI

## 1. Tổng quan sản phẩm

### Tên tạm thời

**FLAE**
Tên thay thế: CompanyBrain, TeamMind, MemoGraph, Atlas AI.

### Mô tả ngắn

FLAE là một nền tảng **AI company memory** giúp startup và team kỹ thuật kết nối dữ liệu từ Slack, Notion, Google Drive, GitHub, Linear/Jira và Gmail để xây dựng một **living knowledge graph** về dự án, con người, quyết định, tài liệu, khách hàng, codebase và rủi ro.

Người dùng có thể hỏi AI về tình trạng dự án, quyết định gần đây, nguyên nhân chậm tiến độ, thay đổi trong code, tài liệu lỗi thời, hoặc tạo các agent tự động như weekly digest, stale-doc detector, project risk monitor.

---

## 2. Vấn đề cần giải quyết

Các công ty hiện đại dùng quá nhiều công cụ:

```text
Slack
Notion
Google Drive
GitHub
Linear/Jira
Gmail
HubSpot
Figma
```

Thông tin bị phân mảnh:

* Quyết định nằm trong Slack.
* Tài liệu nằm trong Notion.
* Code nằm trong GitHub.
* Ticket nằm trong Linear/Jira.
* Khách hàng phản hồi qua email hoặc CRM.
* Tài liệu thường không cập nhật theo code.
* Người mới join team mất nhiều thời gian để hiểu context.
* AI coding agents thiếu business context và thường dựa vào thông tin cũ.

### Pain points chính

1. **Không biết source of truth nằm ở đâu.**
2. **AI trả lời sai vì tài liệu lỗi thời.**
3. **Code thay đổi nhưng docs không đổi.**
4. **Các quyết định quan trọng bị trôi trong Slack.**
5. **Founder/PM/Engineer phải tự tổng hợp thông tin thủ công.**
6. **Coding agents không hiểu business decisions phía sau code.**

---

## 3. Mục tiêu sản phẩm

### Mục tiêu chính

Xây dựng một hệ thống AI có khả năng:

* Kết nối dữ liệu công ty.
* Cập nhật dữ liệu gần realtime bằng ingestion pipeline.
* Tạo knowledge graph về người, dự án, tài liệu, code, quyết định và khách hàng.
* Cho phép hỏi đáp có citation.
* Phát hiện tài liệu lỗi thời so với code.
* Tự động tạo digest, cảnh báo và báo cáo theo lịch.

### Không phải mục tiêu ở MVP

Trong MVP, sản phẩm **không** cần:

* Clone toàn bộ Pensieve.
* Hỗ trợ tất cả connector ngay từ đầu.
* Xây graph visualization quá phức tạp.
* Fine-tune model riêng.
* Làm autonomous agent có quyền tự sửa code/tài liệu.
* Hỗ trợ enterprise permission model quá sâu ngay từ v0.

---

## 4. Đối tượng người dùng

### Persona 1: Founder / CEO

**Nhu cầu:**

* Biết công ty đang làm gì.
* Biết dự án nào đang bị block.
* Biết tuần này có quyết định quan trọng gì.
* Biết khách hàng đang phàn nàn điều gì.
* Không muốn đọc từng Slack thread, Notion doc, GitHub PR.

**Câu hỏi mẫu:**

```text
Tuần này team product có quyết định gì quan trọng?
Dự án mobile launch đang bị block bởi gì?
Khách hàng enterprise gần đây phàn nàn điều gì?
```

---

### Persona 2: Product Manager

**Nhu cầu:**

* Theo dõi roadmap.
* Tóm tắt feedback khách hàng.
* Biết feature nào bị delay.
* So sánh docs, tickets và code.
* Tạo weekly update cho stakeholders.

**Câu hỏi mẫu:**

```text
Feature billing hiện đang ở trạng thái nào?
Có quyết định nào gần đây ảnh hưởng đến roadmap Q3 không?
Docs API billing có còn đúng với code hiện tại không?
```

---

### Persona 3: Engineer / Tech Lead

**Nhu cầu:**

* Hiểu vì sao code được viết như vậy.
* Tìm các quyết định liên quan đến một module.
* Biết docs nào bị stale sau khi code thay đổi.
* Cho AI coding agent thêm context chính xác.

**Câu hỏi mẫu:**

```text
Vì sao endpoint /api/users được đổi từ name sang firstName/lastName?
PR nào thay đổi logic billing gần đây?
Tài liệu nào cần cập nhật sau commit mới nhất?
```

---

### Persona 4: New Joiner

**Nhu cầu:**

* Onboarding nhanh.
* Hiểu dự án, người phụ trách, tài liệu quan trọng.
* Hỏi AI thay vì hỏi đồng nghiệp liên tục.

**Câu hỏi mẫu:**

```text
Cho tôi tổng quan về dự án mobile app.
Ai đang phụ trách billing system?
Các quyết định quan trọng trong 3 tháng qua là gì?
```

---

## 5. Value proposition

FLAE giúp team có một **bộ nhớ công ty sống**, luôn cập nhật theo dữ liệu thực tế.

### Giá trị cốt lõi

```text
Từ dữ liệu rời rạc
-> thành knowledge graph
-> thành AI context chính xác
-> thành agents tự động
```

### Khác biệt so với RAG thông thường

RAG thông thường chỉ search text. FLAE cần hiểu:

* Ai nói?
* Nói lúc nào?
* Nguồn nào đáng tin hơn?
* Code đã đổi chưa?
* Tài liệu có lỗi thời không?
* Quyết định nào mới nhất?
* Entity nào liên quan entity nào?

---

# 6. Scope MVP

## 6.1 MVP phải có

### Connectors

P0:

* Google Drive
* Notion
* Slack
* GitHub

P1:

* Linear hoặc Jira
* Gmail
* HubSpot

P2:

* Figma
* Confluence
* Salesforce
* Zendesk
* Zalo OA / Telegram

---

### Core features

P0:

1. Workspace / organization management.
2. User authentication.
3. Connect data sources.
4. Initial data sync.
5. Incremental ingestion.
6. Document chunking + embedding.
7. Entity extraction.
8. Basic knowledge graph.
9. AI chat with citations.
10. GitHub code index.
11. Stale-doc detection.
12. Weekly digest agent.

P1:

1. Graph explorer UI.
2. Project page.
3. Person page.
4. Decision log.
5. Project risk monitor.
6. Slack notification.
7. Permission-aware search.

P2:

1. Multi-agent workflow.
2. Auto-generated documentation PR.
3. CRM intelligence.
4. Custom agent builder.
5. Advanced graph analytics.

---

# 7. User stories

## 7.1 Connect data source

### User story

Là admin, tôi muốn kết nối Slack, Notion, Google Drive và GitHub để FLAE có thể đọc dữ liệu công ty.

### Acceptance criteria

* User có thể chọn source cần kết nối.
* App mở OAuth flow.
* Sau khi OAuth thành công, source hiển thị trạng thái `Connected`.
* App bắt đầu initial sync.
* User nhìn thấy trạng thái sync:

```text
Pending
Syncing
Completed
Failed
```

* User có thể disconnect source.
* Khi disconnect, dữ liệu source đó có thể bị giữ lại hoặc xóa tùy setting.

---

## 7.2 Initial ingestion

### User story

Là admin, tôi muốn hệ thống sync dữ liệu cũ lần đầu để có thể hỏi AI ngay sau khi kết nối.

### Acceptance criteria

* Hệ thống fetch dữ liệu theo batch.
* Có retry nếu API lỗi.
* Có rate limit handling.
* Có progress tracking.
* Dữ liệu được lưu vào `source_objects`.
* Nội dung được extract, chunk, embed.
* Metadata source được lưu đầy đủ.
* Không tạo duplicate khi sync lại.

---

## 7.3 Incremental ingestion

### User story

Là user, tôi muốn dữ liệu mới từ Slack, Notion, GitHub, Drive được cập nhật gần realtime.

### Acceptance criteria

* Hệ thống nhận webhook từ source nếu source hỗ trợ.
* Với source không hỗ trợ webhook ổn định, hệ thống dùng polling định kỳ.
* Mỗi event được lưu vào `ingestion_events`.
* Event có `dedupe_key` để tránh xử lý trùng.
* Chỉ object bị thay đổi mới được fetch lại.
* Nếu content hash không đổi, bỏ qua processing.
* Nếu content hash đổi, chỉ reprocess phần bị ảnh hưởng.
* Knowledge graph được cập nhật theo affected entities.

---

## 7.4 Ask company memory

### User story

Là user, tôi muốn hỏi AI về thông tin công ty và nhận câu trả lời có citation.

### Câu hỏi mẫu

```text
Dự án mobile app đang bị block bởi gì?
Ai quyết định delay launch sang Q3?
Docs billing API có còn đúng không?
Tuần này khách hàng nói gì về onboarding?
```

### Acceptance criteria

* AI trả lời bằng ngữ cảnh từ connected sources.
* Mỗi claim quan trọng có citation.
* Citation trỏ về source gốc: Slack thread, Notion page, Drive doc, GitHub PR.
* Nếu thông tin mâu thuẫn, AI phải nói rõ.
* Nếu không đủ dữ liệu, AI phải nói không chắc.
* AI không được bịa source.

---

## 7.5 Knowledge graph

### User story

Là user, tôi muốn hệ thống hiểu quan hệ giữa người, dự án, quyết định, tài liệu, code và khách hàng.

### Node types P0

```text
Person
Project
Document
Decision
Repository
File
Function
APIEndpoint
PullRequest
Commit
Customer
Issue
Risk
```

### Relationship types P0

```text
Person -> works_on -> Project
Person -> authored -> Document
Person -> made -> Decision
Document -> mentions -> Project
Document -> documents -> APIEndpoint
APIEndpoint -> implemented_by -> Function
Function -> located_in -> File
PullRequest -> changed -> File
PullRequest -> changed -> Function
Commit -> modified -> File
Decision -> affects -> Project
Customer -> reported -> Issue
Project -> blocked_by -> Risk
```

### Acceptance criteria

* Hệ thống extract entities từ document/message/code.
* Hệ thống tạo relationship có evidence.
* Mỗi relationship phải có source.
* Mỗi fact có confidence score.
* Có timestamp để phân biệt thông tin cũ/mới.
* Graph có thể được query để tìm context liên quan.

---

## 7.6 Code ingestion

### User story

Là engineer, tôi muốn FLAE hiểu codebase để AI không chỉ dựa vào tài liệu cũ.

### Requirements

Hệ thống cần ingest GitHub:

```text
Repositories
Branches
Commits
Pull requests
Changed files
Diffs
README
Code files
Issues
Release notes
```

### Với code files

P0 hỗ trợ:

```text
TypeScript
JavaScript
Python
Markdown
JSON
YAML
SQL
```

P1 hỗ trợ:

```text
Go
Java
Rust
Ruby
PHP
```

### Code intelligence P0

Hệ thống cần extract:

```text
File path
Function name
Class name
API endpoint
Database table
Environment variable
Import/dependency
Changed lines
```

### Acceptance criteria

* Khi có GitHub push event, hệ thống nhận event.
* Hệ thống fetch changed files.
* Hệ thống parse symbol bị ảnh hưởng.
* Hệ thống update code graph.
* Hệ thống mark related docs là `possibly_stale` nếu docs liên quan đến code vừa đổi.

---

## 7.7 Stale documentation detection

### User story

Là engineer hoặc PM, tôi muốn biết tài liệu nào đã lỗi thời so với code mới nhất.

### Ví dụ

Code mới:

```text
POST /api/users now requires:
- firstName
- lastName
```

Docs cũ:

```text
POST /api/users requires:
- name
```

Hệ thống cần cảnh báo:

```text
API docs for POST /api/users may be stale.
Code now requires firstName and lastName, but docs still mention name.
```

### Flow

```text
GitHub push event
-> detect changed endpoint/function
-> find related docs
-> compare docs vs code
-> create stale-doc finding
-> notify relevant users
```

### Stale status

```text
fresh
possibly_stale
stale
ignored
resolved
```

### Acceptance criteria

* Hệ thống tìm được docs liên quan đến changed code symbol.
* Hệ thống chạy comparison agent.
* Hệ thống tạo finding có reason.
* Finding có source code citation và doc citation.
* User có thể mark finding là resolved hoặc ignored.
* Khi docs được update, hệ thống re-check finding.

---

## 7.8 Weekly digest agent

### User story

Là founder hoặc PM, tôi muốn nhận weekly digest tự động về những thay đổi quan trọng trong công ty.

### Digest nên bao gồm

```text
Key decisions
Project updates
New risks
Blocked work
Customer feedback
Important PRs
Docs that became stale
People involved
```

### Acceptance criteria

* User có thể bật/tắt weekly digest.
* User chọn ngày/giờ nhận digest.
* Digest được tạo từ dữ liệu tuần gần nhất.
* Digest có citation.
* Digest có thể gửi qua email hoặc Slack.
* Digest được lưu lại trong app.

---

# 8. Functional requirements

## 8.1 Authentication

P0:

* Email/password hoặc magic link.
* Google login.
* Organization/workspace.
* Role cơ bản:

```text
Owner
Admin
Member
Viewer
```

P1:

* SSO/SAML.
* SCIM.
* Granular permissions.

---

## 8.2 Workspace

Mỗi workspace có:

```text
organization_id
name
members
connected_sources
billing_plan
settings
```

Workspace settings:

```text
Allowed sources
Retention policy
Default model
Digest schedule
Permission mode
```

---

## 8.3 Data source management

Mỗi source có:

```text
source_type
connection_status
oauth_token
refresh_token
last_synced_at
sync_status
error_message
sync_cursor
```

Source status:

```text
connected
syncing
failed
disconnected
needs_reauth
```

---

## 8.4 Ingestion pipeline

Pipeline chính:

```text
External event
-> Event inbox
-> Sync worker
-> Change detector
-> Text/code extraction
-> Chunking
-> Embedding
-> Entity extraction
-> Relationship extraction
-> Graph update
-> Agent triggers
```

### Requirements

* Idempotent processing.
* Retry failed jobs.
* Store raw payload.
* Store source object metadata.
* Detect deletions.
* Handle rate limits.
* Support partial reprocessing.
* Track processing status per object.

---

## 8.5 Chunking

### Document chunking

Default:

```text
chunk_size: 800-1200 tokens
overlap: 100-200 tokens
```

Chunk metadata:

```text
document_id
source
section_title
author
created_at
updated_at
url
permission_scope
content_hash
```

### Code chunking

Code không nên chunk như text thường. Cần ưu tiên:

```text
function-level chunk
class-level chunk
file-level summary
diff-level chunk
```

---

## 8.6 Embeddings

Mỗi chunk cần embedding để semantic search.

Requirements:

* Store vector in pgvector hoặc vector DB.
* Re-embed only changed chunks.
* Support metadata filtering.
* Support hybrid search:

```text
keyword search + vector search + graph expansion
```

---

## 8.7 Entity extraction

LLM hoặc rule-based extractor cần nhận diện:

```text
Person
Project
Customer
Feature
Decision
Risk
APIEndpoint
Repository
Function
File
Issue
Metric
Date
```

Output mẫu:

```json
{
  "entities": [
    {
      "name": "Mobile Launch",
      "type": "Project",
      "confidence": 0.91
    },
    {
      "name": "Alice Nguyen",
      "type": "Person",
      "confidence": 0.86
    }
  ]
}
```

---

## 8.8 Relationship extraction

Output mẫu:

```json
{
  "relationships": [
    {
      "from": "Alice Nguyen",
      "relation": "works_on",
      "to": "Mobile Launch",
      "confidence": 0.84,
      "evidence": "Alice is handling the launch checklist."
    }
  ]
}
```

Requirements:

* Relationship phải có evidence.
* Relationship phải liên kết tới chunk gốc.
* Relationship có confidence.
* Relationship có timestamp.

---

## 8.9 Fact versioning

Mọi fact quan trọng cần có temporal metadata.

```text
fact_id
subject
predicate
object/value
source
confidence
valid_from
valid_to
created_at
updated_at
```

Ví dụ:

```text
Mobile Launch target date = Q2
valid_from = 2026-01-01
valid_to = 2026-03-15

Mobile Launch target date = Q3
valid_from = 2026-03-15
valid_to = null
```

---

## 8.10 Conflict handling

Khi nguồn mâu thuẫn, hệ thống cần xếp hạng độ tin cậy.

Default source authority:

```text
1. Production code
2. Merged PR
3. Release notes
4. Linear/Jira status
5. Recent Slack decision
6. Notion/Google Docs
7. Old meeting notes
```

AI response cần nói rõ:

```text
Tôi tìm thấy thông tin mâu thuẫn:
- Notion doc nói launch ở Q2.
- Slack decision ngày 15/03 nói delay sang Q3.
Nguồn Slack mới hơn, nên khả năng Q3 là trạng thái hiện tại.
```

---

# 9. Non-functional requirements

## 9.1 Performance

P0 targets:

```text
Chat response first token: < 5s
Search retrieval: < 2s
Webhook event accepted: < 500ms
Small object ingestion: < 60s
Large document ingestion: async
```

## 9.2 Scalability

MVP cần xử lý:

```text
1 workspace: 10-100 users
Documents: 10k-100k
Slack messages: 100k-1M
GitHub files: 10k-100k
Chunks: 500k-5M
```

## 9.3 Reliability

Requirements:

* Job retry.
* Dead letter queue.
* Sync cursor persistence.
* Idempotency key.
* Webhook deduplication.
* Monitoring dashboard.

## 9.4 Security

Requirements:

* Encrypt OAuth tokens.
* Encrypt sensitive data at rest.
* Use least-privilege OAuth scopes.
* Respect source permissions where possible.
* Audit log for data access.
* Admin can delete source data.
* No training on customer data by default.

## 9.5 Privacy

Requirements:

* Workspace data isolated.
* User can request deletion.
* Admin can set retention policy.
* Sensitive content classification P1.
* PII detection P1.

---

# 10. Permission model

## MVP

MVP có thể dùng workspace-level access:

```text
Nếu user trong workspace -> có thể hỏi dữ liệu workspace
```

## P1

Permission-aware retrieval:

```text
User chỉ thấy nội dung mà họ có quyền thấy ở source gốc
```

Ví dụ:

* Slack private channel chỉ searchable bởi members của channel.
* Google Drive private doc chỉ searchable bởi người có quyền.
* GitHub private repo chỉ searchable bởi người có quyền repo.

---

# 11. Data model đề xuất

## 11.1 organizations

```sql
create table organizations (
  id uuid primary key,
  name text not null,
  created_at timestamptz default now()
);
```

## 11.2 users

```sql
create table users (
  id uuid primary key,
  email text unique not null,
  name text,
  created_at timestamptz default now()
);
```

## 11.3 organization_members

```sql
create table organization_members (
  id uuid primary key,
  organization_id uuid not null,
  user_id uuid not null,
  role text not null,
  created_at timestamptz default now()
);
```

## 11.4 data_sources

```sql
create table data_sources (
  id uuid primary key,
  organization_id uuid not null,
  source_type text not null,
  status text not null,
  oauth_metadata jsonb,
  sync_cursor text,
  last_synced_at timestamptz,
  created_at timestamptz default now()
);
```

## 11.5 source_objects

```sql
create table source_objects (
  id uuid primary key,
  organization_id uuid not null,
  data_source_id uuid not null,
  source text not null,
  external_id text not null,
  external_url text,
  object_type text not null,
  title text,
  author text,
  version text,
  content_hash text,
  metadata jsonb,
  last_seen_at timestamptz,
  last_synced_at timestamptz,
  deleted_at timestamptz,
  unique (organization_id, source, external_id)
);
```

## 11.6 documents

```sql
create table documents (
  id uuid primary key,
  organization_id uuid not null,
  source_object_id uuid not null,
  title text,
  content text,
  summary text,
  created_at timestamptz,
  updated_at timestamptz
);
```

## 11.7 document_chunks

```sql
create table document_chunks (
  id uuid primary key,
  organization_id uuid not null,
  document_id uuid not null,
  chunk_index int not null,
  content text not null,
  content_hash text not null,
  embedding vector(1536),
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

## 11.8 entities

```sql
create table entities (
  id uuid primary key,
  organization_id uuid not null,
  name text not null,
  type text not null,
  canonical_name text,
  summary text,
  confidence float,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

## 11.9 relationships

```sql
create table relationships (
  id uuid primary key,
  organization_id uuid not null,
  from_entity_id uuid not null,
  to_entity_id uuid not null,
  relation_type text not null,
  evidence_chunk_id uuid,
  confidence float,
  valid_from timestamptz,
  valid_to timestamptz,
  created_at timestamptz default now()
);
```

## 11.10 facts

```sql
create table facts (
  id uuid primary key,
  organization_id uuid not null,
  subject_entity_id uuid,
  predicate text not null,
  object_entity_id uuid,
  value text,
  source_chunk_id uuid,
  confidence float,
  authority_score float,
  valid_from timestamptz,
  valid_to timestamptz,
  created_at timestamptz default now()
);
```

## 11.11 code_symbols

```sql
create table code_symbols (
  id uuid primary key,
  organization_id uuid not null,
  repository text not null,
  file_path text not null,
  symbol_name text not null,
  symbol_type text not null,
  signature text,
  start_line int,
  end_line int,
  content_hash text,
  summary text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

## 11.12 stale_doc_findings

```sql
create table stale_doc_findings (
  id uuid primary key,
  organization_id uuid not null,
  document_id uuid not null,
  code_symbol_id uuid,
  status text not null,
  severity text,
  reason text,
  code_evidence text,
  doc_evidence text,
  detected_at timestamptz default now(),
  resolved_at timestamptz
);
```

## 11.13 agents

```sql
create table agents (
  id uuid primary key,
  organization_id uuid not null,
  name text not null,
  type text not null,
  prompt text not null,
  schedule text,
  enabled boolean default true,
  created_at timestamptz default now()
);
```

## 11.14 agent_runs

```sql
create table agent_runs (
  id uuid primary key,
  organization_id uuid not null,
  agent_id uuid not null,
  status text not null,
  input jsonb,
  output jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  error text
);
```

---

# 12. System architecture

## 12.1 MVP architecture

```text
Frontend:
Next.js

Backend:
FastAPI hoặc NestJS

Database:
PostgreSQL + pgvector

Queue:
BullMQ / Trigger.dev / Inngest / Temporal

Object storage:
S3 / Cloudflare R2

LLM:
OpenAI / Anthropic / Gemini

Auth:
Clerk / Auth0 / Supabase Auth

Deployment:
Vercel + Railway/Fly.io/AWS
```

## 12.2 High-level flow

```text
User connects source
-> OAuth stored securely
-> Initial sync job starts
-> Source objects saved
-> Content extracted
-> Chunks generated
-> Embeddings stored
-> Entities extracted
-> Relationships extracted
-> Graph updated
-> User can chat/search
-> Agents run periodically
```

## 12.3 Realtime ingestion flow

```text
Source webhook
-> /webhooks/:source
-> Validate signature
-> Store ingestion event
-> Return 200 quickly
-> Queue worker processes event
-> Fetch changed object
-> Compare version/hash
-> Reprocess changed parts
-> Update graph
-> Trigger relevant agents
```

---

# 13. AI retrieval design

## 13.1 Retrieval pipeline

```text
User question
-> classify intent
-> extract entities
-> graph lookup
-> vector search
-> keyword search
-> reranking
-> source authority ranking
-> context assembly
-> LLM answer
-> citation rendering
```

## 13.2 Query types

System cần nhận diện:

```text
Project status question
Decision question
Person responsibility question
Code question
Documentation freshness question
Customer feedback question
Weekly summary request
```

## 13.3 Answer requirements

AI answer phải:

* Có citation.
* Nêu rõ uncertainty.
* Nêu rõ conflict nếu có.
* Ưu tiên nguồn mới hơn và có authority cao hơn.
* Không bịa dữ liệu.
* Không trả lời ngoài quyền truy cập của user.

---

# 14. Agent requirements

## 14.1 Weekly Digest Agent

Input:

```text
Data changes in last 7 days
Important Slack threads
Updated docs
Merged PRs
New stale-doc findings
Project status changes
Customer feedback
```

Output:

```text
Executive summary
Key decisions
Project updates
Risks/blockers
Customer insights
Engineering changes
Stale docs
Recommended actions
```

---

## 14.2 Stale Doc Agent

Trigger:

```text
GitHub push
Merged PR
Updated code symbol
Manual run
```

Output:

```text
Finding title
Affected document
Affected code symbol
Reason
Severity
Suggested update
Citations
```

---

## 14.3 Project Risk Agent

Trigger:

```text
Daily
Weekly
Manual
```

Signals:

```text
Tickets overdue
Many Slack messages mentioning blocked/delay
PRs stuck
Docs inconsistent
Customer complaints
No activity for long time
```

Output:

```text
Project risk score
Reasons
Evidence
Suggested next steps
```

---

# 15. UI requirements

## 15.1 Main navigation

```text
Home
Ask
Sources
Memory Graph
Projects
Decisions
Stale Docs
Agents
Settings
```

---

## 15.2 Home dashboard

Widgets:

```text
Connected sources
Sync status
Recent decisions
Open stale-doc findings
Project risks
Weekly digest
Recent important changes
```

---

## 15.3 Ask page

Components:

* Chat input.
* Source filters.
* Time filters.
* Entity filters.
* Answer area.
* Citations panel.
* Related entities.
* Suggested follow-up questions.

---

## 15.4 Sources page

Display:

```text
Source name
Connection status
Last synced
Objects synced
Errors
Actions
```

Actions:

```text
Connect
Reconnect
Pause sync
Run sync now
Disconnect
Delete data
```

---

## 15.5 Stale Docs page

Columns:

```text
Status
Severity
Document
Related code
Reason
Detected at
Owner
Actions
```

Actions:

```text
View details
Mark resolved
Ignore
Re-check
Create issue
```

---

## 15.6 Memory Graph page

MVP có thể đơn giản:

* Search entity.
* Entity detail page.
* Related entities list.
* Evidence list.

P1 mới cần visual graph.

---

# 16. API endpoints đề xuất

## Auth / workspace

```http
GET /api/me
GET /api/orgs
POST /api/orgs
GET /api/orgs/:id
```

## Sources

```http
GET /api/sources
POST /api/sources/:source/connect
POST /api/sources/:id/disconnect
POST /api/sources/:id/sync
GET /api/sources/:id/status
```

## Webhooks

```http
POST /api/webhooks/slack
POST /api/webhooks/github
POST /api/webhooks/notion
POST /api/webhooks/google-drive
```

## Chat

```http
POST /api/chat
GET /api/chat/:conversationId
```

## Graph

```http
GET /api/entities
GET /api/entities/:id
GET /api/entities/:id/relationships
GET /api/facts
```

## Stale docs

```http
GET /api/stale-docs
GET /api/stale-docs/:id
POST /api/stale-docs/:id/resolve
POST /api/stale-docs/:id/ignore
POST /api/stale-docs/:id/recheck
```

## Agents

```http
GET /api/agents
POST /api/agents
PATCH /api/agents/:id
POST /api/agents/:id/run
GET /api/agents/:id/runs
```

---

# 17. Metrics

## Product metrics

```text
Number of connected sources per workspace
Number of weekly active users
Number of questions asked
Question answer satisfaction
Citation click-through rate
Weekly digest open rate
Number of stale docs detected
Number of stale docs resolved
```

## Technical metrics

```text
Ingestion latency
Webhook processing delay
Embedding cost per workspace
LLM cost per answer
Sync failure rate
Queue backlog size
Average retrieval latency
Answer generation latency
```

## Quality metrics

```text
Answer groundedness
Citation correctness
Stale-doc false positive rate
Stale-doc false negative rate
Entity extraction accuracy
Relationship extraction accuracy
```

---

# 18. MVP success criteria

MVP được xem là thành công nếu:

```text
10 pilot teams connect at least 2 data sources.
70%+ answers have useful citations.
Users ask at least 20 questions per workspace per week.
Weekly digest is read by at least 50% of active workspaces.
Stale-doc detector finds real issues in at least 30% of engineering workspaces.
Initial sync succeeds for 90%+ connected sources.
Incremental sync latency under 5 minutes for common events.
```

---

# 19. Roadmap

## Phase 1: Core RAG + connectors

Deliverables:

```text
Auth
Workspace
Google Drive connector
Notion connector
Manual file upload
Chunking
Embedding
Basic chat with citations
```

## Phase 2: Slack + GitHub

Deliverables:

```text
Slack connector
GitHub connector
Webhook ingestion
Incremental sync
Code file indexing
PR/commit ingestion
```

## Phase 3: Knowledge graph

Deliverables:

```text
Entity extraction
Relationship extraction
Entity pages
Decision log
Graph-based retrieval
Fact timestamping
Conflict handling
```

## Phase 4: Stale-doc detection

Deliverables:

```text
Code symbol parser
Doc-code relationship mapping
Stale-doc agent
Stale-doc dashboard
Resolve/ignore/recheck flow
```

## Phase 5: Agents

Deliverables:

```text
Weekly digest
Project risk monitor
Custom scheduled agent
Slack/email notifications
Agent run history
```

## Phase 6: Enterprise readiness

Deliverables:

```text
Permission-aware retrieval
Audit logs
SSO
Advanced admin controls
Retention policies
Billing
```

---

# 20. Risks

## Risk 1: Data quá lớn, ingestion chậm

### Mitigation

* Incremental sync.
* Hash-based change detection.
* Chunk-level reprocessing.
* Queue workers.
* Rate limit handling.
* Prioritize recent and important data.

---

## Risk 2: AI hallucination

### Mitigation

* Citation bắt buộc.
* “Use only provided context” prompt.
* Retrieval quality scoring.
* Refuse when insufficient evidence.
* Answer confidence display.

---

## Risk 3: Graph extraction sai

### Mitigation

* Confidence score.
* Human feedback.
* Evidence required.
* Entity deduplication.
* Periodic graph cleanup.

---

## Risk 4: Stale-doc false positive

### Mitigation

* Status `possibly_stale` trước khi khẳng định `stale`.
* Require code evidence + doc evidence.
* Allow user ignore/resolve.
* Learn from feedback.

---

## Risk 5: Permission leak

### Mitigation

* Start with trusted pilot teams.
* Add permission-aware retrieval before enterprise launch.
* Store source permission metadata.
* Filter retrieval by user access.

---

# 21. Open questions

1. MVP nên ưu tiên Slack + GitHub hay Notion + Google Drive trước?
2. Target customer đầu tiên là startup engineering team hay founder/operator?
3. Có cần hỗ trợ tiếng Việt từ đầu không?
4. Có cần self-hosted option không?
5. Dữ liệu code nên parse bằng tree-sitter hay LSP?
6. Có nên cho agent tạo PR cập nhật docs tự động ở P1 không?
7. Billing theo seat, theo source, theo số chunks, hay theo agent runs?
8. Permission model có cần ngay ở MVP không?
9. Có cần graph visualization ngay từ đầu không?
10. Nên tích hợp Linear hay Jira trước?

---

# 22. Định nghĩa MVP gọn nhất

Phiên bản đầu tiên nên tập trung vào:

```text
Company Memory AI cho engineering/product team.
Kết nối Notion, Slack, Google Drive, GitHub.
Cho phép hỏi đáp có citation.
Tự phát hiện docs có thể lỗi thời khi code thay đổi.
Tạo weekly digest tự động.
```

### P0 feature list cuối cùng

```text
1. Auth + workspace
2. Source connection: Notion, Slack, Google Drive, GitHub
3. Initial sync
4. Webhook/incremental sync
5. Chunking + embeddings
6. Entity extraction
7. Basic knowledge graph
8. AI chat with citations
9. GitHub code indexing
10. Stale-doc detection
11. Weekly digest agent
12. Admin source status dashboard
```

---

# 23. One-liner positioning

**FLAE là bộ nhớ AI sống cho công ty, giúp team hỏi đáp, hiểu quyết định, theo dõi dự án, và phát hiện tài liệu lỗi thời khi code thay đổi.**
