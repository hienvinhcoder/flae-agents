from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import NAMESPACE_URL, uuid4, uuid5

import psycopg2
import pytest
from sqlalchemy.engine import make_url
from temporalio.common import WorkflowIDConflictPolicy, WorkflowIDReusePolicy
from temporalio.exceptions import WorkflowAlreadyStartedError

from app.core.config import settings
from app.core.exceptions import InvalidArgumentError
from app.db.rag_db import DBManager
from app.models.knowledge_base import DocumentType
from app.schemas.ingestion import (
    IngestionBootstrapInput,
    SourceRevisionReference,
)
from app.services.knowledge.ingestion import workflow_starter as ingestion_workflow_starter
from app.services.knowledge.ingestion.start_service import (
    IngestionStartService,
)
from app.temporal.workflows.discoverable_memory_ingestion import (
    DiscoverableMemoryIngestionWorkflow,
)


def _connect_to_rag_test_database():
    url = make_url(settings.RAG_DATABASE_URL.replace("+asyncpg", "+psycopg2"))
    return psycopg2.connect(
        dbname=url.database,
        user=url.username,
        password=url.password,
        host=url.host,
        port=url.port,
    )


def test_source_revision_reference_rejects_gcs_uri_with_credentials() -> None:
    with pytest.raises(
        ValueError, match="ingestion requires a secret-free gcs:// reference"
    ):
        SourceRevisionReference(
            workspace_id=uuid4(),
            source_id=uuid4(),
            document_id=uuid4(),
            revision_id=uuid4(),
            ingestion_run_id=uuid4(),
            source_uri="gcs://user:secret@bucket/object",
            source_name="Architecture notes",
            source_type="knowledge_base",
            source_modified_at=datetime(2026, 7, 29, tzinfo=UTC),
            content_checksum="sha256:" + "a" * 64,
            acl_checksum="sha256:" + "b" * 64,
            acl_scope="workspace",
            parser_version="markdown-v1",
            chunker_version="structure-v1",
            pipeline_version="v1",
        )


@pytest.mark.asyncio
async def test_ingestion_bootstrap_is_idempotent_and_reference_only() -> None:
    command = IngestionBootstrapInput(
        workspace_id=uuid4(),
        document_id=uuid4(),
        gcs_path="workspace/knowledge-base/document.md",
        source_name="Architecture notes",
        source_modified_at=datetime(2026, 7, 29, tzinfo=UTC),
        content_checksum="sha256:" + "a" * 64,
    )
    manager = DBManager()
    try:
        service = IngestionStartService(manager)
        first = await service.prepare_reference(command)
        second = await service.prepare_reference(command)
    finally:
        await manager.close()

    assert first == second
    assert first.revision_id == uuid5(
        NAMESPACE_URL,
        f"flae:{command.workspace_id}:{command.document_id}:"
        f"{command.content_checksum}",
    )
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
            """SELECT count(*), min(input_checksum) FROM ingestion_runs
               WHERE workspace_id = %s AND revision_id = %s""",
            (str(command.workspace_id), str(first.revision_id)),
        )
        assert cursor.fetchone() == (1, command.content_checksum)


@pytest.mark.asyncio
async def test_ingestion_bootstrap_preserves_connector_identity_and_restricted_acl() -> None:
    workspace_id = uuid4()
    document_id = uuid4()
    source_id = uuid4()
    acl_checksum = "sha256:" + "b" * 64
    command = IngestionBootstrapInput(
        workspace_id=workspace_id,
        source_id=source_id,
        document_id=document_id,
        gcs_path="connector/google-drive/source.md",
        source_external_id="drive-file-1",
        source_version_key=f"8:{acl_checksum}",
        source_name="Architecture notes",
        source_type="google_drive",
        source_modified_at=datetime(2026, 8, 1, tzinfo=UTC),
        content_checksum="sha256:" + "a" * 64,
        acl_checksum=acl_checksum,
        acl_scope="restricted",
        acl_principal_ids=("drive:user:opaque-1",),
    )
    changed_acl = command.model_copy(
        update={
            "source_version_key": "9:acl-changed",
            "acl_checksum": "sha256:" + "c" * 64,
            "acl_principal_ids": ("drive:group:opaque-2",),
        }
    )
    manager = DBManager()
    try:
        first = await IngestionStartService(manager).prepare_reference(command)
        second = await IngestionStartService(manager).prepare_reference(changed_acl)
    finally:
        await manager.close()

    assert first.source_id == source_id
    assert first.source_type == "google_drive"
    assert first.acl_scope == "restricted"
    assert first.acl_principal_ids == ("drive:user:opaque-1",)
    assert first.acl_checksum == acl_checksum
    assert second.revision_id != first.revision_id

    with _connect_to_rag_test_database() as connection, connection.cursor() as cursor:
        cursor.execute(
            """SELECT source_external_id, source_version_key, acl_scope,
                      acl_principal_ids
               FROM document_revisions
               WHERE workspace_id = %s AND revision_id = %s""",
            (str(workspace_id), str(first.revision_id)),
        )
        assert cursor.fetchone() == (
            "drive-file-1",
            f"8:{acl_checksum}",
            "restricted",
            ["drive:user:opaque-1"],
        )


