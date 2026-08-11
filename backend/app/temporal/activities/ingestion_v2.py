"""References-only activities for the V2 base-ingestion workflow."""

from __future__ import annotations

import asyncio
from hashlib import sha256
from urllib.parse import unquote, urlsplit

from temporalio import activity
from temporalio.exceptions import ApplicationError

from app.core.config import settings
from app.core.exceptions import InvalidArgumentError
from app.db.database import AsyncSessionLocal
from app.db.rag_db import rag_db_manager
from app.schemas.ingestion import (
    BaseStagePlan,
    PrepareBaseStageInput,
    StageBatchResult,
    StageEmbeddingInput,
    PublishBaseInput,
    PublishBaseResult,
    DocumentIngestionStatusInput,
)
from app.services.gcs_storage_srv import GCSStorageService
from app.services.knowalge_base.chunking_service import ChunkingService
from app.services.knowalge_base.ingestion_service import IngestionService
from app.services.knowalge_base.parser_service import ParserService
from app.services.knowalge_base.publish_service import BasePublishService
from app.services.knowalge_base.staging_service import BaseStagingService


@activity.defn
async def prepare_base_stage_activity(
    command: PrepareBaseStageInput,
) -> BaseStagePlan:
    """Download, verify, parse, chunk, and persist references-only stage output."""
    try:
        activity.heartbeat({"stage": "download", "completed": 0})
        gcs_path = _validated_gcs_path(command.source.source_uri)
        content = await asyncio.to_thread(
            GCSStorageService.download_file_sync, gcs_path
        )
        actual_checksum = "sha256:" + sha256(content).hexdigest()
        if actual_checksum != command.source.content_checksum:
            raise InvalidArgumentError("Source content checksum does not match reference.")

        activity.heartbeat({"stage": "parse", "completed": 0})
        if gcs_path.lower().endswith(".pdf"):
            parsed_text = await asyncio.to_thread(
                ParserService.convert_pdf_to_markdown,
                content,
                gcs_path.rsplit("/", 1)[-1],
            )
        else:
            parsed_text = content.decode("utf-8", errors="strict")
        chunks = await asyncio.to_thread(
            ChunkingService.chunk_document_v2,
            parsed_text,
            command.source.content_checksum,
        )
        activity.heartbeat({"stage": "persist", "completed": len(chunks)})
        return await BaseStagingService(rag_db_manager).stage_parsed_chunks(
            command, chunks
        )
    except (InvalidArgumentError, UnicodeDecodeError, ValueError) as error:
        raise ApplicationError(
            str(error), type="INVALID_INGESTION_INPUT", non_retryable=True
        ) from error


@activity.defn
async def stage_embedding_batch_activity(
    command: StageEmbeddingInput,
) -> StageBatchResult:
    """Embed one staged batch once; Temporal owns transient retries."""
    service = BaseStagingService(rag_db_manager)
    items = await service.load_embedding_batch(command.batch)
    activity.heartbeat(
        {
            "stage": "embed",
            "batch_id": command.batch.batch_id,
            "completed": 0,
            "total": len(items),
        }
    )
    embeddings, _tokens = await asyncio.to_thread(
        IngestionService.generate_embeddings,
        [item.text for item in items],
        "chunks",
        0,
    )
    if any(embedding is None for embedding in embeddings):
        raise RuntimeError("Embedding provider returned an incomplete batch.")
    typed_embeddings = tuple(
        tuple(float(value) for value in embedding or ()) for embedding in embeddings
    )
    activity.heartbeat(
        {
            "stage": "persist_embeddings",
            "batch_id": command.batch.batch_id,
            "completed": len(items),
            "total": len(items),
        }
    )
    return await service.stage_embeddings(command, typed_embeddings)


@activity.defn
async def publish_base_activity(command: PublishBaseInput) -> PublishBaseResult:
    """Validate manifests and atomically expose one complete base revision."""
    activity.heartbeat({"stage": "publish", "completed": 0})
    try:
        result = await BasePublishService(rag_db_manager).publish(command)
    except InvalidArgumentError as error:
        raise ApplicationError(
            str(error), type="INVALID_PUBLISH_INPUT", non_retryable=True
        ) from error
    activity.heartbeat({"stage": "publish", "completed": 1})
    return result


@activity.defn
async def update_v2_document_status_activity(
    command: DocumentIngestionStatusInput,
) -> None:
    """Synchronize compact V2 lifecycle state to core document metadata."""
    from app.services.knowledge_base_srv import KnowledgeBaseService

    async with AsyncSessionLocal() as session:
        if command.status == "completed":
            await KnowledgeBaseService.finalize_document_ingestion_db(
                db=session,
                doc_id=command.document_id,
                metrics={
                    "total_chunks": command.chunk_count or 0,
                    "total_entities": 0,
                    "total_relations": 0,
                    "token_usage": {},
                    "processing_time": 0.0,
                },
            )
            return
        await KnowledgeBaseService.update_document_status_db(
            db=session,
            doc_id=command.document_id,
            status=command.status,
            error_message=command.error_code,
        )


def _validated_gcs_path(uri: str) -> str:
    parsed = urlsplit(uri)
    if parsed.scheme != "gcs" or parsed.netloc != settings.GCS_BUCKET_NAME:
        raise InvalidArgumentError("Source reference targets an unauthorized GCS bucket.")
    path = unquote(parsed.path).lstrip("/")
    if not path or path.startswith("../") or "/../" in path:
        raise InvalidArgumentError("Source reference has an invalid object path.")
    return path
