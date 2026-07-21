# Spec: Q&A Agent (Hỏi đáp dựa trên tài liệu đã upload)

## Objective
Xây dựng tính năng Q&A Agent cho nền tảng FLAE Agents. Cho phép người dùng (trong cùng Workspace) tạo các Agent thông minh được cấu hình System Prompt riêng, sau đó Agent này sẽ trả lời các câu hỏi dựa trên các tài liệu đã được tải lên và trích xuất (ingested) trong Knowledge Base của Workspace đó.

### User Stories / Acceptance Criteria
1. **Quản lý Agent (CRUD Agents)**:
   - Chủ sở hữu/Admin workspace có thể tạo, xem, cập nhật, xóa Agent.
   - Cấu hình Agent bao gồm: Tên, Avatar (mã màu hoặc class CSS icon), System Prompt (chỉ dẫn hành vi), Model LLM (Gemini 1.5 Pro, Gemini 1.5 Flash, v.v.), Temperature.
2. **Giao tiếp với Agent (Chat Sessions & Messages)**:
   - Người dùng có thể tạo nhiều phiên hội thoại (Chat Sessions) với một Agent cụ thể.
   - Khi gửi tin nhắn, Agent sẽ sử dụng `RetrieverService` để tìm kiếm các chunks/cụm tri thức có liên quan trong Knowledge Base của Workspace đó.
   - Sử dụng **LangGraph StateGraph** để điều hướng xử lý câu hỏi:
     - Node 1: Retrieval (Lấy thông tin từ Knowledge Base).
     - Node 2: Generation (Sử dụng LLM sinh câu trả lời dựa trên context và lịch sử hội thoại).
   - Sử dụng **Postgres Checkpointer** để lưu checkpoint phiên chat vào database `flae_agent_state_db` nhằm đảm bảo khả năng nhớ ngữ cảnh dài hạn.
   - Câu trả lời của Agent được truyền tải về Client qua cơ chế **Server-Sent Events (SSE)** dưới dạng token streaming.
   - Hiển thị danh sách nguồn tài liệu đã trích dẫn (Citations: Tên tài liệu, chunk preview).
3. **Lưu trữ Lịch sử**:
   - Lưu trữ thông tin Agent, Chat Session và Chat Message (để hiển thị nhanh trên UI) trong cơ sở dữ liệu `flae_db`.
   - Trạng thái nội bộ và lịch sử sâu của Agent được quản lý thông qua checkpointer trong `flae_agent_state_db`.

---

## Tech Stack
- **Backend**: FastAPI, SQLAlchemy (Async), Alembic, LangGraph, LangChain Google GenAI.
- **Dependencies mới**:
  - `langgraph-checkpoint-postgres` (để lưu trạng thái LangGraph vào `flae_agent_state_db`).
  - `psycopg[binary,pool]` (driver PostgreSQL dạng sync/blocking cần thiết cho LangGraph Postgres Checkpointer).
- **Frontend**: Angular 18 (Standalone, Signals, RxJS, SSE Client), Tailwind CSS.
- **AI Models**: Gemini 1.5 Flash / Gemini 2.5 Flash làm LLM chính.

---

## Commands
### Backend
- **Cài đặt thư viện mới**:
  ```bash
  cd backend
  uv add langgraph-checkpoint-postgres psycopg["binary,pool"]
  ```
- **Tạo Alembic Migration**:
  ```bash
  cd backend
  uv run alembic revision --autogenerate -m "create_qa_agent_tables"
  ```
- **Áp dụng Migration**:
  ```bash
  cd backend
  uv run alembic upgrade head
  ```
- **Chạy Tests**:
  ```bash
  cd backend
  uv run pytest tests/
  ```

### Frontend
- **Chạy Angular Dev Server**: `npm run start` (hoặc chạy qua `./start.sh` tự động)
- **Build Frontend**: `npm run build`
- **Lint Frontend**: `npm run lint`

---

## Project Structure
Dưới đây là các file và thư mục mới cần được thiết lập hoặc chỉnh sửa:

