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
from app.schemas.company_memory_ingestion import (
    CompanyMemoryIngestionWorkflowInput,
)
from app.schemas.discoverable_memory_ingestion import (
    DiscoverableMemoryIngestionWorkflowInput,
)
from app.schemas.graph_enrichment import SemanticGraphEnrichmentWorkflowInput
from app.schemas.graph_semantics import DemoIngestionProfile
from app.schemas.ingestion import (
    IngestionBootstrapInput,
    IngestionWorkflowInput,
    SourceRevisionReference,
)
from app.services.knowalge_base.ingestion_start_service import (
    IngestionStartService,
)


logger = get_logger(__name__)


class TemporalWorkflowClient(Protocol):
    async def start_workflow(
        self,
        workflow: object,
        arg: DiscoverableMemoryIngestionWorkflowInput,
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
    ) -> str:
        from app.temporal.workflows.discoverable_memory_ingestion import (
            DiscoverableMemoryIngestionWorkflow,
        )

        max_parallel_batches = min(
            settings.KNOWLEDGE_MAX_PARALLEL_BATCHES,
            16,
        )
        workflow_id = f"knowledge-ingestion-v1-{source.ingestion_run_id}"
        try:
            await self._client.start_workflow(
                DiscoverableMemoryIngestionWorkflow.run,
                DiscoverableMemoryIngestionWorkflowInput(
                    memory=CompanyMemoryIngestionWorkflowInput(
                        base=IngestionWorkflowInput(
                            source=source,
                            max_parallel_batches=max_parallel_batches,
                            update_core_document_status=update_core_document_status,
                        ),
                        semantic_graph=SemanticGraphEnrichmentWorkflowInput(
                            workspace_id=source.workspace_id,
                            resolver_version="resolver-v1",
                            projection_version="projection-v1",
                            semantic_profile=DemoIngestionProfile(
                                profile_version="demo-reference-v1",
                                embedding_model=settings.GEMINI_EMBEDDING_MODEL,
                                embedding_dimension=settings.EMBEDDING_DIMENSIONS,
                                embedding_policy_version="semantic-input-v1",
                            ),
                        ),
                        evidence_model_name=settings.GEMINI_LLM_MODEL,
                        evidence_glean_max=settings.RAG_GLEAN_MAX,
                        max_parallel_evidence_chunks=max_parallel_batches,
                    ),
                ),
                id=workflow_id,
                task_queue=settings.TEMPORAL_KNOWLEDGE_TASK_QUEUE,
                id_conflict_policy=WorkflowIDConflictPolicy.USE_EXISTING,
                id_reuse_policy=WorkflowIDReusePolicy.REJECT_DUPLICATE,
            )
        except WorkflowAlreadyStartedError:
            return workflow_id
        logger.info("Started canonical knowledge ingestion workflow: %s", workflow_id)
        return workflow_id


async def start_ingestion_workflow(doc: KnowledgeDocument) -> str:
    if not doc.gcs_path or not doc.content_checksum:
        raise InvalidArgumentError(
            "Knowledge ingestion requires a checksummed GCS reference."
        )

    source = await IngestionStartService(rag_db_manager).prepare_reference(
        IngestionBootstrapInput(
            workspace_id=doc.workspace_id,
            document_id=doc.id,
            gcs_path=doc.gcs_path,
            source_name=doc.file_name or doc.title,
            source_modified_at=doc.updated_at,
            content_checksum=doc.content_checksum,
        )
    )
    client = cast(TemporalWorkflowClient, await get_temporal_client())
    return await IngestionWorkflowStarter(client).start(
        source,
        update_core_document_status=True,
    )
