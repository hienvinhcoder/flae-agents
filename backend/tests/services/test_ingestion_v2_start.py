from datetime import UTC, datetime
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock

import psycopg2
import pytest
from sqlalchemy.engine import make_url

from app.core.config import settings
from app.db.rag_db import DBManager
from app.models.knowledge_base import DocumentType
from app.schemas.ingestion_v2 import (
    IngestionV2BootstrapInput,
    SourceRevisionReference,
)
from app.services.knowalge_base import ingestion_workflow_starter
from app.services.knowalge_base.ingestion_v2_start_service import (
    IngestionV2StartService,
)
from app.temporal.workflows.ingestion_v2 import IngestionWorkflowV2


def _connect_to_rag_test_database():
    url = make_url(settings.RAG_DATABASE_URL.replace("+asyncpg", "+psycopg2"))
    return psycopg2.connect(
        dbname=url.database,
        user=url.username,
        password=url.password,
        host=url.host,
        port=url.port,
    )


@pytest.mark.asyncio
async def test_v2_bootstrap_is_idempotent_and_reference_only() -> None:
    command = IngestionV2BootstrapInput(
        workspace_id=uuid4(),
        document_id=uuid4(),
        gcs_path="workspace/knowledge-base/document.md",
        source_name="Architecture notes",
        source_modified_at=datetime(2026, 7, 29, tzinfo=UTC),
        content_checksum="sha256:" + "a" * 64,
    )
    manager = DBManager()
    try:
        service = IngestionV2StartService(manager)
        first = await service.prepare_reference(command)
        second = await service.prepare_reference(command)
    finally:
        await manager.close()

    assert first == second
    assert "Architecture notes" in first.model_dump_json()
    assert "raw document" not in first.model_dump_json()
    with _connect_to_rag_test_database() as connection, connection.cursor() as cursor:
        cursor.execute(
            """SELECT count(*) FROM document_revisions
               WHERE workspace_id = %s AND document_id = %s""",
            (str(command.workspace_id), str(command.document_id)),
        )
        assert cursor.fetchone() == (1,)
        cursor.execute(
            """SELECT count(*) FROM ingestion_runs
               WHERE workspace_id = %s AND revision_id = %s""",
            (str(command.workspace_id), str(first.revision_id)),
        )
        assert cursor.fetchone() == (1,)


@pytest.mark.asyncio
async def test_feature_flag_routes_new_checksummed_starts_to_v2_queue(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    document_id = uuid4()
    workspace_id = uuid4()
    source = SourceRevisionReference(
        workspace_id=workspace_id,
        source_id=uuid4(),
        document_id=document_id,
        revision_id=uuid4(),
        ingestion_run_id=uuid4(),
        source_uri=f"gcs://{settings.GCS_BUCKET_NAME}/workspace/document.md",
        source_name="Architecture notes",
        source_type="knowledge_base",
        source_modified_at=datetime(2026, 7, 29, tzinfo=UTC),
        content_checksum="sha256:" + "a" * 64,
        acl_checksum="sha256:" + "b" * 64,
        acl_scope="workspace",
        parser_version="markdown-v2",
        chunker_version="structure-v2",
        pipeline_version="pipeline-v2",
    )
    document = MagicMock(
        id=document_id,
        workspace_id=workspace_id,
        gcs_path="workspace/document.md",
        content_checksum=source.content_checksum,
        file_name="document.md",
        title="Architecture notes",
        updated_at=datetime(2026, 7, 29, tzinfo=UTC),
        document_type=DocumentType.markdown,
        content_text=None,
    )
    temporal_client = MagicMock()
    temporal_client.start_workflow = AsyncMock()
    monkeypatch.setattr(settings, "INGESTION_V2_ENABLED", True)
    monkeypatch.setattr(
        ingestion_workflow_starter,
        "get_temporal_client",
        AsyncMock(return_value=temporal_client),
    )
    monkeypatch.setattr(
        ingestion_workflow_starter.IngestionV2StartService,
        "prepare_reference",
        AsyncMock(return_value=source),
    )

    workflow_id = await ingestion_workflow_starter.start_ingestion_workflow(document)

    assert workflow_id == f"kb-ingest-v2-{source.ingestion_run_id}"
    call = temporal_client.start_workflow.call_args
    assert call.args[0] == IngestionWorkflowV2.run
    assert call.args[1].source == source
    assert call.kwargs["task_queue"] == settings.TEMPORAL_INGESTION_TASK_QUEUE
