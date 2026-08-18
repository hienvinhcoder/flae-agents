from datetime import UTC, datetime
from uuid import uuid4

import pytest
from temporalio import activity
from temporalio.contrib.pydantic import pydantic_data_converter
from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Replayer, Worker

from app.schemas.company_memory_ingestion import (
    CompanyMemoryIngestionWorkflowInput,
)
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
    GraphSnapshotPublishResult,
    SemanticGraphEnrichmentWorkflowInput,
)
from app.schemas.graph_semantics import GraphSemanticBuildResult
from app.schemas.ingestion import (
    BaseBatchReference,
    BaseStagePlan,
    IngestionWorkflowInput,
    PrepareBaseStageInput,
    PublishBaseInput,
    PublishBaseResult,
    SourceRevisionReference,
    StageBatchResult,
    StageEmbeddingInput,
)
from app.temporal.workflows.company_memory_ingestion import (
    CompanyMemoryIngestionWorkflow,
)
from app.temporal.workflows.evidence_extraction import EvidenceExtractionWorkflow
from app.temporal.workflows.ingestion import IngestionWorkflow
from app.temporal.workflows.semantic_graph_enrichment import (
    SemanticGraphEnrichmentWorkflow,
)


@pytest.mark.asyncio
async def test_company_memory_workflow_composes_real_versioned_workflows() -> None:
    source = _source()
    batch = BaseBatchReference(
        workspace_id=source.workspace_id,
        ingestion_run_id=source.ingestion_run_id,
        revision_id=source.revision_id,
        batch_id="base-000000",
        item_count=1,
        pipeline_version=source.pipeline_version,
        input_checksum=source.content_checksum,
        output_checksum="sha256:" + "c" * 64,
    )
    resolution_run_id = uuid4()
    relationship_projection_id = uuid4()
    semantic_projection_id = uuid4()
    snapshot_id = uuid4()
    calls: list[str] = []

    @activity.defn(name="prepare_base_stage_activity")
    async def prepare(_command: PrepareBaseStageInput) -> BaseStagePlan:
        calls.append("base:prepare")
        return BaseStagePlan(
            revision_id=source.revision_id,
            ingestion_run_id=source.ingestion_run_id,
            chunk_count=1,
            batches=(batch,),
            manifest_checksum="sha256:" + "d" * 64,
        )

    @activity.defn(name="stage_embedding_batch_activity")
    async def embed(_command: StageEmbeddingInput) -> StageBatchResult:
        calls.append("base:embed")
        return StageBatchResult(
            batch_id=batch.batch_id,
            item_count=1,
            input_checksum=batch.output_checksum,
            output_checksum="sha256:" + "e" * 64,
        )

    @activity.defn(name="publish_base_activity")
    async def publish_base(_command: PublishBaseInput) -> PublishBaseResult:
        calls.append("base:publish")
        return PublishBaseResult(
            revision_id=source.revision_id,
            chunk_count=1,
            published=True,
        )

    @activity.defn(name="plan_evidence_batch_activity")
    async def plan_evidence(
        command: EvidenceBatchPlanInput,
    ) -> EvidenceBatchPlan:
        calls.append("evidence:plan")
        return EvidenceBatchPlan(
            items=(
                EvidenceExtractionActivityInput(
                    workspace_id=source.workspace_id,
                    ingestion_run_id=source.ingestion_run_id,
                    revision_id=source.revision_id,
                    chunk_id="chunk-1",
                    extractor_version=command.extractor_version,
                    model_name=command.model_name,
                    glean_max=command.glean_max,
                ),
            ),
            next_cursor=None,
        )

    @activity.defn(name="extract_evidence_activity")
    async def extract_evidence(
        _command: EvidenceExtractionActivityInput,
    ) -> EvidenceExtractionResult:
        calls.append("evidence:extract")
        return EvidenceExtractionResult(
            revision_id=source.revision_id,
            chunk_id="chunk-1",
            observation_count=2,
            assertion_count=1,
            output_checksum="sha256:" + "f" * 64,
        )

    @activity.defn(name="verify_evidence_manifests_activity")
    async def verify_evidence(
        _command: EvidenceManifestVerificationInput,
    ) -> EvidenceExtractionWorkflowResult:
        calls.append("evidence:verify")
        return EvidenceExtractionWorkflowResult(
            revision_id=source.revision_id,
            chunk_count=1,
            observation_count=2,
            assertion_count=1,
            manifest_checksum="sha256:" + "1" * 64,
        )

    @activity.defn(name="resolve_entities_activity")
    async def resolve(_command: EntityResolutionActivityInput) -> EntityResolutionResult:
        calls.append("graph:resolve")
        return EntityResolutionResult(
            resolution_run_id=resolution_run_id,
            evidence_checksum="sha256:" + "2" * 64,
            mapping_checksum="sha256:" + "3" * 64,
            entity_count=2,
            assignment_count=2,
        )

    @activity.defn(name="project_graph_activity")
    async def project(_command: GraphProjectionActivityInput) -> GraphProjectionResult:
        calls.append("graph:project")
        return GraphProjectionResult(
            projection_id=relationship_projection_id,
            resolution_run_id=resolution_run_id,
            revision_set_checksum="sha256:" + "4" * 64,
            projection_checksum="sha256:" + "5" * 64,
            relationship_count=1,
            mapping_count=4,
        )

    @activity.defn(name="project_graph_semantics_activity")
    async def semantics(
        _command: GraphSemanticActivityInput,
    ) -> GraphSemanticBuildResult:
        calls.append("graph:semantics")
        return GraphSemanticBuildResult(
            semantic_projection_id=semantic_projection_id,
            resolution_run_id=resolution_run_id,
            relationship_projection_id=relationship_projection_id,
            input_checksum="sha256:" + "6" * 64,
            projection_checksum="sha256:" + "7" * 64,
            entity_count=2,
            relationship_count=1,
            mapping_count=4,
        )

    @activity.defn(name="publish_complete_graph_snapshot_activity")
    async def publish_graph(
        _command: CompleteGraphSnapshotActivityInput,
    ) -> GraphSnapshotPublishResult:
        calls.append("graph:publish")
        return GraphSnapshotPublishResult(
            snapshot_id=snapshot_id,
            projection_id=relationship_projection_id,
            semantic_projection_id=semantic_projection_id,
            revision_count=1,
            entity_count=2,
            relationship_count=1,
            mapping_count=4,
            graph_checksum="sha256:" + "8" * 64,
            published=True,
        )

    @activity.defn(name="mark_graph_failed_activity")
    async def mark_failed(_command: GraphFailureActivityInput) -> None:
        calls.append("graph:failed")

    command = CompanyMemoryIngestionWorkflowInput(
        base=IngestionWorkflowInput(
            source=source,
            update_core_document_status=False,
        ),
        semantic_graph=SemanticGraphEnrichmentWorkflowInput(
            workspace_id=source.workspace_id,
            resolver_version="resolver-v2",
            projection_version="projection-v2",
        ),
        evidence_model_name="fixture-model",
    )
    async with await WorkflowEnvironment.start_time_skipping(
        data_converter=pydantic_data_converter
    ) as environment:
        task_queue = f"company-memory-{uuid4()}"
        async with Worker(
            environment.client,
            task_queue=task_queue,
            workflows=[
                CompanyMemoryIngestionWorkflow,
                IngestionWorkflow,
                EvidenceExtractionWorkflow,
                SemanticGraphEnrichmentWorkflow,
            ],
            activities=[
                prepare,
                embed,
                publish_base,
                plan_evidence,
                extract_evidence,
                verify_evidence,
                resolve,
                project,
                semantics,
                publish_graph,
                mark_failed,
            ],
        ):
            handle = await environment.client.start_workflow(
                CompanyMemoryIngestionWorkflow.run,
                command,
                id=f"company-memory-{source.ingestion_run_id}",
                task_queue=task_queue,
            )
            result = await handle.result()
            history = await handle.fetch_history()

    assert result.base.revision_id == source.revision_id
    assert result.evidence.chunk_count == 1
    assert result.graph.snapshot_id == snapshot_id
    assert calls == [
        "base:prepare",
        "base:embed",
        "base:publish",
        "evidence:plan",
        "evidence:extract",
        "evidence:verify",
        "graph:resolve",
        "graph:project",
        "graph:semantics",
        "graph:publish",
    ]
    assert "chunk_text" not in history.to_json()
    await Replayer(
        workflows=[CompanyMemoryIngestionWorkflow],
        data_converter=pydantic_data_converter,
    ).replay_workflow(history)


def _source() -> SourceRevisionReference:
    return SourceRevisionReference(
        workspace_id=uuid4(),
        source_id=uuid4(),
        document_id=uuid4(),
        revision_id=uuid4(),
        ingestion_run_id=uuid4(),
        source_uri="gcs://flae-test/workspace/document.md",
        source_name="Company memory integration",
        source_type="gcs",
        source_modified_at=datetime(2026, 8, 3, tzinfo=UTC),
        content_checksum="sha256:" + "a" * 64,
        acl_checksum="sha256:" + "b" * 64,
        acl_scope="workspace",
        parser_version="markdown-v1",
        chunker_version="structure-v1",
        pipeline_version="v1",
    )
