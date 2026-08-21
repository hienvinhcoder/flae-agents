"""Canonical references-only ingestion workflow starter."""

from typing import Protocol, cast

from temporalio.common import WorkflowIDConflictPolicy, WorkflowIDReusePolicy
from temporalio.exceptions import WorkflowAlreadyStartedError

from app.core.config import settings
from app.core.exceptions import InvalidArgumentError
from app.core.logger import get_logger
from app.core.temporal import get_temporal_client
from app.db.rag_db import rag_db_manager
from app.models.knowledge_base import KnowledgeDocument
from app.schemas.ingestion import (
    IngestionBootstrapInput,
    IngestionWorkflowInput,
    SourceRevisionReference,
)
from app.services.knowledge.ingestion.start_service import (
    IngestionStartService,
)
from app.services.knowledge.ingestion.cleanup import cleanup_rag_data


logger = get_logger(__name__)


class TemporalWorkflowClient(Protocol):
    async def start_workflow(
        self,
        workflow: object,
        arg: IngestionWorkflowInput,
        *,
        id: str,
        task_queue: str,
        id_conflict_policy: WorkflowIDConflictPolicy,
        id_reuse_policy: WorkflowIDReusePolicy,
    ) -> object: ...


class IngestionWorkflowStarter:
    def __init__(self, client: TemporalWorkflowClient) -> None:
        self._client = client

    async def start(
        self,
        source: SourceRevisionReference,
        *,
        update_core_document_status: bool,
        allow_closed_workflow_reuse: bool = False,
    ) -> str:
        max_parallel_batches = min(
            settings.KNOWLEDGE_MAX_PARALLEL_BATCHES,
            16,
        )
        workflow_id = f"knowledge-ingestion-v1-{source.ingestion_run_id}"
        reuse_policy = (
            WorkflowIDReusePolicy.ALLOW_DUPLICATE
            if allow_closed_workflow_reuse
            else WorkflowIDReusePolicy.REJECT_DUPLICATE
        )
        try:
            await self._client.start_workflow(
                "KnowledgeIngestionWorkflowV1",
                IngestionWorkflowInput(
                    source=source,
                    max_parallel_batches=max_parallel_batches,
                    update_core_document_status=update_core_document_status,
                ),
                id=workflow_id,
                task_queue=settings.TEMPORAL_KNOWLEDGE_TASK_QUEUE,
                id_conflict_policy=WorkflowIDConflictPolicy.USE_EXISTING,
                id_reuse_policy=reuse_policy,
            )
        except WorkflowAlreadyStartedError:
            return workflow_id
        logger.info("Started canonical knowledge ingestion workflow: %s", workflow_id)
        return workflow_id


async def start_ingestion_workflow(
    doc: KnowledgeDocument,
) -> str:
    if not doc.gcs_path or not doc.content_checksum:
        raise InvalidArgumentError(
            "Knowledge ingestion requires a checksummed GCS reference."
        )

    bootstrap = IngestionBootstrapInput(
        workspace_id=doc.workspace_id,
        document_id=doc.id,
        gcs_path=doc.gcs_path,
        source_name=doc.file_name or doc.title,
        source_modified_at=getattr(doc, "created_at", None) or getattr(doc, "updated_at", None),
        content_checksum=doc.content_checksum,
    )
    start_service = IngestionStartService(rag_db_manager)
    source = await start_service.prepare_reference(bootstrap)
    client = cast(TemporalWorkflowClient, await get_temporal_client())
    return await IngestionWorkflowStarter(client).start(
        source,
        update_core_document_status=True,
    )


async def retry_ingestion_workflow(doc: KnowledgeDocument) -> str:
    if not doc.gcs_path or not doc.content_checksum:
        raise InvalidArgumentError(
            "Knowledge ingestion requires a checksummed GCS reference."
        )

    bootstrap = IngestionBootstrapInput(
        workspace_id=doc.workspace_id,
        document_id=doc.id,
        gcs_path=doc.gcs_path,
        source_name=doc.file_name or doc.title,
        source_modified_at=getattr(doc, "created_at", None) or getattr(doc, "updated_at", None),
        content_checksum=doc.content_checksum,
    )
    source = await IngestionStartService(
        rag_db_manager
    ).prepare_retry_reference(bootstrap)
    await cleanup_rag_data(str(doc.workspace_id), str(doc.id))
    client = cast(TemporalWorkflowClient, await get_temporal_client())
    return await IngestionWorkflowStarter(client).start(
        source,
        update_core_document_status=True,
        allow_closed_workflow_reuse=True,
    )
