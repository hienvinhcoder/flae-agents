# Spec: AI Chat Mặc Định (Hỏi Đáp RAG Với Default QA Agent)

> [!IMPORTANT]
> **Historical implementation notes:** Architecture (including Angular and backend architecture), file paths, commands, and testing guidance in this document are historical and are superseded by [`docs/superpowers/specs/2026-07-22-angular-to-react-migration-design.md`](../superpowers/specs/2026-07-22-angular-to-react-migration-design.md). The product requirements described here remain valid.

## Objective
Xây dựng một trang AI Chat tập trung (tương tự ChatGPT, Claude Code) cho phép người dùng trong cùng một Workspace có thể trực tiếp hỏi đáp với AI Assistant mặc định mà không cần phải thực hiện bước tạo Agent mới từ trước.
- **Default QA Agent**: Mỗi Workspace sẽ có một AI Agent mặc định (Default Agent). Hệ thống sẽ tự động định danh/tạo thực thể này khi người dùng truy cập trang Chat hoặc thực hiện các hoạt động liên quan.
- **React Agent dựa trên LangGraph**: Agent mặc định sẽ sử dụng `create_agent` từ `langchain.agents` để tự động và linh hoạt quyết định khi nào cần truy vấn cơ sở tri thức (Knowledge Base) thông qua tool `query_knowledge_base`, thay vì bắt buộc chạy qua bước retrieve cứng nhắc như trước.
- **Trang Chat Chuyên Biệt**: Một trang chat chuyên dụng hiển thị danh sách các cuộc hội thoại (Sessions) ở thanh bên trái, và khung chat chính ở bên phải. Nút "New Chat" tạo session mới nhanh chóng.
- **Đánh dấu Discuss Later**: Chức năng CRUD Agent hiện tại sẽ được giữ nguyên (tạm ẩn hoặc không phát triển thêm) và sẽ thảo luận thiết kế nâng cao sau.

---

## Tech Stack
- **Backend**: FastAPI, SQLAlchemy (Async), Alembic, LangGraph v0.2+, LangChain Google GenAI (Gemini 2.5 Flash), LangChain Agents (`create_agent`).
- **Frontend**: Angular 18 (Standalone, Signals, RxJS, Server-Sent Events Client), Tailwind CSS, Lucide Icons.

---

## Commands
### Backend
- **Tạo Alembic Migration** (Thêm trường `is_default` vào bảng `agents`):
  ```bash
  cd backend
  uv run alembic revision --autogenerate -m "add_is_default_to_agents"
  ```
- **Chạy Migration**:
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
- **Chạy Angular Dev Server**: `npm run start` (hoặc qua `./start.sh` tự động)
- **Build Frontend**: `npm run build`
- **Lint Frontend**: `npm run lint`

---

## Project Structure
Dự án sẽ bổ sung/sửa đổi các file sau:

```text
backend/app/
├── models/
│   └── agent.py              [MODIFY]  ← Thêm cột `is_default` vào bảng `agents`
├── schemas/
│   └── sche_agent.py         [MODIFY]  ← Thêm thuộc tính `is_default` vào Pydantic schemas
├── services/
│   ├── agent_srv.py          [MODIFY]  ← Thêm hàm `get_or_create_default_agent` tự tạo agent mặc định
│   └── chat_srv.py           [MODIFY]  ← Tích hợp `create_agent` và parser event stream mới
├── agents/
│   └── qa/
│       ├── graph.py          [MODIFY]  ← Thiết lập đồ thị mới bằng `create_agent`
│       └── tools.py          [NEW]     ← Định nghĩa tool `query_knowledge_base`
└── api/v1/
    └── endpoints/
        └── agent.py          [MODIFY]  ← Thêm API endpoint `/default` để lấy thông tin Default Agent

frontend/src/app/
├── core/
│   └── layout/
│       └── admin-layout/
│           ├── admin-layout.component.ts [MODIFY] ← Cập nhật tiêu đề trang cho AI Chat
│           └── ui/
│               └── sidebar.component.ts  [MODIFY] ← Thêm menu item "AI Chat" lên trên đầu
├── features/
│   └── chat/                 [NEW]     ← Feature độc lập quản lý AI Chat mặc định
│       ├── chat.routes.ts    [NEW]     ← Khai báo routes cho feature chat (/dashboard/chat)
│       ├── pages/
│       │   └── chat-page/
│       │       └── chat-page.component.ts [NEW] ← Giao diện chat giống ChatGPT (tái sử dụng UI components từ agents)
│       └── services/
│           └── chat-page.service.ts [NEW] ← Service gọi API riêng cho trang Chat mặc định
```

