"""Atomic publication of a complete staged base-search revision."""

from __future__ import annotations

from collections.abc import Mapping
from typing import cast
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ExternalServiceError, InvalidArgumentError
from app.db.rag_db import DBManager
from app.schemas.ingestion import (
    ManifestExpectation,
    PublishBaseInput,
    PublishBaseResult,
    SourceRevisionReference,
)


class BasePublishService:
    """Validates immutable manifests then exposes a revision in one transaction."""

    def __init__(self, manager: DBManager) -> None:
        self._manager = manager

    async def publish(self, command: PublishBaseInput) -> PublishBaseResult:
        source = command.source
        workspace_id = str(source.workspace_id)
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
                    revisions = await self._lock_document_revisions(session, source)
                    target = next(
                        (
                            row
                            for row in revisions
                            if row["revision_id"] == source.revision_id
                        ),
                        None,
                    )
                    if target is None:
                        raise InvalidArgumentError("Publish revision reference is stale.")
                    if target["state"] == "searchable":
                        result = await self._published_result(
                            session, source, revisions
                        )
                        await session.commit()
                        return result
                    if target["state"] != "staging":
                        raise InvalidArgumentError(
                            "Only a staging revision can be published."
                        )

                    current = next(
                        (row for row in revisions if row["state"] == "searchable"),
                        None,
                    )
                    current_id = cast(
                        UUID | None,
                        current["revision_id"] if current else None,
                    )
                    if current_id != source.expected_previous_revision_id:
                        raise InvalidArgumentError(
                            "Current revision changed after ingestion started."
                        )

                    await self._validate_manifests(session, command)
                    chunk_count = await self._validate_staged_chunks(session, source)
                    await session.execute(text(_INSERT_SECTIONS), self._ids(source))
                    self._after_write_boundary("sections_published")
                    inserted = await session.execute(
                        text(_INSERT_CHUNKS), self._ids(source)
                    )
                    if len(inserted.scalars().all()) != chunk_count:
                        raise InvalidArgumentError(
                            "Published chunk rows conflict with staged evidence."
                        )
                    self._after_write_boundary("chunks_published")

                    if current_id is not None:
                        await session.execute(
                            text(
                                """UPDATE document_revisions
                                   SET state = 'superseded', updated_at = now()
                                   WHERE workspace_id = :workspace_id
                                     AND revision_id = :revision_id
                                     AND state = 'searchable'"""
                            ),
                            {
                                "workspace_id": workspace_id,
                                "revision_id": current_id,
                            },
                        )
                    self._after_write_boundary("old_revision_superseded")
                    updated = await session.execute(
                        text(
                            """UPDATE document_revisions
                               SET state = 'searchable', base_readiness = 'ready',
                                   readiness_reason = NULL, updated_at = now()
                               WHERE workspace_id = :workspace_id
                                 AND revision_id = :revision_id
                                 AND state = 'staging'
                               RETURNING revision_id"""
                        ),
                        {
                            "workspace_id": workspace_id,
                            "revision_id": source.revision_id,
                        },
                    )
                    if updated.scalar_one_or_none() is None:
                        raise InvalidArgumentError("Revision publish state is stale.")
                    self._after_write_boundary("new_revision_searchable")
                    await session.execute(
                        text(
                            """UPDATE ingestion_runs
                               SET status = 'completed', error_code = NULL,
                                   updated_at = now()
                               WHERE workspace_id = :workspace_id
                                 AND run_id = :run_id
                                 AND revision_id = :revision_id"""
                        ),
                        self._ids(source),
                    )
                    self._after_write_boundary("run_completed")
                    await session.commit()
                    return PublishBaseResult(
                        revision_id=source.revision_id,
                        superseded_revision_id=current_id,
                        chunk_count=chunk_count,
                        published=True,
                    )
                except Exception:
                    await session.rollback()
                    raise
        except SQLAlchemyError as error:
            raise ExternalServiceError("Không thể publish base revision.") from error

    async def tombstone_revision(
        self, source: SourceRevisionReference, *, reason: str
    ) -> bool:
        if not reason.strip() or len(reason) > 500:
            raise InvalidArgumentError("Tombstone reason must be 1-500 characters.")
        workspace_id = str(source.workspace_id)
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
                    result = await session.execute(
                        text(
                            """UPDATE document_revisions
                               SET state = 'tombstoned', readiness_reason = :reason,
                                   updated_at = now()
                               WHERE workspace_id = :workspace_id
                                 AND revision_id = :revision_id
                                 AND state IN ('staging', 'searchable')
                               RETURNING revision_id"""
                        ),
                        {
                            "workspace_id": workspace_id,
                            "revision_id": source.revision_id,
                            "reason": reason,
                        },
                    )
                    await session.commit()
                    return result.scalar_one_or_none() is not None
                except Exception:
                    await session.rollback()
                    raise
        except SQLAlchemyError as error:
            raise ExternalServiceError("Không thể tombstone base revision.") from error

    async def _lock_document_revisions(
        self, session: AsyncSession, source: SourceRevisionReference
    ) -> tuple[Mapping[str, object], ...]:
        result = await session.execute(
            text(
                """SELECT revision_id, state, updated_at
                   FROM document_revisions
                   WHERE workspace_id = :workspace_id
                     AND document_id = :document_id
                   ORDER BY created_at, revision_id
                   FOR UPDATE"""
            ),
            self._ids(source),
        )
        rows = cast(
            tuple[Mapping[str, object], ...], tuple(result.mappings().all())
        )
        identity = await session.scalar(
            text(
                """SELECT count(*) FROM document_revisions AS revision
                   JOIN ingestion_runs AS run
                     ON run.workspace_id = revision.workspace_id
                    AND run.revision_id = revision.revision_id
                   WHERE revision.workspace_id = :workspace_id
                     AND revision.revision_id = :revision_id
                     AND revision.source_id = :source_id
                     AND revision.document_id = :document_id
                     AND revision.content_checksum = :content_checksum
                     AND revision.acl_checksum = :acl_checksum
                     AND run.run_id = :run_id
                     AND run.pipeline_version = :pipeline_version"""
            ),
            {
                **self._ids(source),
                "source_id": source.source_id,
                "content_checksum": source.content_checksum,
                "acl_checksum": source.acl_checksum,
                "pipeline_version": source.pipeline_version,
            },
        )
        if identity != 1:
            raise InvalidArgumentError("Publish source identity is inconsistent.")
        return rows

    async def _validate_manifests(
        self, session: AsyncSession, command: PublishBaseInput
    ) -> None:
        source = command.source
        result = await session.execute(
            text(
                """SELECT stage_name, batch_id, item_count, output_checksum
                   FROM stage_manifests
                   WHERE workspace_id = :workspace_id
                     AND ingestion_run_id = :run_id
                     AND pipeline_version = :pipeline_version
                     AND stage_name IN ('parse', 'embed')"""
            ),
            {
                **self._ids(source),
                "pipeline_version": source.pipeline_version,
            },
        )
        actual = {
            (row["stage_name"], row["batch_id"]): (
                row["item_count"],
                row["output_checksum"],
            )
            for row in result.mappings().all()
        }
        expected = {
            (manifest.stage_name, manifest.batch_id): (
                manifest.item_count,
                manifest.output_checksum,
            )
            for manifest in command.manifests
        }
        batch_ids = {manifest.batch_id for manifest in command.manifests}
        complete = all(
            (stage, batch_id) in expected
            for batch_id in batch_ids
            for stage in ("parse", "embed")
        )
        if not complete or actual != expected:
            raise InvalidArgumentError("Staged manifest set is missing or mismatched.")

    async def _validate_staged_chunks(
        self, session: AsyncSession, source: SourceRevisionReference
    ) -> int:
        row = (
            await session.execute(
                text(
                    """SELECT count(*) AS chunk_count,
                              count(*) FILTER (WHERE embedding IS NULL) AS missing
                       FROM staged_base_chunks
                       WHERE workspace_id = :workspace_id
                         AND ingestion_run_id = :run_id
                         AND revision_id = :revision_id"""
                ),
                self._ids(source),
            )
        ).mappings().one()
        if row["chunk_count"] < 1 or row["missing"] != 0:
            raise InvalidArgumentError("Staged base chunks are incomplete.")
        return int(row["chunk_count"])

    async def _published_result(
        self,
        session: AsyncSession,
        source: SourceRevisionReference,
        revisions: tuple[Mapping[str, object], ...],
    ) -> PublishBaseResult:
        count = await session.scalar(
            text(
                """SELECT count(*) FROM chunks
                   WHERE workspace_id = :workspace_id
                     AND revision_id = :revision_id"""
            ),
            self._ids(source),
        )
        if not count:
            raise InvalidArgumentError("Searchable revision has no base chunks.")
        superseded = next(
            (
                row["revision_id"]
                for row in reversed(revisions)
                if row["state"] == "superseded"
            ),
            None,
        )
        return PublishBaseResult(
            revision_id=source.revision_id,
            superseded_revision_id=superseded if isinstance(superseded, UUID) else None,
            chunk_count=int(count),
            published=True,
        )

    @staticmethod
    def _ids(source: SourceRevisionReference) -> dict[str, object]:
        return {
            "workspace_id": str(source.workspace_id),
            "run_id": source.ingestion_run_id,
            "revision_id": source.revision_id,
            "document_id": source.document_id,
        }

    def _after_write_boundary(self, boundary: str) -> None:
        del boundary


