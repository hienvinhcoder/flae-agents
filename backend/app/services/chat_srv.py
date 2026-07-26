import json
from typing import AsyncGenerator
import uuid
from langchain_core.messages import HumanMessage

from app.agents.qa.graph import get_qa_agent_graph
from app.db.checkpoint import checkpointer
from app.db.database import AsyncSessionLocal
from app.services.agent_srv import AgentService
from app.core.logger import get_logger

logger = get_logger(__name__)


class ChatService:
    """
    Service xử lý kết nối chat RAG, chạy LangGraph và stream SSE.
    """

    @staticmethod
    async def stream_chat(
        workspace_id: uuid.UUID,
        agent_id: uuid.UUID,
        session_id: uuid.UUID,
        user_uid: str,
        user_message: str,
    ) -> AsyncGenerator[str, None]:
        """
        Stream tin nhắn hội thoại sử dụng Server-Sent Events (SSE).
        """
        # 1. Khởi tạo DB Session riêng cho luồng generator chạy nền
        async with AsyncSessionLocal() as db:
            # Lấy thông tin Agent
            agent = await AgentService.get_agent(db, workspace_id, agent_id)
            if not agent:
                yield f"data: {json.dumps({'type': 'error', 'detail': 'Agent không tồn tại'})}\n\n"
                return

            # Lấy thông tin Chat Session
            session = await AgentService.get_chat_session(db, workspace_id, agent_id, session_id, user_uid)
            if not session:
                yield f"data: {json.dumps({'type': 'error', 'detail': 'Session không tồn tại'})}\n\n"
                return

            # 2. Lưu tin nhắn của User vào DB ngay lập tức
            await AgentService.create_message(
                db=db,
                session_id=session_id,
                role="user",
                content=user_message,
                citations=None,
                created_by=user_uid
            )

            # 3. Biên dịch LangGraph với Postgres Checkpointer
            graph = get_qa_agent_graph(
                checkpointer=checkpointer,
                model_name=agent.model_name,
                temperature=agent.temperature,
                system_prompt=agent.system_prompt
            )

            # Thiết lập input cho State
            inputs = {
                "messages": [HumanMessage(content=user_message)]
            }

            # Cấu hình config cho checkpointer với thread_id là session_id và workspace_id cho tools
            config = {
                "configurable": {
                    "thread_id": str(session_id),
                    "workspace_id": str(workspace_id),
                }
            }

            full_response = ""
            citations = []

            try:
                # Chạy stream các sự kiện của graph (sử dụng astream_events v2)
                async for event in graph.astream_events(inputs, config, version="v2"):
                    kind = event.get("event")

                    # Sự kiện khi tool query_knowledge_base kết thúc
                    if kind == "on_tool_end" and event.get("name") == "query_knowledge_base":
                        output = event.get("data", {}).get("output", {})
                        if isinstance(output, dict):
                            citations = output.get("citations", [])
                        elif isinstance(output, str):
                            try:
                                parsed = json.loads(output)
                                citations = parsed.get("citations", [])
                            except Exception:
                                citations = []
                        yield f"data: {json.dumps({'type': 'citations', 'citations': citations})}\n\n"

                    # Sự kiện khi model sinh token (streaming)
                    elif kind == "on_chat_model_stream":
                        node_name = event.get("metadata", {}).get("langgraph_node")
                        if node_name in ("model", "generate_response"):
                            chunk = event.get("data", {}).get("chunk")
                            if chunk:
                                token = chunk.content
                                if token:
                                    full_response += token
                                    yield f"data: {json.dumps({'type': 'token', 'text': token})}\n\n"


                # 4. Khi kết thúc stream thành công, lưu câu trả lời của Assistant vào DB
                if full_response:
                    await AgentService.create_message(
                        db=db,
                        session_id=session_id,
                        role="assistant",
                        content=full_response,
                        citations=citations,
                        created_by="assistant"
                    )

                # Gửi sự kiện done
                yield f"data: {json.dumps({'type': 'done'})}\n\n"

            except Exception as e:
                logger.error(f"Lỗi khi chạy LangGraph stream: {e}", exc_info=True)
                yield f"data: {json.dumps({'type': 'error', 'detail': str(e)})}\n\n"
