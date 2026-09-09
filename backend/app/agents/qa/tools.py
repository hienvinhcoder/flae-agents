from uuid import UUID

from langchain_core.tools import tool
from langchain_core.runnables import RunnableConfig
from typing_extensions import TypedDict

from app.services.knowledge.retrieval.retriever import RetrieverService
from app.services.knowledge.discovery.domains import DomainService
from app.services.knowledge.discovery.topics import TopicService
from app.core.logger import get_logger

logger = get_logger(__name__)


class KnowledgeCitation(TypedDict):
    source_document: str
    content: str
    score: float | None


class KnowledgeToolResult(TypedDict):
    context: str
    citations: list[KnowledgeCitation]


def _get_workspace_id(config: RunnableConfig) -> str | None:
    configurable = config.get("configurable")
    if not isinstance(configurable, dict):
        return None
    return configurable.get("workspace_id")


@tool
async def search_knowledge(query: str, config: RunnableConfig) -> KnowledgeToolResult:
    """
    Tìm kiếm ngữ nghĩa trong Knowledge Base. Dùng cho câu hỏi cụ thể,
    cần tra cứu trực tiếp thông tin từ tài liệu đã tải lên.
    """
    workspace_id = _get_workspace_id(config)
    if not workspace_id:
        return {"context": "", "citations": []}

    try:
        results, _ = await RetrieverService.retrieve(
            workspace_id=workspace_id,
            query=query,
            top_k_chunks=5,
            top_k_paths=5,
        )

        citations: list[KnowledgeCitation] = []
        context_parts = []

        for idx, chunk in enumerate(results.get("top_chunks", [])):
            content = chunk.get("content", "")
            source = chunk.get("source_document", "Tài liệu không tên")
            citations.append({"source_document": source, "content": content,
                              "score": chunk.get("score")})
            context_parts.append(f"[{idx+1}] Nguồn: {source}\n{content}")

        paths = results.get("top_paths", [])
        if paths:
            context_parts.append("\n--- ĐƯỜNG ĐI ĐỒ THỊ ---")
            for p in paths:
                context_parts.append(p.get("path_readable", ""))

        return {"context": "\n\n".join(context_parts), "citations": citations}
    except Exception:
        logger.error("search_knowledge failed")
        return {"context": "", "citations": []}


@tool
async def list_domains(config: RunnableConfig) -> dict:
    """
    Liệt kê toàn bộ domains (chương/chủ đề lớn) trong Knowledge Base.
    Dùng khi câu hỏi mơ hồ để khám phá phạm vi kiến thức có sẵn.
    """
    workspace_id = _get_workspace_id(config)
    if not workspace_id:
        return {"domains": []}

    try:
        page = await DomainService.list_domains(workspace_id=workspace_id, limit=50)
        return {"domains": page.get("items", [])}
    except Exception:
        logger.error("list_domains failed")
        return {"domains": []}


@tool
async def get_domain_topics(domain_id: str, config: RunnableConfig) -> dict:
    """
    Liệt kê các topics (mục nhỏ) trong một domain (chương).
    Dùng để thu hẹp phạm vi sau khi đã xác định domain quan tâm.
    """
    workspace_id = _get_workspace_id(config)
    if not workspace_id:
        return {"domain": None, "topics": []}

    try:
        detail = await DomainService.get_domain(
            workspace_id=workspace_id, domain_id=domain_id
        )
        return {"domain": detail, "topics": detail.get("topics", []) if detail else []}
    except Exception:
        logger.error("get_domain_topics failed")
        return {"domain": None, "topics": []}


@tool
async def get_topic_detail(topic_id: str, config: RunnableConfig) -> dict:
    """
    Xem chi tiết một topic: summary, entities, chunks liên kết.
    Dùng để lấy thông tin cụ thể về một chủ đề đã xác định.
    """
    workspace_id = _get_workspace_id(config)
    if not workspace_id:
        return {"topic": None}

    try:
        from app.db.database import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            detail = await TopicService.get_topic_detail(
                workspace_id=workspace_id,
                topic_id_or_slug=topic_id,
                main_db=db,
            )
        return {"topic": detail}
    except Exception:
        logger.error("get_topic_detail failed")
        return {"topic": None}
