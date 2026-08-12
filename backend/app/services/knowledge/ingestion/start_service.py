"""Idempotent revision/run bootstrap for canonical ingestion starts."""

import json
from hashlib import sha256
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.core.exceptions import ExternalServiceError, InvalidArgumentError
from app.db.rag_db import DBManager
from app.schemas.ingestion import (
    IngestionBootstrapInput,
    SourceRevisionReference,
)


class IngestionStartService:
    def __init__(self, manager: DBManager) -> None:
        self._manager = manager

    async def prepare_reference(
        self, command: IngestionBootstrapInput
    ) -> SourceRevisionReference:
        source_id = command.source_id or uuid5(
            NAMESPACE_URL, f"flae:knowledge-base:{command.workspace_id}"
        )
        source_external_id = command.source_external_id or str(command.document_id)
        source_version_key = command.source_version_key or command.content_checksum
        acl_checksum = command.acl_checksum or (
            "sha256:" + sha256(b"workspace").hexdigest()
        )
        legacy_knowledge_base = (
            command.source_id is None
            and command.source_external_id is None
            and command.source_version_key is None
            and command.source_type == "knowledge_base"
            and command.acl_scope == "workspace"
            and command.acl_checksum is None
            and not command.acl_principal_ids
        )
        revision_material = (
            command.content_checksum
            if legacy_knowledge_base
            else f"{command.content_checksum}:{acl_checksum}"
        )
        revision_id = uuid5(
            NAMESPACE_URL,
            f"flae:{command.workspace_id}:{command.document_id}:"
            f"{revision_material}",
        )
        run_id = uuid5(
            NAMESPACE_URL, f"flae:{revision_id}:{command.pipeline_version}"
        )
        workflow_id = f"knowledge-ingestion-v1-{run_id}"
        input_checksum = (
            command.content_checksum
            if legacy_knowledge_base
            else "sha256:"
            + sha256(f"{command.content_checksum}:{acl_checksum}".encode()).hexdigest()
        )
        workspace_id = str(command.workspace_id)
        try:
            async with self._manager.get_ingestion_session(workspace_id) as session:
                try:
                    current_revision_id = await session.scalar(
                        text(
                            """SELECT revision_id FROM document_revisions
                               WHERE workspace_id = :workspace_id
                                 AND document_id = :document_id
                                 AND state = 'searchable'
                               FOR UPDATE"""
                        ),
                        {
                            "workspace_id": workspace_id,
                            "document_id": command.document_id,
                        },
                    )
                    await session.execute(
                        text(
                            """INSERT INTO document_revisions (
                                 workspace_id, revision_id, source_id, document_id,
                                 source_external_id, source_version_key,
                                 content_checksum, acl_checksum, state,
                                 base_readiness, graph_readiness, discovery_readiness,
                                 acl_scope, acl_principal_ids
                               ) VALUES (
                                 :workspace_id, :revision_id, :source_id, :document_id,
                                 :source_external_id, :source_version_key,
                                 :content_checksum, :acl_checksum, 'staging',
                                 'pending', 'pending', 'pending', :acl_scope,
                                 CAST(:acl_principal_ids AS jsonb)
                               ) ON CONFLICT (
                                 workspace_id, source_id, source_external_id,
                                 source_version_key
                               ) DO NOTHING"""
                        ),
                        {
                            "workspace_id": workspace_id,
                            "revision_id": revision_id,
                            "source_id": source_id,
                            "document_id": command.document_id,
                            "source_external_id": source_external_id,
                            "source_version_key": source_version_key,
                            "content_checksum": command.content_checksum,
                            "acl_checksum": acl_checksum,
                            "acl_scope": command.acl_scope,
                            "acl_principal_ids": json.dumps(
                                command.acl_principal_ids
                            ),
                        },
                    )
                    await session.execute(
                        text(
                            """INSERT INTO ingestion_runs (
                                 workspace_id, run_id, revision_id, workflow_id,
                                 pipeline_version, input_checksum, status
                               ) VALUES (
                                 :workspace_id, :run_id, :revision_id, :workflow_id,
                                 :pipeline_version, :input_checksum, 'pending'
                               ) ON CONFLICT (
                                 workspace_id, revision_id, pipeline_version,
                                 input_checksum
                               ) DO NOTHING"""
                        ),
                        {
                            "workspace_id": workspace_id,
                            "run_id": run_id,
                            "revision_id": revision_id,
                            "workflow_id": workflow_id,
                            "pipeline_version": command.pipeline_version,
                            "input_checksum": input_checksum,
                        },
                    )
                    state = await session.scalar(
                        text(
                            """SELECT state FROM document_revisions
                               WHERE workspace_id = :workspace_id
                                 AND revision_id = :revision_id"""
                        ),
                        {"workspace_id": workspace_id, "revision_id": revision_id},
                    )
                    if state not in ("staging", "searchable"):
                        raise InvalidArgumentError(
                            "Revision cannot be started from its current state."
                        )
                    await session.commit()
                except Exception:
                    await session.rollback()
                    raise
        except SQLAlchemyError as error:
            raise ExternalServiceError("Không thể khởi tạo ingestion.") from error

        return SourceRevisionReference(
            workspace_id=command.workspace_id,
            source_id=source_id,
            document_id=command.document_id,
            revision_id=revision_id,
            ingestion_run_id=run_id,
            source_uri=(
                f"gcs://{settings.GCS_BUCKET_NAME}/{command.gcs_path.lstrip('/')}"
            ),
            source_name=command.source_name,
            source_type=command.source_type,
            source_modified_at=command.source_modified_at,
            content_checksum=command.content_checksum,
            acl_checksum=acl_checksum,
            acl_scope=command.acl_scope,
            acl_principal_ids=command.acl_principal_ids,
            parser_version=command.parser_version,
            chunker_version=command.chunker_version,
            pipeline_version=command.pipeline_version,
            expected_previous_revision_id=current_revision_id,
        )

    async def prepare_retry_reference(
        self, command: IngestionBootstrapInput
    ) -> SourceRevisionReference:
        """Reset one deterministic ingestion identity for a deliberate retry."""
        source = await self.prepare_reference(command)
        workspace_id = str(command.workspace_id)
        try:
            async with self._manager.get_ingestion_session(workspace_id) as session:
                try:
                    await session.execute(
                        text(
                            "SELECT pg_advisory_xact_lock("
                            "hashtextextended(:workspace_id, 41721))"
                        ),
                        {"workspace_id": workspace_id},
                    )
                    current_revision_id = await session.scalar(
                        text(
                            """SELECT revision_id FROM document_revisions
                               WHERE workspace_id = :workspace_id
                                 AND document_id = :document_id
                                 AND state = 'searchable'
                               FOR UPDATE"""
                        ),
                        {
                            "workspace_id": workspace_id,
                            "document_id": command.document_id,
                        },
                    )
                    if current_revision_id not in (None, source.revision_id):
                        raise InvalidArgumentError(
                            "A newer searchable revision cannot be replaced by retry."
                        )
                    revision = await session.execute(
                        text(
                            """UPDATE document_revisions
                               SET state = 'staging', base_readiness = 'pending',
                                   updated_at = now()
                               WHERE workspace_id = :workspace_id
                                 AND revision_id = :revision_id
                                 AND state IN ('staging', 'searchable')
                               RETURNING revision_id"""
                        ),
                        {
                            "workspace_id": workspace_id,
                            "revision_id": source.revision_id,
                        },
                    )
                    if revision.scalar_one_or_none() is None:
                        raise InvalidArgumentError(
                            "Ingestion revision cannot be retried from its current state."
                        )
                    run = await session.execute(
                        text(
                            """UPDATE ingestion_runs
                               SET status = 'pending', error_code = NULL,
                                   updated_at = now()
                               WHERE workspace_id = :workspace_id
                                 AND run_id = :run_id
                                 AND revision_id = :revision_id
                               RETURNING run_id"""
                        ),
                        {
                            "workspace_id": workspace_id,
                            "run_id": source.ingestion_run_id,
                            "revision_id": source.revision_id,
                        },
                    )
                    if run.scalar_one_or_none() is None:
                        raise InvalidArgumentError(
                            "Ingestion run cannot be prepared for retry."
                        )
                    # State changes invalidate graph/discovery snapshots through
                    # database triggers. Reset readiness after those triggers run.
                    await session.execute(
                        text(
                            """UPDATE document_revisions
                               SET graph_readiness = 'pending',
                                   discovery_readiness = 'pending',
                                   readiness_reason = NULL, updated_at = now()
                               WHERE workspace_id = :workspace_id
                                 AND revision_id = :revision_id"""
                        ),
                        {
                            "workspace_id": workspace_id,
                            "revision_id": source.revision_id,
                        },
                    )
                    await session.commit()
                except Exception:
                    await session.rollback()
                    raise
        except SQLAlchemyError as error:
            raise ExternalServiceError("Không thể chuẩn bị ingestion retry.") from error

        return source.model_copy(update={"expected_previous_revision_id": None})
