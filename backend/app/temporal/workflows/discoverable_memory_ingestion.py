"""Replay-safe composition from base ingestion through discovery publication."""

from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from app.schemas.company_memory_ingestion import (
        CompanyMemoryIngestionWorkflowResult,
    )
    from app.schemas.discoverable_memory_ingestion import (
        DiscoverableMemoryIngestionWorkflowInput,
        DiscoverableMemoryIngestionWorkflowResult,
    )
    from app.schemas.discovery_workflow import (
        DiscoveryWorkflowInput,
        DiscoveryWorkflowResult,
    )
    from app.temporal.workflows.company_memory_ingestion import (
        CompanyMemoryIngestionWorkflow,
    )
    from app.temporal.workflows.discovery import DiscoveryEnrichmentWorkflow


@workflow.defn(name="DiscoverableMemoryIngestionWorkflow")
class DiscoverableMemoryIngestionWorkflow:
    @workflow.run
    async def run(
        self, command: DiscoverableMemoryIngestionWorkflowInput
    ) -> DiscoverableMemoryIngestionWorkflowResult:
        source = command.memory.base.source
        prefix = f"discoverable-memory:{source.ingestion_run_id}"
        memory_value = await workflow.execute_child_workflow(
            CompanyMemoryIngestionWorkflow.run,
            command.memory,
            id=f"{prefix}:memory",
            task_queue=workflow.info().task_queue,
        )
        memory = CompanyMemoryIngestionWorkflowResult.model_validate(memory_value)
        revision_checksum = memory.graph.revision_set_checksum
        if revision_checksum is None:
            raise RuntimeError(
                "Semantic graph result lacks its revision-set checksum."
            )
        discovery_value = await workflow.execute_child_workflow(
            DiscoveryEnrichmentWorkflow.run,
            DiscoveryWorkflowInput(
                workspace_id=source.workspace_id,
                graph_snapshot_id=memory.graph.snapshot_id,
                revision_set_checksum=revision_checksum,
            ),
            id=f"{prefix}:discovery",
            task_queue=workflow.info().task_queue,
        )
        return DiscoverableMemoryIngestionWorkflowResult(
            memory=memory,
            discovery=DiscoveryWorkflowResult.model_validate(discovery_value),
        )
