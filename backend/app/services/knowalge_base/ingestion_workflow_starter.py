"""Feature-flagged dispatcher for compatible V1 and references-only V2 starts."""

from app.core.config import settings
from app.core.exceptions import InvalidArgumentError
from app.core.logger import get_logger
from app.core.temporal import get_temporal_client
from app.db.rag_db import rag_db_manager
from app.models.knowledge_base import KnowledgeDocument
from app.schemas.ingestion_v2 import (
    IngestionV2BootstrapInput,
    IngestionWorkflowV2Input,
)
from app.services.knowalge_base.ingestion_v2_start_service import (
    IngestionV2StartService,
)


logger = get_logger(__name__)
V1_TASK_QUEUE = "flae-default-queue"


async def start_ingestion_workflow(doc: KnowledgeDocument) -> str:
    if settings.INGESTION_V2_ENABLED and doc.gcs_path and doc.content_checksum:
        return await _start_v2(doc)
    if settings.INGESTION_V2_ENABLED:
        logger.warning(
            "Falling back to ingestion V1 for legacy document %s without a "
            "GCS checksum reference",
            doc.id,
        )
    return await _start_v1(doc)


async def _start_v2(doc: KnowledgeDocument) -> str:
    if doc.gcs_path is None or doc.content_checksum is None:
        raise InvalidArgumentError("Ingestion V2 requires a checksummed GCS reference.")
    from app.temporal.workflows.ingestion_v2 import IngestionWorkflowV2

    source = await IngestionV2StartService(rag_db_manager).prepare_reference(
        IngestionV2BootstrapInput(
            workspace_id=doc.workspace_id,
            document_id=doc.id,
            gcs_path=doc.gcs_path,
            source_name=doc.file_name or doc.title,
            source_modified_at=doc.updated_at,
            content_checksum=doc.content_checksum,
        )
    )
    workflow_id = f"kb-ingest-v2-{source.ingestion_run_id}"
    client = await get_temporal_client()
    await client.start_workflow(
        IngestionWorkflowV2.run,
        IngestionWorkflowV2Input(
            source=source,
            max_parallel_batches=min(
                settings.INGESTION_V2_MAX_PARALLEL_BATCHES, 16
            ),
        ),
        id=workflow_id,
        task_queue=settings.TEMPORAL_INGESTION_TASK_QUEUE,
    )
    logger.info("Started ingestion V2 workflow: %s", workflow_id)
    return workflow_id


async def _start_v1(doc: KnowledgeDocument) -> str:
    from app.temporal.workflows.ingestion import DocumentIngestionWorkflow

    workflow_id = f"kb-ingest-{doc.id}"
    params = {
        "document_id": str(doc.id),
        "workspace_id": str(doc.workspace_id),
        "document_type": doc.document_type.value,
        "gcs_path": doc.gcs_path,
        "content_text": doc.content_text,
        "file_name": doc.file_name or f"document-{doc.id}",
    }
    client = await get_temporal_client()
    await client.start_workflow(
        DocumentIngestionWorkflow.run,
        params,
        id=workflow_id,
        task_queue=V1_TASK_QUEUE,
    )
    logger.info("Started ingestion V1 workflow: %s", workflow_id)
    return workflow_id
