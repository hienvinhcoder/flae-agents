"""References-only activities for evidence and graph enrichment."""

from __future__ import annotations

from pydantic import ValidationError
from temporalio import activity
from temporalio.exceptions import ApplicationError

from app.services.knowledge.extraction.agent.evidence_graph import run_evidence_extraction_agent
from app.core.config import settings
from app.core.exceptions import InvalidArgumentError
from app.db.rag_db import rag_db_manager
from app.schemas.enrichment import (
    EvidenceBatchPlan,
    EvidenceBatchPlanInput,
    EvidenceExtractionActivityInput,
    EvidenceExtractionResult,
    EvidenceExtractionWorkflowResult,
    EvidenceManifestVerificationInput,
)
from app.schemas.graph_enrichment import (
    CompleteGraphSnapshotActivityInput,
    EntityResolutionActivityInput,
    EntityResolutionResult,
    GraphFailureActivityInput,
    GraphProjectionActivityInput,
    GraphProjectionResult,
    GraphSemanticActivityInput,
    GraphSnapshotActivityInput,
    GraphSnapshotPublishResult,
)
from app.schemas.graph_semantics import (
    GraphSemanticBuildInput,
    GraphSemanticBuildResult,
)
from app.services.knowledge.extraction.evidence_service import EvidenceService
from app.services.knowledge.extraction.workflow_service import (
    EvidenceWorkflowService,
)
from app.services.knowledge.graph.entity_resolution_service import EntityResolutionService
from app.services.knowledge.graph.projection_service import GraphProjectionService
from app.services.knowledge.graph.semantic_projection_service import (
    GraphSemanticProjectionService,
)
from app.services.knowledge.graph.snapshot_service import GraphSnapshotService
from app.services.knowledge.ingestion.service import IngestionService


@activity.defn
async def extract_evidence_activity(
    command: EvidenceExtractionActivityInput,
) -> EvidenceExtractionResult:
    """Load a referenced chunk, extract topic-free evidence, and persist atomically."""
    service = EvidenceService(rag_db_manager)
    try:
        activity.heartbeat({"stage": "load_chunk", "completed": 0})
        context = await service.load_current_context(command)
        activity.heartbeat({"stage": "extract_evidence", "completed": 0})
        candidates, _tokens_used = await run_evidence_extraction_agent(
            chunk={"chunk_id": context.chunk_id, "text": context.chunk_text},
            model_name=command.model_name,
            api_key=settings.GEMINI_API_KEY,
            entity_types=settings.RAG_ENTITY_TYPES,
            extractor_version=command.extractor_version,
            glean_max=command.glean_max,
        )
        activity.heartbeat(
            {
                "stage": "persist_evidence",
                "completed": 0,
                "observations": len(candidates.observations),
                "assertions": len(candidates.assertions),
            }
        )
        result = await service.persist_candidates(command, candidates)
        activity.heartbeat({"stage": "persist_evidence", "completed": 1})
        return result
    except (InvalidArgumentError, ValidationError) as error:
        raise ApplicationError(
            str(error), type="INVALID_EVIDENCE_OUTPUT", non_retryable=True
        ) from error


@activity.defn
async def plan_evidence_batch_activity(
    command: EvidenceBatchPlanInput,
) -> EvidenceBatchPlan:
    activity.heartbeat({"stage": "plan_evidence", "completed": 0})
    try:
        result = await EvidenceWorkflowService(rag_db_manager).plan_batch(command)
    except InvalidArgumentError as error:
        raise ApplicationError(
            str(error), type="INVALID_EVIDENCE_PLAN", non_retryable=True
        ) from error
    activity.heartbeat(
        {"stage": "plan_evidence", "completed": len(result.items)}
    )
    return result


@activity.defn
async def verify_evidence_manifests_activity(
    command: EvidenceManifestVerificationInput,
) -> EvidenceExtractionWorkflowResult:
    activity.heartbeat({"stage": "verify_evidence", "completed": 0})
    try:
        result = await EvidenceWorkflowService(rag_db_manager).verify_manifests(
            command
        )
    except InvalidArgumentError as error:
        raise ApplicationError(
            str(error), type="INCOMPLETE_EVIDENCE", non_retryable=True
        ) from error
    activity.heartbeat(
        {"stage": "verify_evidence", "completed": result.chunk_count}
    )
    return result


@activity.defn
async def resolve_entities_activity(
    command: EntityResolutionActivityInput,
) -> EntityResolutionResult:
    activity.heartbeat({"stage": "resolve_entities", "completed": 0})
    try:
        projection = await EntityResolutionService(rag_db_manager).resolve_workspace(
            command.workspace_id,
            resolver_version=command.resolver_version,
            minimum_confidence=command.minimum_confidence,
        )
    except InvalidArgumentError as error:
        raise ApplicationError(
            str(error), type="INVALID_RESOLUTION_INPUT", non_retryable=True
        ) from error
    activity.heartbeat({"stage": "resolve_entities", "completed": 1})
    return EntityResolutionResult(
        resolution_run_id=projection.resolution_run_id,
        evidence_checksum=projection.evidence_checksum,
        mapping_checksum=projection.mapping_checksum,
        entity_count=len(projection.entities),
        assignment_count=len(projection.assignments),
    )


