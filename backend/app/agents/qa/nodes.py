from langchain_core.messages import SystemMessage, AIMessage, HumanMessage
from app.agents.qa.state import QAAgentState
from app.agents.shared.models import get_gemini_llm
from app.services.knowledge.retrieval.retriever import RetrieverService
from app.core.logger import get_logger

logger = get_logger(__name__)


async def retrieve_docs(state: QAAgentState) -> dict:
    """
    Node truy xuất tài liệu từ Knowledge Base dựa trên câu hỏi của User.
    """
    # Lấy câu hỏi cuối cùng của User
    user_messages = [msg for msg in state["messages"] if isinstance(msg, HumanMessage) or msg.type == "human"]
    if not user_messages:
        logger.warning("Không tìm thấy tin nhắn HumanMessage trong state.")
        return {"context": [], "citations": []}

    query = user_messages[-1].content
    workspace_id = state["workspace_id"]

    logger.info(f"Đang tìm kiếm tài liệu trong workspace {workspace_id} cho câu hỏi: '{query}'")

    try:
        # Gọi RetrieverService.retrieve
        results, _ = await RetrieverService.retrieve(
            workspace_id=workspace_id,
            query=str(query),
            top_k_chunks=5
        )

        chunks = results.get("top_chunks", [])

        # Tạo danh sách nguồn trích dẫn
        citations = []
        for c in chunks:
            citations.append({
                "source_document": c.get("source_document") or "Tài liệu không tên",
                "content": c.get("content") or "",
                "score": float(c.get("score")) if c.get("score") is not None else None
            })

        return {
            "context": chunks,
            "citations": citations
        }
    except Exception as e:
        logger.error(f"Lỗi khi retrieve tài liệu trong LangGraph node: {e}", exc_info=True)
        return {"context": [], "citations": []}


async def generate_response(state: QAAgentState) -> dict:
    """
    Node sinh câu trả lời bằng Gemini dựa trên Context tài liệu đã trích dẫn.
    """
    context_chunks = state.get("context", [])
    system_prompt = state.get("system_prompt", "Bạn là một AI Assistant thông minh.")

    # Định dạng context tri thức để đưa vào prompt
    formatted_context = ""
    if context_chunks:
        for idx, c in enumerate(context_chunks):
            doc_title = c.get("source_document") or "Tài liệu không tên"
            content = c.get("content") or ""
            formatted_context += f"[{idx+1}] Tài liệu: {doc_title}\nNội dung: {content}\n\n"
    else:
        formatted_context = "Không tìm thấy tài liệu phù hợp trong cơ sở tri thức.\n"

    # Xây dựng System Instruction kết hợp Context
    system_instruction = f"""{system_prompt}

Bạn có quyền truy cập hệ thống Knowledge Base với 4 công cụ:
1. search_knowledge: tìm kiếm ngữ nghĩa — dùng khi câu hỏi cụ thể.
2. list_domains: liệt kê các domains (chương/chủ đề lớn) — dùng để bắt đầu khi câu hỏi mơ hồ.
3. get_domain_topics: xem topics trong một domain — dùng để thu hẹp phạm vi.
4. get_topic_detail: xem chi tiết một topic — dùng để lấy thông tin cụ thể.

Chiến lược:
- Nếu câu hỏi cụ thể → dùng search_knowledge trực tiếp.
- Nếu câu hỏi mơ hồ hoặc không rõ ràng → bắt đầu bằng list_domains, rồi get_domain_topics, rồi search_knowledge với từ khóa cụ thể hơn.
- Kết quả từ nhiều công cụ có thể được kết hợp để tạo câu trả lời hoàn chỉnh.

Nếu không tìm thấy thông tin, hãy nói rõ bạn không biết, không tự bịa.
Trả lời bằng tiếng Việt."""

    # Gửi toàn bộ lịch sử hội thoại + System message dẫn hướng
    messages_for_llm = [SystemMessage(content=system_instruction)] + list(state["messages"])

    # Khởi tạo LLM từ config
    llm = get_gemini_llm(
        model_name=state.get("model_name"),
        temperature=state.get("temperature", 0.2)
    )

    try:
        response = await llm.ainvoke(messages_for_llm)
        return {"messages": [response]}
    except Exception as e:
        logger.error(f"Lỗi khi gọi model LLM trong generate_response node: {e}", exc_info=True)
        return {"messages": [AIMessage(content="Xin lỗi, tôi đã gặp lỗi khi xử lý yêu cầu của bạn.")]}
