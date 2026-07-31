"""
Temporal Activities cho Knowledge Base Ingestion Pipeline.
Mỗi activity là một bước riêng biệt trong pipeline TGS-RAG.
"""
import asyncio
import uuid
from typing import Optional, Any

from temporalio import activity

from app.core.config import settings
from app.core.logger import get_logger
from app.db.database import AsyncSessionLocal
from app.services.knowalge_base.ingestion_service import IngestionService
from app.services.knowalge_base.parser_service import ParserService

logger = get_logger(__name__)


# ── Dataclass-like dicts (Temporal serialize qua JSON) ───────────


@activity.defn
async def update_document_status(params: dict) -> None:
    """Cập nhật status document trong flae_db."""
    doc_id = uuid.UUID(params["document_id"])
    status = params["status"]
    error_message = params.get("error_message")
    metrics = params.get("metrics", {})

    async with AsyncSessionLocal() as db:
        from app.services.knowledge_base_srv import KnowledgeBaseService
        await KnowledgeBaseService.update_document_status_db(
            db=db,
            doc_id=doc_id,
            status=status,
            error_message=error_message,
            metrics=metrics,
        )



@activity.defn
async def prepare_document_content(params: dict) -> str:
    """
    Chuẩn bị nội dung text từ document:
    - File upload: download từ GCS + convert PDF nếu cần
    - Manual input: trả về content_text trực tiếp
    """
    doc_type = params["document_type"]
    gcs_path = params.get("gcs_path")
    content_text = params.get("content_text")
    file_name = params.get("file_name", "document")

    if doc_type == "manual_input":
        if not content_text:
            raise ValueError("Manual input document has no content_text")
        return content_text

    if not gcs_path:
        raise ValueError("File-based document has no gcs_path")

    # Download from GCS
    from app.services.gcs_storage_srv import GCSStorageService

    file_content = await asyncio.to_thread(GCSStorageService.download_file_sync, gcs_path)

    if doc_type == "pdf":
        text = await asyncio.to_thread(
            ParserService.convert_pdf_to_markdown, file_content, file_name
        )
    else:
        # markdown hoặc text: decode trực tiếp
        text = file_content.decode("utf-8", errors="replace")

    if not text or not text.strip():
        raise ValueError(f"Document '{file_name}' trích xuất ra văn bản rỗng")

    logger.info(
        f"Content prepared: {file_name}, type={doc_type}, "
        f"{len(text)} chars"
    )
    return text


@activity.defn
async def chunk_document_activity(params: dict) -> list[dict]:
    """Chia text thành chunks."""
    from app.services.knowalge_base.chunking_service import ChunkingService

    raw_text = params["raw_text"]
    doc_hash = params["doc_hash"]
    strategy = params.get("strategy", settings.RAG_CHUNKING_STRATEGY)

    # Chọn default size/overlap từ settings tương ứng với chiến lược
    default_size = settings.RAG_SEMANTIC_TARGET if strategy == "semantic" else settings.RAG_FIXED_SIZE
    default_overlap = settings.RAG_SEMANTIC_OVERLAP if strategy == "semantic" else settings.RAG_FIXED_OVERLAP

    chunk_size = params.get("chunk_size", default_size)
    chunk_overlap = params.get("chunk_overlap", default_overlap)

    chunks = await asyncio.to_thread(
        ChunkingService.chunk_document,
        text=raw_text,
        file_hash=doc_hash,
        strategy=strategy,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )

    logger.info(f"Chunking complete: {len(chunks)} chunks")
    return chunks


@activity.defn
async def generate_embeddings_activity(params: dict) -> list[dict]:
    """Tạo embeddings cho batch chunks."""
    chunks = params["chunks"]
    embedded_chunks, tokens = await asyncio.to_thread(
        IngestionService.generate_chunk_embeddings, chunks
    )
    valid_count = sum(1 for c in embedded_chunks if c.get("embedding"))
    logger.info(
        f"Embeddings generated: {valid_count}/{len(chunks)} chunks, "
        f"{tokens} tokens"
    )
    return embedded_chunks


@activity.defn
async def extract_entities_activity(params: dict) -> dict:
    """Trích xuất entities & relations từ batch chunks."""
    chunks = params["chunks"]
    workspace_id = params["workspace_id"]
    entities, relations, tokens = await IngestionService.extract_entities_from_chunks(chunks, workspace_id)
    logger.info(
        f"Extraction complete: {len(entities)} entities, "
        f"{len(relations)} relations, {tokens} tokens"
    )
    return {
        "entities": entities,
        "relations": relations,
        "chunks": chunks,
        "tokens_used": tokens,
    }


@activity.defn
async def fuse_and_save_activity(params: dict) -> dict:
    """
    Fusion & lưu chunks/entities/relations vào rag_db.
    Adapt từ demo-app fusion.py cho multi-tenant.
    """
    workspace_id = params["workspace_id"]
    chunks = params["chunks"]
    entities = params.get("entities", [])
    relations = params.get("relations", [])
    source_doc_id = params["source_doc_id"]

    res = await asyncio.to_thread(
        IngestionService.fuse_and_save,
        workspace_id=workspace_id,
        chunks=chunks,
        entities=entities,
        relations=relations,
        source_doc_id=source_doc_id,
    )
    return res


@activity.defn
async def finalize_ingestion(params: dict) -> None:
    """Cập nhật metrics cuối cùng và đánh dấu completed."""
    doc_id = uuid.UUID(params["document_id"])
    metrics = params.get("metrics", {})

    async with AsyncSessionLocal() as db:
        from app.services.knowledge_base_srv import KnowledgeBaseService
        await KnowledgeBaseService.finalize_document_ingestion_db(
            db=db,
            doc_id=doc_id,
            metrics=metrics,
        )


@activity.defn
async def trigger_topic_updates_activity(params: dict) -> None:
    """Kích hoạt TopicUpdateWorkflow cho các topic bị ảnh hưởng."""
    workspace_id = params["workspace_id"]
    affected_topic_ids = params.get("affected_topic_ids", [])

    if not affected_topic_ids:
        return

    from app.services.srv_topic import TopicService
    await TopicService.trigger_topic_updates_via_temporal(workspace_id, affected_topic_ids)
