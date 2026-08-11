"""GCS and ingestion adapters for connector-originated ingestion."""

from __future__ import annotations

from hashlib import sha256
from typing import Protocol
from uuid import UUID

from app.connectors.base import (
    ConnectorChange,
    ConnectorChangeAction,
    ConnectorSourceState,
)
from app.core.exceptions import InvalidArgumentError
from app.core.temporal import get_temporal_client
from app.db.rag_db import rag_db_manager
from app.schemas.ingestion import (
    IngestionBootstrapInput,
    SourceRevisionReference,
)
from app.services.gcs_storage_srv import GCSStorageService
from app.services.knowalge_base.ingestion_start_service import (
    IngestionStartService,
)
from app.services.knowalge_base.ingestion_workflow_starter import (
    IngestionWorkflowStarter,
)
from app.services.knowalge_base.publish_service import BasePublishService


class ConnectorReferencePreparer(Protocol):
    async def prepare_reference(
        self, command: IngestionBootstrapInput
    ) -> SourceRevisionReference: ...


class ConnectorRevisionPublisher(Protocol):
    async def tombstone_revision_id(
        self, workspace_id: UUID, revision_id: UUID, *, reason: str
    ) -> bool: ...


class ConnectorGCSContentStore:
    def __init__(self, *, workspace_id: UUID) -> None:
        self._workspace_id = workspace_id

    async def put(self, document_id: UUID, event: ConnectorChange) -> str:
        if event.workspace_id != self._workspace_id:
            raise InvalidArgumentError("Connector content has an invalid workspace.")
        if (
            event.action is not ConnectorChangeAction.upsert
            or event.content is None
            or event.content_checksum is None
            or event.output_mime_type is None
        ):
            raise InvalidArgumentError("Connector content upload requires an upsert.")
        digest = sha256(event.content).hexdigest()
        if f"sha256:{digest}" != event.content_checksum:
            raise InvalidArgumentError(
                "Connector content checksum does not match uploaded bytes."
            )
        extension = self._extension(event.output_mime_type)
        return await GCSStorageService.upload_file(
            self._workspace_id,
            document_id,
            f"source-{digest[:16]}.{extension}",
            event.content,
            content_type=event.output_mime_type,
        )

    @staticmethod
    def _extension(mime_type: str) -> str:
        extensions = {
            "text/markdown": "md",
            "text/csv": "csv",
            "text/plain": "txt",
            "application/pdf": "pdf",
        }
        if mime_type in extensions:
            return extensions[mime_type]
        if mime_type.startswith("text/"):
            return "txt"
        raise InvalidArgumentError("Connector content type is unsupported.")


class ConnectorIngestionGateway:
    def __init__(
        self,
        *,
        start_service: ConnectorReferencePreparer,
        workflow_starter: IngestionWorkflowStarter,
        publisher: ConnectorRevisionPublisher,
    ) -> None:
        self._start_service = start_service
        self._workflow_starter = workflow_starter
        self._publisher = publisher

    async def start(
        self,
        *,
        event: ConnectorChange,
        source_id: UUID,
        document_id: UUID,
        gcs_path: str,
    ) -> UUID:
        if (
            event.action is not ConnectorChangeAction.upsert
            or event.source_modified_at is None
            or event.content_checksum is None
        ):
            raise InvalidArgumentError("Connector ingestion requires an upsert.")
        source = await self._start_service.prepare_reference(
            IngestionBootstrapInput(
                workspace_id=event.workspace_id,
                source_id=source_id,
                document_id=document_id,
                gcs_path=gcs_path,
                source_external_id=event.source_external_id,
                source_version_key=event.source_version_key,
                source_name=event.source_name,
                source_type=event.source_type,
                source_modified_at=event.source_modified_at,
                content_checksum=event.content_checksum,
                acl_checksum=event.acl_checksum,
                acl_scope=event.acl_scope,
                acl_principal_ids=event.acl_principal_ids,
            )
        )
        await self._workflow_starter.start(
            source,
            update_core_document_status=False,
        )
        return source.revision_id

    async def tombstone(
        self, state: ConnectorSourceState, *, reason: str
    ) -> bool:
        return await self._publisher.tombstone_revision_id(
            state.workspace_id, state.revision_id, reason=reason
        )


async def build_connector_ingestion_gateway() -> ConnectorIngestionGateway:
    temporal_client = await get_temporal_client()
    return ConnectorIngestionGateway(
        start_service=IngestionStartService(rag_db_manager),
        workflow_starter=IngestionWorkflowStarter(temporal_client),
        publisher=BasePublishService(rag_db_manager),
    )