@pytest.mark.asyncio
async def test_document_start_always_uses_the_canonical_knowledge_workflow(
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
        parser_version="markdown-v1",
        chunker_version="structure-v1",
        pipeline_version="v1",
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
    monkeypatch.setattr(
        ingestion_workflow_starter,
        "get_temporal_client",
        AsyncMock(return_value=temporal_client),
    )
    monkeypatch.setattr(
        ingestion_workflow_starter.IngestionStartService,
        "prepare_reference",
        AsyncMock(return_value=source),
    )

    workflow_id = await ingestion_workflow_starter.start_ingestion_workflow(document)

    assert workflow_id == f"knowledge-ingestion-v1-{source.ingestion_run_id}"
    temporal_client.start_workflow.assert_awaited_once()
    call = temporal_client.start_workflow.call_args
    assert call.args[0] == DiscoverableMemoryIngestionWorkflow.run
    assert call.args[1].memory.base.source == source
    assert call.args[1].memory.base.update_core_document_status is True
    assert call.args[1].memory.semantic_graph.workspace_id == source.workspace_id
    assert call.args[1].memory.semantic_graph.resolver_version == "resolver-v1"
    assert call.args[1].memory.semantic_graph.projection_version == "projection-v1"
    assert call.kwargs["id"] == workflow_id
    assert call.kwargs["task_queue"] == settings.TEMPORAL_KNOWLEDGE_TASK_QUEUE
    assert (
        call.kwargs["id_conflict_policy"]
        is WorkflowIDConflictPolicy.USE_EXISTING
    )
    assert (
        call.kwargs["id_reuse_policy"]
        is WorkflowIDReusePolicy.REJECT_DUPLICATE
    )


@pytest.mark.asyncio
async def test_canonical_starter_returns_workflow_id_when_closed_id_exists() -> None:
    source = SourceRevisionReference(
        workspace_id=uuid4(),
        source_id=uuid4(),
        document_id=uuid4(),
        revision_id=uuid4(),
        ingestion_run_id=uuid4(),
        source_uri=f"gcs://{settings.GCS_BUCKET_NAME}/workspace/document.md",
        source_name="Architecture notes",
        source_type="knowledge_base",
        source_modified_at=datetime(2026, 7, 29, tzinfo=UTC),
        content_checksum="sha256:" + "a" * 64,
        acl_checksum="sha256:" + "b" * 64,
        acl_scope="workspace",
        parser_version="markdown-v1",
        chunker_version="structure-v1",
        pipeline_version="v1",
    )
    workflow_id = f"knowledge-ingestion-v1-{source.ingestion_run_id}"
    temporal_client = MagicMock()
    temporal_client.start_workflow = AsyncMock(
        side_effect=WorkflowAlreadyStartedError(
            workflow_id,
            "DiscoverableMemoryIngestionWorkflow",
        )
    )

    result = await ingestion_workflow_starter.IngestionWorkflowStarter(
        temporal_client
    ).start(source, update_core_document_status=False)

    assert result == workflow_id


@pytest.mark.asyncio
async def test_document_start_requires_a_checksummed_gcs_reference() -> None:
    document = MagicMock(
        id=uuid4(),
        workspace_id=uuid4(),
        gcs_path=None,
        content_checksum=None,
    )

    with pytest.raises(InvalidArgumentError, match="checksummed GCS reference"):
        await ingestion_workflow_starter.start_ingestion_workflow(document)