---

## Code Style
Tuân thủ nghiêm ngặt các quy tắc trong [flae-code.md](file:///Users/nguyenhienvinh/projects/flae-agents/.agents/rules/flae-code.md):
- **Backend (FastAPI)**:
  - Cột `is_default` được khai báo bằng `Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)`.
  - API endpoint phải phân tách logic thông qua Service (`AgentService.get_or_create_default_agent`).
  - Strict Typing đầy đủ cho các hàm và API responses.
- **Frontend (Angular)**:
  - Sử dụng **Angular Signals** (`signal`, `computed`, `effect`) để quản lý các trạng thái: active session, sessions list, streaming state.
  - Tách biệt rõ ràng smart logic trong page component và dumb logic trong các components hiển thị tin nhắn.
  - Sử dụng Tailwind CSS với các tokens màu đã được định nghĩa tại [DESIGN.md](file:///Users/nguyenhienvinh/projects/flae-agents/DESIGN.md).

---

## Testing Strategy
- **Backend Unit & Integration Tests**:
  - Viết test để xác nhận `get_or_create_default_agent` tự động tạo Agent nếu chưa có, hoặc trả về Agent mặc định hiện tại.
  - Mock kết quả LLM và Tool để test luồng React Agent và kiểm tra xem tool `query_knowledge_base` được gọi khi cần thiết.
- **Frontend Verification**:
  - Đảm bảo khi bấm vào sidebar menu "AI Chat", người dùng được chuyển hướng đến `/dashboard/chat` và hiển thị danh sách session của Default Agent đúng cách.

---

## Boundaries
- **Always do**:
  - Đảm bảo tool `query_knowledge_base` chỉ tìm kiếm tài liệu thuộc phạm vi `workspace_id` của phiên hiện tại.
  - Kiểm tra xem người dùng có quyền truy cập vào Workspace trước khi cho phép tương tác với Default Agent và các Sessions của nó.
- **Ask first**:
  - Thêm bất kỳ thư viện bên ngoài nào chưa có sẵn trong `pyproject.toml` or `package.json`.
- **Never do**:
  - Cho phép người dùng chỉnh sửa cấu hình hệ thống hoặc System Prompt của Default Agent ngoại trừ admin/owner (để thảo luận sau).
  - Trả về thông tin lỗi kỹ thuật (stack trace) chi tiết trong API response.

---

## Success Criteria
1. Truy cập vào menu "AI Chat" trên giao diện sidebar dẫn tới `/dashboard/chat`, tự động load/tạo Default Agent cho Workspace hiện tại nếu chưa có.
2. Tự động load danh sách cuộc hội thoại cũ của Default Agent, hoặc hiển thị nút tạo cuộc hội thoại mới.
3. Chat với Default Agent sử dụng `create_agent` để sinh câu trả lời:
   - Khi hỏi các câu hỏi chung (ví dụ: "Chào bạn", "Bạn có khỏe không?"), agent trả lời trực tiếp mà không cần gọi tool truy vấn cơ sở tri thức.
   - Khi hỏi các câu hỏi cần dữ liệu tài liệu, agent quyết định gọi tool `query_knowledge_base`, trả về câu trả lời có chứa trích dẫn.
4. Lịch sử tin nhắn được lưu trữ đầy đủ vào DB, và hiển thị lại chính xác khi người dùng tải lại trang.

---

## Open Questions
1. Có nên hiển thị thông tin Default Agent trên danh sách "My Agent Team" hay không?
   - *Đề xuất:* Tạm thời không hiển thị Default Agent trong danh sách Agent Team để tránh gây nhầm lẫn, vì người dùng có thể vô tình xóa hoặc sửa Default Agent. Default Agent sẽ được quản lý ẩn dưới hệ thống.
2. Có nên cho phép người dùng chọn mô hình LLM hoặc cấu hình khác cho Default Agent không?
   - *Đề xuất:* Đối với Default Agent, giữ các thông số mặc định (Gemini 2.5 Flash, temperature = 0.2). Mọi tùy chỉnh sẽ được bàn bạc trong chức năng Create Agents nâng cao sau (Discuss Later).
