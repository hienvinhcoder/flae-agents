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

Sử dụng các thông tin tham khảo dưới đây trích xuất từ tài liệu lưu trữ để trả lời câu hỏi của người dùng.
Nếu câu trả lời không có trong tài liệu tham khảo, hãy nói rõ rằng bạn không biết dựa trên thông tin hiện có, tuyệt đối không tự bịa ra câu trả lời.
Hãy trả lời một cách tự nhiên, chính xác và sử dụng Tiếng Việt làm ngôn ngữ chính.

TÀI LIỆU THAM KHẢO:
{formatted_context}"""

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
