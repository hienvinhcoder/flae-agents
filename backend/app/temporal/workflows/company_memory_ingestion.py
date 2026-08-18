"""Production composition for base, evidence, and semantic graph ingestion."""

from __future__ import annotations

from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from app.schemas.company_memory_ingestion import (
        CompanyMemoryIngestionWorkflowInput,
        CompanyMemoryIngestionWorkflowResult,
    )
    from app.schemas.enrichment import (
        EvidenceExtractionWorkflowInput,
        EvidenceExtractionWorkflowResult,
    )
    from app.schemas.graph_enrichment import GraphSnapshotPublishResult
    from app.schemas.ingestion import IngestionWorkflowOutput
    from app.temporal.workflows.evidence_extraction import EvidenceExtractionWorkflow
    from app.temporal.workflows.ingestion import IngestionWorkflow
    from app.temporal.workflows.semantic_graph_enrichment import (
        SemanticGraphEnrichmentWorkflow,
    )


@workflow.defn(name="CompanyMemoryIngestionWorkflow")
class CompanyMemoryIngestionWorkflow:
    @workflow.run
    async def run(
        self, command: CompanyMemoryIngestionWorkflowInput
    ) -> CompanyMemoryIngestionWorkflowResult:
        source = command.base.source
        task_queue = workflow.info().task_queue
        child_prefix = f"company-memory:{source.ingestion_run_id}"
        base_value = await workflow.execute_child_workflow(
            IngestionWorkflow.run,
            command.base,
            id=f"{child_prefix}:base",
            task_queue=task_queue,
        )
        base = IngestionWorkflowOutput.model_validate(base_value)
        evidence_value = await workflow.execute_child_workflow(
            EvidenceExtractionWorkflow.run,
            EvidenceExtractionWorkflowInput(
                workspace_id=source.workspace_id,
                ingestion_run_id=source.ingestion_run_id,
                revision_id=base.revision_id,
                extractor_version=command.evidence_extractor_version,
                model_name=command.evidence_model_name,
                glean_max=command.evidence_glean_max,
                batch_size=command.evidence_batch_size,
                max_parallel_chunks=command.max_parallel_evidence_chunks,
                max_chunks=command.max_evidence_chunks,
            ),
            id=f"{child_prefix}:evidence",
            task_queue=task_queue,
        )
        evidence = EvidenceExtractionWorkflowResult.model_validate(evidence_value)
        graph_value = await workflow.execute_child_workflow(
            SemanticGraphEnrichmentWorkflow.run,
            command.semantic_graph,
            id=f"{child_prefix}:semantic-graph",
            task_queue=task_queue,
        )
        graph = GraphSnapshotPublishResult.model_validate(graph_value)
        return CompanyMemoryIngestionWorkflowResult(
            base=base,
            evidence=evidence,
            graph=graph,
        )