_INSERT_SECTIONS = """
INSERT INTO document_sections (
  workspace_id, revision_id, section_id, heading_path,
  structural_key, ordinal, content_hash
)
SELECT workspace_id, revision_id, section_id, heading_path,
       section_structural_key, min(ordinal), min(content_hash)
FROM staged_base_chunks
WHERE workspace_id = :workspace_id
  AND ingestion_run_id = :run_id
  AND revision_id = :revision_id
GROUP BY workspace_id, revision_id, section_id, heading_path, section_structural_key
ON CONFLICT (workspace_id, revision_id, structural_key) DO NOTHING
"""

_INSERT_CHUNKS = """
INSERT INTO chunks (
  workspace_id, chunk_id, text, token_count, embedding, source_document_id,
  entity_ids, relation_ids, revision_id, source_id, document_id, section_id,
  heading_path, location_kind, location_data, content_hash, parser_version,
  chunker_version, pipeline_version, source_name, source_type,
  source_modified_at, ingested_at, acl_scope, acl_principal_ids
)
SELECT workspace_id, chunk_id, text, token_count, embedding, document_id::text,
       '[]'::jsonb, '[]'::jsonb, revision_id, source_id, document_id, section_id,
       heading_path, location_kind, location_data, content_hash, parser_version,
       chunker_version, pipeline_version, source_name, source_type,
       source_modified_at, ingested_at, acl_scope, acl_principal_ids
FROM staged_base_chunks
WHERE workspace_id = :workspace_id
  AND ingestion_run_id = :run_id
  AND revision_id = :revision_id
ORDER BY ordinal
ON CONFLICT (workspace_id, chunk_id) DO NOTHING
RETURNING chunk_id
"""
