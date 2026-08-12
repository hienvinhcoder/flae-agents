from typing_extensions import TypedDict
from langchain_core.tools import tool
from langchain_core.runnables import RunnableConfig
from app.services.knowledge.retrieval.retriever import RetrieverService
from app.core.logger import get_logger

logger = get_logger(__name__)


class KnowledgeCitation(TypedDict):
    source_document: str
    content: str
    score: float | None


class KnowledgeToolResult(TypedDict):
    context: str
    citations: list[KnowledgeCitation]

@tool
async def query_knowledge_base(
    query: str, config: RunnableConfig
) -> KnowledgeToolResult:
    """
    Truy vấn cơ sở tri thức (Knowledge Base) để tìm kiếm các thông tin và tài liệu liên quan đến câu hỏi.
    Chỉ sử dụng khi người dùng hỏi các thông tin cần tra cứu dữ liệu từ tài liệu đã tải lên.

    Args:
        query: Câu truy vấn để tìm kiếm thông tin trong cơ sở tri thức.
    """
    workspace_id = config.get("configurable", {}).get("workspace_id")
    if not workspace_id:
        logger.warning("Không tìm thấy workspace_id trong config.")
        return {"context": "", "citations": []}

    logger.info(f"Đang truy vấn cơ sở tri thức trong workspace {workspace_id} với query: '{query}'")
    try:
        results, _ = await RetrieverService.retrieve(
            workspace_id=workspace_id,
            query=query,
            top_k_chunks=5
        )

        chunks = results.get("top_chunks", [])

        citations: list[KnowledgeCitation] = []
        context_parts = []
        for idx, c in enumerate(chunks):
            doc_title = c.get("source_document") or "Tài liệu không tên"
            content = c.get("content") or ""
            score = float(c.get("score")) if c.get("score") is not None else None

            citations.append({
                "source_document": doc_title,
                "content": content,
                "score": score
            })

            context_parts.append(f"[{idx+1}] Tài liệu: {doc_title}\nNội dung: {content}")

        context_str = "\n\n".join(context_parts)
        return {
            "context": context_str,
            "citations": citations
        }
    except Exception as e:
        logger.error(f"Lỗi khi truy vấn cơ sở tri thức: {e}", exc_info=True)
        return {"context": "Không thể truy xuất tài liệu lúc này.", "citations": []}
