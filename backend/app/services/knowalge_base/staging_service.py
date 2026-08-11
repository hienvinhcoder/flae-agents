"""Deterministic, revision-scoped staging for base search evidence."""

from __future__ import annotations

from hashlib import sha256
import json
from uuid import NAMESPACE_URL, UUID, uuid5

from pydantic import BaseModel, ConfigDict
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ExternalServiceError, InvalidArgumentError
from app.db.rag_db import DBManager
from app.schemas.ingestion import (
    BaseBatchReference,
    BaseStagePlan,
    EmbeddingBatchItem,
    ParsedBaseChunk,
    PrepareBaseStageInput,
    SourceRevisionReference,
    StageBatchResult,
    StageEmbeddingInput,
)
from app.services.knowalge_base.resource_service import (
    ChunkIdentity,
    build_stable_chunk_id,
)
from app.services.knowalge_base.staging_sql import (
    INSERT_MANIFEST,
    INSERT_STAGED_CHUNK,
    SELECT_MANIFEST,
    SELECT_SOURCE,
)


class _StagedRow(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    workspace_id: UUID
    ingestion_run_id: UUID
    chunk_id: str
    revision_id: UUID
    source_id: UUID
    document_id: UUID
    section_id: UUID
    batch_id: str
    ordinal: int
    section_structural_key: str
    heading_path: tuple[str, ...]
    location_kind: str
    location_data: dict[str, object]
    text: str
    token_count: int
    content_hash: str
    parser_version: str
    chunker_version: str
    pipeline_version: str
    source_name: str
    source_type: str
    source_modified_at: object
    acl_scope: str
    acl_principal_ids: tuple[str, ...]


def canonical_checksum(value: object) -> str:
    if isinstance(value, BaseModel):
        value = value.model_dump(mode="json")
    encoded = json.dumps(
        value, ensure_ascii=False, separators=(",", ":"), sort_keys=True
    ).encode("utf-8")
    return "sha256:" + sha256(encoded).hexdigest()


class BaseStagingService:
    """Stages parse and embedding results without exposing them to retrieval."""

    def __init__(self, manager: DBManager) -> None:
        self._manager = manager

    async def stage_parsed_chunks(
        self,
        command: PrepareBaseStageInput,
        chunks: tuple[ParsedBaseChunk, ...],
    ) -> BaseStagePlan:
        if not chunks:
            raise InvalidArgumentError("Base staging requires at least one chunk.")
        rows = self._build_rows(command, chunks)
        batches = self._build_batch_references(command.source, rows)
        workspace_id = str(command.source.workspace_id)
        try:
            async with self._manager.get_ingestion_session(workspace_id) as session:
                try:
                    await self._validate_source(session, command.source)
                    await session.execute(
                        text(INSERT_STAGED_CHUNK),
                        [self._row_parameters(row) for row in rows],
                    )
                    self._after_write_boundary("parsed_rows_written")
                    count = await session.scalar(
                        text(
                            """SELECT count(*) FROM staged_base_chunks
                               WHERE workspace_id = :workspace_id
                                 AND ingestion_run_id = :run_id"""
                        ),
                        {
                            "workspace_id": workspace_id,
                            "run_id": command.source.ingestion_run_id,
                        },
                    )
                    if count != len(rows):
                        raise InvalidArgumentError(
                            "Staged parse rows conflict with an earlier attempt."
                        )
                    for batch in batches:
                        await self._insert_and_validate_manifest(
                            session,
                            workspace_id=workspace_id,
                            run_id=command.source.ingestion_run_id,
                            pipeline_version=command.source.pipeline_version,
                            stage_name="parse",
                            batch_id=batch.batch_id,
                            input_checksum=batch.input_checksum,
                            output_checksum=batch.output_checksum,
                            item_count=batch.item_count,
                        )
                    self._after_write_boundary("parse_manifests_written")
                    await session.commit()
                except Exception:
                    await session.rollback()
                    raise
        except SQLAlchemyError as error:
            raise ExternalServiceError("Không thể ghi base staging vào RAG database.") from error

        return BaseStagePlan(
            revision_id=command.source.revision_id,
            ingestion_run_id=command.source.ingestion_run_id,
            chunk_count=len(rows),
            batches=batches,
            manifest_checksum=canonical_checksum(
                [batch.model_dump(mode="json") for batch in batches]
            ),
        )

    async def load_embedding_batch(
        self, batch: BaseBatchReference
    ) -> tuple[EmbeddingBatchItem, ...]:
        workspace_id = str(batch.workspace_id)
        try:
            async with self._manager.get_ingestion_session(workspace_id) as session:
                manifest = (
                    await session.execute(
                        text(SELECT_MANIFEST),
                        {
                            "workspace_id": workspace_id,
                            "run_id": batch.ingestion_run_id,
                            "stage_name": "parse",
                            "batch_id": batch.batch_id,
                            "pipeline_version": batch.pipeline_version,
                        },
                    )
                ).mappings().one_or_none()
                if manifest is None or manifest["output_checksum"] != batch.output_checksum:
                    raise InvalidArgumentError("Parse manifest is missing or stale.")
                result = await session.execute(
                    text(
                        """SELECT chunk_id, text FROM staged_base_chunks
                           WHERE workspace_id = :workspace_id
                             AND ingestion_run_id = :run_id
                             AND revision_id = :revision_id
                             AND batch_id = :batch_id
                           ORDER BY ordinal"""
                    ),
                    {
                        "workspace_id": workspace_id,
                        "run_id": batch.ingestion_run_id,
                        "revision_id": batch.revision_id,
                        "batch_id": batch.batch_id,
                    },
                )
                items = tuple(
                    EmbeddingBatchItem.model_validate(row)
                    for row in result.mappings().all()
                )
                if len(items) != batch.item_count:
                    raise InvalidArgumentError("Staged embedding batch is incomplete.")
                return items
        except SQLAlchemyError as error:
            raise ExternalServiceError("Không thể đọc base staging từ RAG database.") from error

    async def stage_embeddings(
        self,
        command: StageEmbeddingInput,
        embeddings: tuple[tuple[float, ...], ...],
    ) -> StageBatchResult:
        items = await self.load_embedding_batch(command.batch)
        if len(embeddings) != len(items) or any(
            len(embedding) != 1024 for embedding in embeddings
        ):
            raise InvalidArgumentError(
                "Embedding batch count or dimensions do not match staged chunks."
            )
        output_checksum = canonical_checksum(
            [
                {"chunk_id": item.chunk_id, "embedding": embedding}
                for item, embedding in zip(items, embeddings, strict=True)
            ]
        )
        batch = command.batch
        workspace_id = str(batch.workspace_id)
        try:
            async with self._manager.get_ingestion_session(workspace_id) as session:
                try:
                    await session.execute(
                        text(
                            """UPDATE staged_base_chunks
                               SET embedding = CAST(:embedding AS vector)
                               WHERE workspace_id = :workspace_id
                                 AND ingestion_run_id = :run_id
                                 AND revision_id = :revision_id
                                 AND batch_id = :batch_id
                                 AND chunk_id = :chunk_id"""
                        ),
                        [
                            {
                                "embedding": json.dumps(embedding),
                                "workspace_id": workspace_id,
                                "run_id": batch.ingestion_run_id,
                                "revision_id": batch.revision_id,
                                "batch_id": batch.batch_id,
                                "chunk_id": item.chunk_id,
                            }
                            for item, embedding in zip(items, embeddings, strict=True)
                        ],
                    )
                    self._after_write_boundary("embeddings_written")
                    await self._insert_and_validate_manifest(
                        session,
                        workspace_id=workspace_id,
                        run_id=batch.ingestion_run_id,
                        pipeline_version=batch.pipeline_version,
                        stage_name="embed",
                        batch_id=batch.batch_id,
                        input_checksum=batch.output_checksum,
                        output_checksum=output_checksum,
                        item_count=len(items),
                    )
                    self._after_write_boundary("embed_manifest_written")
                    await session.commit()
                except Exception:
                    await session.rollback()
                    raise
        except SQLAlchemyError as error:
            raise ExternalServiceError("Không thể ghi embeddings vào RAG staging.") from error
        return StageBatchResult(
            batch_id=batch.batch_id,
            item_count=len(items),
            input_checksum=batch.output_checksum,
            output_checksum=output_checksum,
        )

    def _build_rows(
        self,
        command: PrepareBaseStageInput,
        chunks: tuple[ParsedBaseChunk, ...],
    ) -> tuple[_StagedRow, ...]:
        source = command.source
        rows: list[_StagedRow] = []
        for ordinal, chunk in enumerate(chunks):
            chunk_id = build_stable_chunk_id(
                ChunkIdentity(
                    revision_id=source.revision_id,
                    section_structural_key=chunk.section_structural_key,
                    location=chunk.location,
                    normalized_text=chunk.text,
                    chunker_version=source.chunker_version,
                )
            )
            location = chunk.location.model_dump(mode="json")
            location_kind = str(location.pop("kind"))
            rows.append(
                _StagedRow(
                    workspace_id=source.workspace_id,
                    ingestion_run_id=source.ingestion_run_id,
                    chunk_id=chunk_id,
                    revision_id=source.revision_id,
                    source_id=source.source_id,
                    document_id=source.document_id,
                    section_id=uuid5(
                        NAMESPACE_URL,
                        f"flae:{source.revision_id}:{chunk.section_structural_key}",
                    ),
                    batch_id=f"base-{ordinal // command.batch_size:06d}",
                    ordinal=ordinal,
                    section_structural_key=chunk.section_structural_key,
                    heading_path=chunk.heading_path,
                    location_kind=location_kind,
                    location_data=location,
                    text=chunk.text,
                    token_count=chunk.token_count,
                    content_hash=canonical_checksum(chunk.text),
                    parser_version=source.parser_version,
                    chunker_version=source.chunker_version,
                    pipeline_version=source.pipeline_version,
                    source_name=source.source_name,
                    source_type=source.source_type,
                    source_modified_at=source.source_modified_at,
                    acl_scope=source.acl_scope,
                    acl_principal_ids=source.acl_principal_ids,
                )
            )
        return tuple(rows)

    def _build_batch_references(
        self, source: SourceRevisionReference, rows: tuple[_StagedRow, ...]
    ) -> tuple[BaseBatchReference, ...]:
        batch_ids = tuple(dict.fromkeys(row.batch_id for row in rows))
        return tuple(
            BaseBatchReference(
                workspace_id=source.workspace_id,
                ingestion_run_id=source.ingestion_run_id,
                revision_id=source.revision_id,
                batch_id=batch_id,
                item_count=len(batch_rows),
                pipeline_version=source.pipeline_version,
                input_checksum=source.content_checksum,
                output_checksum=canonical_checksum(
                    [row.model_dump(mode="json") for row in batch_rows]
                ),
            )
            for batch_id in batch_ids
            if (batch_rows := tuple(row for row in rows if row.batch_id == batch_id))
        )

    async def _validate_source(
        self, session: AsyncSession, source: SourceRevisionReference
    ) -> None:
        result = await session.execute(
            text(SELECT_SOURCE),
            {
                "workspace_id": str(source.workspace_id),
                "revision_id": source.revision_id,
                "run_id": source.ingestion_run_id,
                "source_id": source.source_id,
                "document_id": source.document_id,
                "content_checksum": source.content_checksum,
                "acl_checksum": source.acl_checksum,
                "acl_scope": source.acl_scope,
                "acl_principal_ids": json.dumps(source.acl_principal_ids),
                "pipeline_version": source.pipeline_version,
            },
        )
        if result.one_or_none() is None:
            raise InvalidArgumentError("Revision/run reference is stale or inconsistent.")

    async def _insert_and_validate_manifest(
        self,
        session: AsyncSession,
        *,
        workspace_id: str,
        run_id: UUID,
        pipeline_version: str,
        stage_name: str,
        batch_id: str,
        input_checksum: str,
        output_checksum: str,
        item_count: int,
    ) -> None:
        manifest_id = uuid5(
            NAMESPACE_URL,
            f"flae:{workspace_id}:{run_id}:{stage_name}:{batch_id}:{pipeline_version}",
        )
        await session.execute(
            text(INSERT_MANIFEST),
            {
                "workspace_id": workspace_id,
                "manifest_id": manifest_id,
                "run_id": run_id,
                "stage_name": stage_name,
                "batch_id": batch_id,
                "pipeline_version": pipeline_version,
                "input_checksum": input_checksum,
                "output_checksum": output_checksum,
                "item_count": item_count,
            },
        )
        row = (
            await session.execute(
                text(SELECT_MANIFEST),
                {
                    "workspace_id": workspace_id,
                    "run_id": run_id,
                    "stage_name": stage_name,
                    "batch_id": batch_id,
                    "pipeline_version": pipeline_version,
                },
            )
        ).mappings().one()
        if (
            row["input_checksum"] != input_checksum
            or row["output_checksum"] != output_checksum
            or row["item_count"] != item_count
        ):
            raise InvalidArgumentError("Stage manifest conflicts with an earlier attempt.")

    @staticmethod
    def _row_parameters(row: _StagedRow) -> dict[str, object]:
        values = row.model_dump()
        values["workspace_id"] = str(values["workspace_id"])
        values["heading_path"] = json.dumps(values["heading_path"])
        values["location_data"] = json.dumps(values["location_data"])
        values["acl_principal_ids"] = json.dumps(values["acl_principal_ids"])
        return values

    def _after_write_boundary(self, boundary: str) -> None:
        del boundary