@activity.defn
async def project_graph_activity(
    command: GraphProjectionActivityInput,
) -> GraphProjectionResult:
    activity.heartbeat({"stage": "project_graph", "completed": 0})
    try:
        projection = await GraphProjectionService(rag_db_manager).project_workspace(
            command.workspace_id,
            projection_version=command.projection_version,
        )
    except InvalidArgumentError as error:
        raise ApplicationError(
            str(error), type="INVALID_GRAPH_PROJECTION", non_retryable=True
        ) from error
    activity.heartbeat({"stage": "project_graph", "completed": 1})
    return GraphProjectionResult(
        projection_id=projection.projection_id,
        resolution_run_id=projection.resolution_run_id,
        revision_set_checksum=projection.revision_set_checksum,
        projection_checksum=projection.projection_checksum,
        relationship_count=len(projection.relationships),
        mapping_count=len(projection.mappings),
    )


def _embed_graph_semantics(
    semantic_inputs: tuple[str, ...], dimension: int
) -> tuple[tuple[float, ...], ...]:
    if dimension != settings.EMBEDDING_DIMENSIONS:
        raise InvalidArgumentError(
            "Semantic profile dimension does not match the configured provider."
        )
    embeddings, _token_count = IngestionService.generate_embeddings(
        list(semantic_inputs), "graph_semantics", 0
    )
    if any(embedding is None for embedding in embeddings):
        raise InvalidArgumentError(
            "Embedding provider returned an incomplete semantic batch."
        )
    return tuple(
        tuple(float(value) for value in embedding or ())
        for embedding in embeddings
    )


def _summarize_semantic_descriptions(
    name: str, descriptions: tuple[str, ...]
) -> str:
    """Deterministic, evidence-only fallback for the reference profile."""
    del name
    return " ".join(descriptions)[:8_000].rstrip()


@activity.defn
async def project_graph_semantics_activity(
    command: GraphSemanticActivityInput,
) -> GraphSemanticBuildResult:
    activity.heartbeat({"stage": "project_graph_semantics", "completed": 0})
    try:
        if command.profile.embedding_model != settings.GEMINI_EMBEDDING_MODEL:
            raise InvalidArgumentError(
                "Semantic profile model does not match the configured provider."
            )
        result = await GraphSemanticProjectionService(
            rag_db_manager
        ).build_workspace(
            GraphSemanticBuildInput(
                workspace_id=command.workspace_id,
                resolution_run_id=command.resolution_run_id,
                relationship_projection_id=command.relationship_projection_id,
                profile=command.profile,
            ),
            embedder=_embed_graph_semantics,
            summarizer=_summarize_semantic_descriptions,
        )
    except InvalidArgumentError as error:
        raise ApplicationError(
            str(error), type="INVALID_GRAPH_SEMANTICS", non_retryable=True
        ) from error
    activity.heartbeat({"stage": "project_graph_semantics", "completed": 1})
    return result


@activity.defn
async def publish_graph_snapshot_activity(
    command: GraphSnapshotActivityInput,
) -> GraphSnapshotPublishResult:
    activity.heartbeat({"stage": "publish_graph", "completed": 0})
    try:
        result = await GraphSnapshotService(rag_db_manager).publish(
            command.workspace_id, projection_id=command.projection_id
        )
    except InvalidArgumentError as error:
        raise ApplicationError(
            str(error), type="INVALID_GRAPH_SNAPSHOT", non_retryable=True
        ) from error
    activity.heartbeat({"stage": "publish_graph", "completed": 1})
    return result


@activity.defn
async def publish_complete_graph_snapshot_activity(
    command: CompleteGraphSnapshotActivityInput,
) -> GraphSnapshotPublishResult:
    activity.heartbeat({"stage": "publish_complete_graph", "completed": 0})
    try:
        result = await GraphSnapshotService(rag_db_manager).publish_complete(
            command.workspace_id,
            projection_id=command.projection_id,
            semantic_projection_id=command.semantic_projection_id,
        )
    except InvalidArgumentError as error:
        raise ApplicationError(
            str(error), type="INVALID_GRAPH_SNAPSHOT", non_retryable=True
        ) from error
    activity.heartbeat({"stage": "publish_complete_graph", "completed": 1})
    return result


@activity.defn
async def mark_graph_failed_activity(command: GraphFailureActivityInput) -> None:
    await GraphSnapshotService(rag_db_manager).mark_failed(
        command.workspace_id, reason=command.reason
    )
