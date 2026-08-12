"""References-only activities for the canonical base-ingestion workflow."""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from hashlib import sha256
from typing import TypeVar
from urllib.parse import unquote, urlsplit

from temporalio import activity
from temporalio.exceptions import ApplicationError

from app.core.config import settings
from app.core.exceptions import InvalidArgumentError
from app.db.database import AsyncSessionLocal
from app.db.rag_db import rag_db_manager
from app.schemas.ingestion import (
    BaseStagePlan,
    DocumentIngestionStatusInput,
    PrepareBaseStageInput,
    PublishBaseInput,
    PublishBaseResult,
    StageBatchResult,
    StageEmbeddingInput,
)
from app.services.gcs_storage_srv import GCSStorageService
from app.services.knowalge_base.chunking_service import ChunkingService
from app.services.knowalge_base.ingestion_service import IngestionService
from app.services.knowalge_base.parser_service import ParserService
from app.services.knowalge_base.publish_service import BasePublishService
from app.services.knowalge_base.staging_service import BaseStagingService


HEARTBEAT_INTERVAL_SECONDS = 10.0

R = TypeVar("R")


async def _run_sync_with_heartbeats(
    function: Callable[..., R],
    *args: object,
    heartbeat_details: object,
) -> R:
    task = asyncio.create_task(asyncio.to_thread(function, *args))
    while True:
        try:
            return await asyncio.wait_for(
                asyncio.shield(task), timeout=HEARTBEAT_INTERVAL_SECONDS
            )
        except TimeoutError:
            if task.done():
                return task.result()
            activity.heartbeat(heartbeat_details)


@activity.defn
async def prepare_base_stage_activity(
    command: PrepareBaseStageInput,
) -> BaseStagePlan:
    """Download, verify, parse, chunk, and persist references-only stage output."""
    try:
        activity.heartbeat({"stage": "download", "completed": 0})
        gcs_path = _validated_gcs_path(command.source.source_uri)
        content = await _run_sync_with_heartbeats(
            GCSStorageService.download_file_sync,
            gcs_path,
            heartbeat_details={"stage": "download", "completed": 0},
        )
        actual_checksum = "sha256:" + sha256(content).hexdigest()
        if actual_checksum != command.source.content_checksum:
            raise InvalidArgumentError(
                "Source content checksum does not match reference."
            )

        activity.heartbeat({"stage": "parse", "completed": 0})
        if gcs_path.lower().endswith(".pdf"):
            parsed_text = await _run_sync_with_heartbeats(
                ParserService.convert_pdf_to_markdown,
                content,
                gcs_path.rsplit("/", 1)[-1],
                heartbeat_details={"stage": "parse", "completed": 0},
            )
        else:
            parsed_text = content.decode("utf-8", errors="strict")
        chunks = await _run_sync_with_heartbeats(
            ChunkingService.chunk_document,
            parsed_text,
            command.source.content_checksum,
            heartbeat_details={"stage": "chunk", "completed": 0},
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
    embeddings, _tokens = await _run_sync_with_heartbeats(
        IngestionService.generate_embeddings,
        [item.text for item in items],
        "chunks",
        0,
        heartbeat_details={
            "stage": "embed",
            "batch_id": command.batch.batch_id,
            "completed": 0,
            "total": len(items),
        },
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
async def update_document_status_activity(
    command: DocumentIngestionStatusInput,
) -> None:
    """Synchronize compact ingestion lifecycle state to core document metadata."""
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
        raise InvalidArgumentError(
            "Source reference targets an unauthorized GCS bucket."
        )
    path = unquote(parsed.path).lstrip("/")
    if not path or path.startswith("../") or "/../" in path:
        raise InvalidArgumentError("Source reference has an invalid object path.")
    return path
