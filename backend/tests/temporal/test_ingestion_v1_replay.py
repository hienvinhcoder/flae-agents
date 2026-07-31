from uuid import uuid4

import pytest
from temporalio import activity
from temporalio.contrib.pydantic import pydantic_data_converter
from temporalio.testing import WorkflowEnvironment
from temporalio.worker import Replayer, Worker

from app.temporal.workflows.ingestion import DocumentIngestionWorkflow


@activity.defn(name="update_document_status")
async def update_status(_params: dict) -> None:
    return None


@activity.defn(name="prepare_document_content")
async def prepare(_params: dict) -> str:
    return "Legacy V1 replay evidence"


@activity.defn(name="chunk_document_activity")
async def chunk(_params: dict) -> list[dict]:
    return [{"chunk_id": "legacy-1", "text": "Legacy evidence"}]


@activity.defn(name="generate_embeddings_activity")
async def embed(params: dict) -> list[dict]:
    return params["chunks"]


@activity.defn(name="extract_entities_activity")
async def extract(params: dict) -> dict:
    return {"chunks": params["chunks"], "entities": [], "relations": []}


@activity.defn(name="fuse_and_save_activity")
async def save(_params: dict) -> dict:
    return {"chunk_count": 1, "entity_count": 0, "relation_count": 0}


@activity.defn(name="finalize_ingestion")
async def finalize(_params: dict) -> None:
    return None


@pytest.mark.asyncio
async def test_v1_history_still_completes_and_replays_with_v2_converter() -> None:
    task_queue = "ingestion-v1-replay-test"
    async with await WorkflowEnvironment.start_time_skipping(
        data_converter=pydantic_data_converter
    ) as environment:
        async with Worker(
            environment.client,
            task_queue=task_queue,
            workflows=[DocumentIngestionWorkflow],
            activities=[
                update_status,
                prepare,
                chunk,
                embed,
                extract,
                save,
                finalize,
            ],
        ):
            handle = await environment.client.start_workflow(
                DocumentIngestionWorkflow.run,
                {
                    "document_id": str(uuid4()),
                    "workspace_id": str(uuid4()),
                    "document_type": "markdown",
                    "gcs_path": "legacy/document.md",
                    "file_name": "document.md",
                },
                id=f"v1-replay-{uuid4()}",
                task_queue=task_queue,
            )
            result = await handle.result()
            history = await handle.fetch_history()

    assert result["status"] == "completed"
    await Replayer(
        workflows=[DocumentIngestionWorkflow],
        data_converter=pydantic_data_converter,
    ).replay_workflow(history)
