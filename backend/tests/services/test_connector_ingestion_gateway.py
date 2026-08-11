from datetime import UTC, datetime
from hashlib import sha256
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest

from app.connectors.base import (
    ConnectorChange,
    ConnectorChangeAction,
    ConnectorSourceState,
)
from app.core.exceptions import InvalidArgumentError
from app.schemas.ingestion import SourceRevisionReference
from app.services.connector_ingestion_gateway import (
    ConnectorGCSContentStore,
    ConnectorIngestionGateway,
)


WORKSPACE_ID = UUID("95000000-0000-0000-0000-000000000001")


def _event() -> ConnectorChange:
    content = b"# Architecture"
    return ConnectorChange(
        workspace_id=WORKSPACE_ID,
        connector_id="drive-primary",
        source_external_id="drive-file-1",
        source_version_key="8:acl-v2",
        source_name="Architecture",
        source_modified_at=datetime(2026, 8, 1, tzinfo=UTC),
        action=ConnectorChangeAction.upsert,
        output_mime_type="text/markdown",
        content=content,
        content_checksum="sha256:" + sha256(content).hexdigest(),
        acl_principal_ids=("drive:user:opaque-1",),
        acl_checksum="sha256:" + "b" * 64,
    )


class FakeStartService:
    def __init__(self, source: SourceRevisionReference | None) -> None:
        self.source = source
        self.command = None

    async def prepare_reference(self, command):
        self.command = command
        return self.source


class FakeWorkflowStarter:
    def __init__(self) -> None:
        self.calls = []

    async def start(self, source, *, update_core_document_status):
        self.calls.append((source, update_core_document_status))
        return f"knowledge-ingestion-v1-{source.ingestion_run_id}"


class FakePublisher:
    def __init__(self) -> None:
        self.calls = []

    async def tombstone_revision_id(self, workspace_id, revision_id, *, reason):
        self.calls.append((workspace_id, revision_id, reason))
        return True


async def test_connector_gateway_starts_reference_only_workflow() -> None:
    event = _event()
    source_id = uuid4()
    document_id = uuid4()
    reference = SourceRevisionReference(
        workspace_id=WORKSPACE_ID,
        source_id=source_id,
        document_id=document_id,
        revision_id=uuid4(),
        ingestion_run_id=uuid4(),
        source_uri="gcs://flae-test/connector/source.md",
        source_name=event.source_name,
        source_type="google_drive",
        source_modified_at=event.source_modified_at,
        content_checksum=event.content_checksum,
        acl_checksum=event.acl_checksum,
        acl_scope="restricted",
        acl_principal_ids=event.acl_principal_ids,
        parser_version="markdown-v1",
        chunker_version="structure-v1",
        pipeline_version="v1",
    )
    start_service = FakeStartService(reference)
    workflow_starter = FakeWorkflowStarter()
    gateway = ConnectorIngestionGateway(
        start_service=start_service,
        publisher=FakePublisher(),
        workflow_starter=workflow_starter,
    )

    revision_id = await gateway.start(
        event=event,
        source_id=source_id,
        document_id=document_id,
        gcs_path="connector/source.md",
    )

    assert revision_id == reference.revision_id
    assert start_service.command.source_external_id == event.source_external_id
    assert start_service.command.source_version_key == event.source_version_key
    assert start_service.command.acl_principal_ids == event.acl_principal_ids
    assert workflow_starter.calls == [(reference, False)]


async def test_connector_gateway_tombstones_revision_by_identity() -> None:
    event = _event()
    state = ConnectorSourceState(
        workspace_id=WORKSPACE_ID,
        connector_id=event.connector_id,
        source_external_id=event.source_external_id,
        source_id=uuid4(),
        document_id=uuid4(),
        revision_id=uuid4(),
        source_version_key=event.source_version_key,
        content_checksum=event.content_checksum,
        acl_checksum=event.acl_checksum,
        gcs_path="connector/source.md",
    )
    publisher = FakePublisher()
    gateway = ConnectorIngestionGateway(
        start_service=FakeStartService(None),
        publisher=publisher,
        workflow_starter=FakeWorkflowStarter(),
    )

    assert await gateway.tombstone(state, reason="connector_removed")
    assert publisher.calls == [
        (state.workspace_id, state.revision_id, "connector_removed")
    ]


async def test_connector_content_store_uses_deterministic_non_pii_path(
    monkeypatch,
) -> None:
    upload = AsyncMock(return_value="stored/path.md")
    monkeypatch.setattr(
        "app.services.connector_ingestion_gateway.GCSStorageService.upload_file",
        upload,
    )
    event = _event()
    document_id = uuid4()
    store = ConnectorGCSContentStore(workspace_id=WORKSPACE_ID)

    path = await store.put(document_id, event)

    assert path == "stored/path.md"
    assert upload.await_args.args[:2] == (WORKSPACE_ID, document_id)
    assert upload.await_args.args[2] == (
        f"source-{sha256(event.content).hexdigest()[:16]}.md"
    )
    assert upload.await_args.args[3] == event.content
    assert upload.await_args.kwargs["content_type"] == "text/markdown"
    assert event.source_name not in upload.await_args.args[2]


async def test_connector_content_store_rejects_mismatched_checksum(
    monkeypatch,
) -> None:
    upload = AsyncMock()
    monkeypatch.setattr(
        "app.services.connector_ingestion_gateway.GCSStorageService.upload_file",
        upload,
    )
    event = _event().model_copy(
        update={"content_checksum": "sha256:" + "a" * 64}
    )
    store = ConnectorGCSContentStore(workspace_id=WORKSPACE_ID)

    with pytest.raises(InvalidArgumentError, match="checksum"):
        await store.put(uuid4(), event)

    upload.assert_not_awaited()
