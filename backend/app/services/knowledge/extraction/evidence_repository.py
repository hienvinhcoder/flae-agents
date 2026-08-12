"""Least-privilege transactional persistence for immutable extraction evidence."""

from __future__ import annotations

from collections.abc import Callable
from hashlib import sha256
import json
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ExternalServiceError, InvalidArgumentError
from app.db.rag_db import DBManager
from app.schemas.enrichment import (
    EvidenceExtractionActivityInput,
    EvidenceExtractionCandidateBatch,
    EvidenceExtractionContext,
    EvidenceExtractionResult,
    MaterializedEvidence,
)


Materializer = Callable[
    [EvidenceExtractionContext, EvidenceExtractionCandidateBatch],
    MaterializedEvidence,
]


def _checksum(value: object) -> str:
    encoded = json.dumps(
        value, ensure_ascii=False, separators=(",", ":"), sort_keys=True
    ).encode("utf-8")
    return "sha256:" + sha256(encoded).hexdigest()


def evidence_manifest_version(
    pipeline_version: str, extractor_version: str
) -> str:
    return f"{pipeline_version}:extractor:{extractor_version}"


class EvidenceRepository:
    def __init__(self, manager: DBManager) -> None:
        self._manager = manager

    async def load_current_context(
        self, command: EvidenceExtractionActivityInput
    ) -> EvidenceExtractionContext:
        workspace_id = str(command.workspace_id)
        try:
            async with self._manager.get_ingestion_session(workspace_id) as session:
                row = await self._load_current_row(session, command, lock=False)
        except SQLAlchemyError as error:
            raise ExternalServiceError(
                "Không thể đọc source evidence từ RAG database."
            ) from error
        return self._context(command, row["text"])

    async def persist(
        self,
        command: EvidenceExtractionActivityInput,
        candidates: EvidenceExtractionCandidateBatch,
        *,
        materialize: Materializer,
        after_write: Callable[[str], None],
    ) -> EvidenceExtractionResult:
        workspace_id = str(command.workspace_id)
        try:
            async with self._manager.get_ingestion_session(workspace_id) as session:
                try:
                    row = await self._load_current_row(session, command, lock=True)
                    evidence = materialize(self._context(command, row["text"]), candidates)
                    output_checksum = _checksum(evidence.model_dump(mode="json"))
                    input_checksum = _checksum(
                        {
                            "revision_id": str(command.revision_id),
                            "chunk_id": command.chunk_id,
                            "content_hash": row["content_hash"],
                            "extractor_version": command.extractor_version,
                        }
                    )
                    item_count = len(evidence.observations) + len(evidence.assertions)
                    manifest_version = evidence_manifest_version(
                        row["pipeline_version"], command.extractor_version
                    )
                    await self._validate_existing_manifest(
                        session,
                        command,
                        pipeline_version=manifest_version,
                        input_checksum=input_checksum,
                        output_checksum=output_checksum,
                        item_count=item_count,
                    )
                    await self._write_observations(session, evidence)
                    after_write("observations_written")
                    await self._write_assertions(session, evidence)
                    await self._write_qualifiers(session, evidence)
                    after_write("assertions_written")
                    await self._write_manifest(
                        session,
                        command,
                        pipeline_version=manifest_version,
                        input_checksum=input_checksum,
                        output_checksum=output_checksum,
                        item_count=item_count,
                    )
                    after_write("manifest_written")
                    await session.commit()
                except Exception:
                    await session.rollback()
                    raise
        except SQLAlchemyError as error:
            raise ExternalServiceError(
                "Không thể ghi source evidence vào RAG database."
            ) from error
        return EvidenceExtractionResult(
            revision_id=command.revision_id,
            chunk_id=command.chunk_id,
            observation_count=len(evidence.observations),
            assertion_count=len(evidence.assertions),
            output_checksum=output_checksum,
        )

    @staticmethod
    def _context(
        command: EvidenceExtractionActivityInput, chunk_text: str
    ) -> EvidenceExtractionContext:
        return EvidenceExtractionContext(
            workspace_id=command.workspace_id,
            revision_id=command.revision_id,
            chunk_id=command.chunk_id,
            chunk_text=chunk_text,
            extractor_version=command.extractor_version,
        )

    @staticmethod
    async def _load_current_row(
        session: AsyncSession,
        command: EvidenceExtractionActivityInput,
        *,
        lock: bool,
    ) -> dict[str, str]:
        # Lock lifecycle owners; the ingestion role intentionally has no UPDATE
        # privilege on immutable published chunks, so PostgreSQL cannot lock them.
        # Revision/run locks still prevent supersede/delete during this transaction.
        suffix = " FOR SHARE OF revision, run" if lock else ""
        result = await session.execute(
            text(
                """SELECT chunk.text, chunk.content_hash, run.pipeline_version
                   FROM chunks AS chunk
                   JOIN document_revisions AS revision
                     ON revision.workspace_id = chunk.workspace_id
                    AND revision.revision_id = chunk.revision_id
                   JOIN ingestion_runs AS run
                     ON run.workspace_id = revision.workspace_id
                    AND run.revision_id = revision.revision_id
                  WHERE chunk.workspace_id = :workspace_id
                    AND chunk.revision_id = :revision_id
                    AND chunk.chunk_id = :chunk_id
                    AND run.run_id = :run_id
                    AND revision.state = 'searchable'
                    AND revision.base_readiness = 'ready'"""
                + suffix
            ),
            {
                "workspace_id": str(command.workspace_id),
                "revision_id": command.revision_id,
                "chunk_id": command.chunk_id,
                "run_id": command.ingestion_run_id,
            },
        )
        row = result.mappings().one_or_none()
        if row is None or not isinstance(row["text"], str) or not row["text"]:
            raise InvalidArgumentError(
                "Evidence extraction requires a current searchable revision chunk."
            )
        return dict(row)

    @staticmethod
    async def _validate_existing_manifest(
        session: AsyncSession,
        command: EvidenceExtractionActivityInput,
        *,
        pipeline_version: str,
        input_checksum: str,
        output_checksum: str,
        item_count: int,
    ) -> None:
        row = (
            await session.execute(
                text(
                    """SELECT input_checksum, output_checksum, item_count
                       FROM stage_manifests
                      WHERE workspace_id = :workspace_id
                        AND ingestion_run_id = :run_id
                        AND stage_name = 'evidence'
                        AND batch_id = :batch_id
                        AND pipeline_version = :pipeline_version"""
                ),
                {
                    "workspace_id": str(command.workspace_id),
                    "run_id": command.ingestion_run_id,
                    "batch_id": command.chunk_id,
                    "pipeline_version": pipeline_version,
                },
            )
        ).mappings().one_or_none()
        expected = {
            "input_checksum": input_checksum,
            "output_checksum": output_checksum,
            "item_count": item_count,
        }
        if row is not None and dict(row) != expected:
            raise InvalidArgumentError(
                "Evidence retry conflicts with the published stage manifest."
            )

    @staticmethod
    async def _write_observations(
        session: AsyncSession, evidence: MaterializedEvidence
    ) -> None:
        if not evidence.observations:
            return
        await session.execute(
            text(
                """INSERT INTO entity_observations (
                     workspace_id, observation_id, revision_id, chunk_id,
                     raw_mention, normalized_mention, proposed_type, description,
                     evidence_start, evidence_end, extractor_version, confidence,
                     external_ids, disambiguation_attributes, evidence_key
                   ) VALUES (
                     :workspace_id, :observation_id, :revision_id, :chunk_id,
                     :raw_mention, :normalized_mention, :proposed_type, :description,
                     :evidence_start, :evidence_end, :extractor_version, :confidence,
                     CAST(:external_ids AS jsonb),
                     CAST(:disambiguation_attributes AS jsonb), :evidence_key
                   ) ON CONFLICT DO NOTHING"""
            ),
            [
                {
                    **item.model_dump(
                        mode="json",
                        exclude={
                            "canonical_entity_id",
                            "resolver_version",
                            "resolver_confidence",
                        },
                    ),
                    "external_ids": json.dumps(item.external_ids),
                    "disambiguation_attributes": json.dumps(
                        [value.model_dump(mode="json") for value in item.disambiguation_attributes]
                    ),
                }
                for item in evidence.observations
            ],
        )

    @staticmethod
    async def _write_assertions(
        session: AsyncSession, evidence: MaterializedEvidence
    ) -> None:
        if not evidence.assertions:
            return
        await session.execute(
            text(
                """INSERT INTO assertion_evidence (
                     workspace_id, assertion_id, revision_id, chunk_id,
                     subject_observation_id, predicate, object_observation_id,
                     object_value, polarity, confidence, valid_from, valid_to,
                     evidence_start, evidence_end, extractor_version, keywords,
                     description, evidence_key
                   ) VALUES (
                     :workspace_id, :assertion_id, :revision_id, :chunk_id,
                     :subject_observation_id, :predicate, :object_observation_id,
                     :object_value, :polarity, :confidence, :valid_from, :valid_to,
                     :evidence_start, :evidence_end, :extractor_version,
                     CAST(:keywords AS jsonb), :description, :evidence_key
                   ) ON CONFLICT DO NOTHING"""
            ),
            [
                {
                    **item.model_dump(
                        mode="json", exclude={"qualifiers", "keywords"}
                    ),
                    "keywords": json.dumps(item.keywords),
                }
                for item in evidence.assertions
            ],
        )

    @staticmethod
    async def _write_qualifiers(
        session: AsyncSession, evidence: MaterializedEvidence
    ) -> None:
        rows: list[dict[str, object]] = []
        for assertion in evidence.assertions:
            for index, qualifier in enumerate(assertion.qualifiers):
                identity = _checksum(
                    {
                        "assertion_id": str(assertion.assertion_id),
                        "index": index,
                        "qualifier": qualifier.model_dump(mode="json"),
                    }
                )
                rows.append(
                    {
                        "workspace_id": str(assertion.workspace_id),
                        "qualifier_id": uuid5(NAMESPACE_URL, identity),
                        "revision_id": assertion.revision_id,
                        "assertion_id": assertion.assertion_id,
                        **qualifier.model_dump(mode="json"),
                    }
                )
        if rows:
            await session.execute(
                text(
                    """INSERT INTO assertion_qualifiers (
                         workspace_id, qualifier_id, revision_id, assertion_id, name,
                         text_value, integer_value, number_value, boolean_value,
                         datetime_value, unit
                       ) VALUES (
                         :workspace_id, :qualifier_id, :revision_id, :assertion_id,
                         :name, :text_value, :integer_value, :number_value,
                         :boolean_value, :datetime_value, :unit
                       ) ON CONFLICT DO NOTHING"""
                ),
                rows,
            )

    @staticmethod
    async def _write_manifest(
        session: AsyncSession,
        command: EvidenceExtractionActivityInput,
        *,
        pipeline_version: str,
        input_checksum: str,
        output_checksum: str,
        item_count: int,
    ) -> None:
        identity = (
            f"evidence:{command.workspace_id}:{command.ingestion_run_id}:"
            f"{command.chunk_id}:{pipeline_version}"
        )
        await session.execute(
            text(
                """INSERT INTO stage_manifests (
                     workspace_id, manifest_id, ingestion_run_id, stage_name,
                     batch_id, pipeline_version, input_checksum, output_checksum,
                     item_count
                   ) VALUES (
                     :workspace_id, :manifest_id, :run_id, 'evidence', :batch_id,
                     :pipeline_version, :input_checksum, :output_checksum, :item_count
                   ) ON CONFLICT DO NOTHING"""
            ),
            {
                "workspace_id": str(command.workspace_id),
                "manifest_id": uuid5(NAMESPACE_URL, identity),
                "run_id": command.ingestion_run_id,
                "batch_id": command.chunk_id,
                "pipeline_version": pipeline_version,
                "input_checksum": input_checksum,
                "output_checksum": output_checksum,
                "item_count": item_count,
            },
        )
