from typing import AsyncGenerator
import uuid
from langchain_core.messages import HumanMessage

from app.agents.qa.graph import get_qa_agent_graph
from app.db.checkpoint import checkpointer
from app.db.database import AsyncSessionLocal
from app.services.agents.service import AgentService
from app.services.chat.stream_protocol import (
    citations_from_tool_output,
    sse_event,
    text_from_model_chunk,
)
from app.core.logger import get_logger

logger = get_logger(__name__)

_STREAM_NODES = frozenset({"agent", "generate_response", "model"})


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
        async with AsyncSessionLocal() as db:
            agent = await AgentService.get_agent(db, workspace_id, agent_id)
            if not agent:
                yield sse_event({"type": "error", "detail": "Agent không tồn tại"})
                return

            session = await AgentService.get_chat_session(
                db, workspace_id, agent_id, session_id, user_uid
            )
            if not session:
                yield sse_event({"type": "error", "detail": "Session không tồn tại"})
                return

            await AgentService.create_message(
                db=db,
                session_id=session_id,
                role="user",
                content=user_message,
                citations=None,
                created_by=user_uid,
            )

            graph = get_qa_agent_graph(
                checkpointer=checkpointer,
                model_name=agent.model_name,
                temperature=agent.temperature,
                system_prompt=agent.system_prompt,
            )
            inputs = {"messages": [HumanMessage(content=user_message)]}
            config = {
                "configurable": {
                    "thread_id": str(session_id),
                    "workspace_id": str(workspace_id),
                }
            }

            full_response = ""
            citations: list[dict[str, object]] = []

            try:
                async for event in graph.astream_events(inputs, config, version="v2"):
                    kind = event.get("event")
                    name = event.get("name")

                    if kind == "on_tool_start" and isinstance(name, str) and name:
                        yield sse_event({"type": "tool", "phase": "start", "name": name})
                        continue

                    if kind == "on_tool_end" and isinstance(name, str) and name:
                        yield sse_event({"type": "tool", "phase": "end", "name": name})
                        tool_citations = citations_from_tool_output(
                            event.get("data", {}).get("output")
                        )
                        if tool_citations:
                            citations = tool_citations
                            yield sse_event({"type": "citations", "citations": citations})
                        continue

                    if kind != "on_chat_model_stream":
                        continue
                    node_name = event.get("metadata", {}).get("langgraph_node")
                    if node_name not in _STREAM_NODES:
                        continue
                    token = text_from_model_chunk(event.get("data", {}).get("chunk"))
                    if not token:
                        continue
                    full_response += token
                    yield sse_event({"type": "token", "text": token})

                if full_response:
                    await AgentService.create_message(
                        db=db,
                        session_id=session_id,
                        role="assistant",
                        content=full_response,
                        citations=citations or None,
                        created_by="assistant",
                    )

                yield sse_event({"type": "done"})

            except Exception as error:
                logger.error("Lỗi khi chạy LangGraph stream: %s", error, exc_info=True)
                yield sse_event({"type": "error", "detail": "Không thể xử lý hội thoại."})
