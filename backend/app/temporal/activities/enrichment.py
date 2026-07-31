"""References-only activities for evidence and graph enrichment."""

from __future__ import annotations

from pydantic import ValidationError
from temporalio import activity
from temporalio.exceptions import ApplicationError

from app.agents.extractor.evidence_graph import run_evidence_extraction_agent
from app.core.config import settings
from app.core.exceptions import InvalidArgumentError
from app.db.rag_db import rag_db_manager
from app.schemas.enrichment import (
    EvidenceExtractionActivityInput,
    EvidenceExtractionResult,
)
from app.schemas.graph_enrichment import (
    EntityResolutionActivityInput,
    EntityResolutionResult,
    GraphFailureActivityInput,
    GraphProjectionActivityInput,
    GraphProjectionResult,
    GraphSnapshotActivityInput,
    GraphSnapshotPublishResult,
)
from app.services.knowalge_base.evidence_service import EvidenceService
from app.services.knowalge_base.entity_resolution_service import EntityResolutionService
from app.services.knowalge_base.graph_projection_service import GraphProjectionService
from app.services.knowalge_base.graph_snapshot_service import GraphSnapshotService


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
async def mark_graph_failed_activity(command: GraphFailureActivityInput) -> None:
    await GraphSnapshotService(rag_db_manager).mark_failed(
        command.workspace_id, reason=command.reason
    )