```text
backend/app/
├── models/
│   └── agent.py              [NEW]     ← SQLAlchemy models cho Agent, ChatSession, ChatMessage
├── schemas/
│   └── sche_agent.py         [NEW]     ← Pydantic schemas cho request/response
├── services/
│   ├── agent_srv.py          [NEW]     ← Xử lý nghiệp vụ CRUD Agent
│   └── chat_srv.py           [NEW]     ← Xử lý logic Chat RAG, tích hợp LangGraph + Retriever
├── agents/
│   └── qa/                   [NEW]     ← Thiết lập LangGraph cho Q&A RAG Agent
│       ├── __init__.py
│       ├── state.py
│       ├── nodes.py
│       └── graph.py
└── api/v1/
    ├── endpoints/
    │   ├── agent.py          [NEW]     ← REST API endpoint cho CRUD Agent, Session, Message History
    │   └── chat_stream.py    [NEW]     ← SSE endpoint cho streaming chat qua Server-Sent Events
    └── api_router.py         [MODIFY]  ← Đăng ký router mới của Agent

frontend/src/app/features/agents/   [NEW]     ← Feature module độc lập quản lý Agent & Chat
├── pages/
│   ├── agent-list/                     ← Trang danh sách các Agent trong Workspace
│   ├── agent-config/                   ← Trang tạo/chỉnh sửa cấu hình Agent
│   └── agent-chat/                     ← Trang giao diện chat hỏi đáp RAG
├── ui/
│   ├── agent-card/                     ← Component dumb hiển thị thông tin Agent ngắn gọn
│   ├── chat-message/                   ← Component hiển thị bong bóng chat, hỗ trợ markdown
│   └── citation-list/                  ← Component hiển thị nguồn tài liệu được trích dẫn
├── services/
│   ├── agent.service.ts                ← Gọi API CRUD Agent
│   └── chat.service.ts                 ← Quản lý kết nối chat SSE (Server-Sent Events)
└── agents.routes.ts                    ← Khai báo routes cho feature agents (Lazy Loaded)
```

---

## Code Style
Tuân thủ các quy tắc trong [flae-code.md](file:///Users/nguyenhienvinh/projects/flae-agents/.agents/rules/flae-code.md):
- **Backend (FastAPI)**:
  - Sử dụng async/await cho các thao tác DB và API bên ngoài.
  - Áp dụng kiến trúc 3 lớp: `Endpoint -> Service -> Model`. API Endpoint tuyệt đối không tự query DB.
  - Xác thực token và lấy workspace qua `Depends(get_current_workspace_id)` và `Depends(get_current_user)`.
- **Frontend (Angular)**:
  - Dùng **Angular Signals** cho state management ở component.
  - Phân tách rõ ràng **Smart Components** (`pages/` - xử lý service/gọi API) và **Dumb Components** (`ui/` - chỉ nhận `@Input` và phát `@Output`).
  - Tailwind CSS cho styling, không viết CSS thuần trừ khi cần thiết.

---

## Testing Strategy
- **Backend Unit & Integration Tests**:
  - Test CRUD endpoints cho Agent, ChatSession.
  - Test RAG Retrieval và LLM Integration (Sử dụng Mock cho LLM Call để chạy độc lập không tốn API key).
  - File test đặt tại: `backend/tests/services/test_agent_service.py` và `backend/tests/api/test_agent_api.py`.
- **Frontend Unit Tests**:
  - Viết test cơ bản cho `agent.service.ts` và `chat.service.ts`.

---

## Boundaries
- **Always do**:
  - Kiểm tra phân quyền: Chỉ Owner/Admin mới được tạo/sửa/xóa Agent. Members chỉ được phép chat.
  - Đảm bảo tìm kiếm tri thức luôn giới hạn trong phạm vi `workspace_id` hiện tại để tránh rò rỉ dữ liệu giữa các tenants (Multi-tenancy isolation).
- **Ask first**:
  - Thay đổi cấu trúc schema của các bảng đang có sẵn.
- **Never do**:
  - Lưu cứng API key hoặc Token trong code.
  - Cho phép truy cập dữ liệu RAG chéo workspace.

---

## Success Criteria
1. Người dùng có thể tạo một Agent mới bằng cách đặt tên, system prompt và cấu hình model Gemini.
2. Người dùng có thể mở giao diện chat của Agent đó, gửi câu hỏi và nhận câu trả lời stream từng chữ thời gian thực (tokens streaming) qua SSE.
3. Câu trả lời hiển thị chính xác các nguồn tài liệu được trích dẫn (ví dụ: `[Tên tài liệu] Trang X` hoặc `Citations`).
4. Khi người dùng tải lại trang chat, lịch sử hội thoại trước đó vẫn được khôi phục đầy đủ và hiển thị đúng thứ tự thời gian.
5. Kiểm thử backend đạt độ bao phủ >75%.
