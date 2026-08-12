"""Database-backed planning and completion gates for evidence workflows."""

from __future__ import annotations

from hashlib import sha256
import json

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.exceptions import ExternalServiceError, InvalidArgumentError
from app.db.rag_db import DBManager
from app.schemas.enrichment import (
    EvidenceBatchPlan,
    EvidenceBatchPlanInput,
    EvidenceExtractionActivityInput,
    EvidenceExtractionWorkflowResult,
    EvidenceManifestVerificationInput,
)
from app.services.knowledge.extraction.evidence_repository import (
    evidence_manifest_version,
)


def _checksum(value: object) -> str:
    payload = json.dumps(
        value, ensure_ascii=False, separators=(",", ":"), sort_keys=True
    ).encode()
    return "sha256:" + sha256(payload).hexdigest()


class EvidenceWorkflowService:
    def __init__(self, manager: DBManager) -> None:
        self._manager = manager

    async def plan_batch(self, command: EvidenceBatchPlanInput) -> EvidenceBatchPlan:
        try:
            async with self._manager.get_ingestion_session(
                str(command.workspace_id)
            ) as session:
                rows = (
                    await session.execute(
                        text(
                            """SELECT chunk.chunk_id
                                 FROM chunks AS chunk
                                 JOIN document_revisions AS revision
                                   ON revision.workspace_id = chunk.workspace_id
                                  AND revision.revision_id = chunk.revision_id
                                 JOIN ingestion_runs AS run
                                   ON run.workspace_id = revision.workspace_id
                                  AND run.revision_id = revision.revision_id
                                WHERE chunk.workspace_id = :workspace_id
                                  AND chunk.revision_id = :revision_id
                                  AND run.run_id = :run_id
                                  AND revision.state = 'searchable'
                                  AND revision.base_readiness = 'ready'
                                  AND (CAST(:cursor AS text) IS NULL
                                       OR chunk.chunk_id > CAST(:cursor AS text))
                                ORDER BY chunk.chunk_id
                                LIMIT :limit"""
                        ),
                        {
                            "workspace_id": str(command.workspace_id),
                            "revision_id": command.revision_id,
                            "run_id": command.ingestion_run_id,
                            "cursor": command.cursor,
                            "limit": command.batch_size + 1,
                        },
                    )
                ).mappings().all()
        except SQLAlchemyError as error:
            raise ExternalServiceError(
                "Không thể lập kế hoạch evidence extraction."
            ) from error
        selected = rows[: command.batch_size]
        next_cursor = (
            str(selected[-1]["chunk_id"])
            if len(rows) > command.batch_size and selected
            else None
        )
        return EvidenceBatchPlan(
            items=tuple(
                EvidenceExtractionActivityInput(
                    workspace_id=command.workspace_id,
                    ingestion_run_id=command.ingestion_run_id,
                    revision_id=command.revision_id,
                    chunk_id=str(row["chunk_id"]),
                    extractor_version=command.extractor_version,
                    model_name=command.model_name,
                    glean_max=command.glean_max,
                )
                for row in selected
            ),
            next_cursor=next_cursor,
        )

    async def verify_manifests(
        self, command: EvidenceManifestVerificationInput
    ) -> EvidenceExtractionWorkflowResult:
        try:
            async with self._manager.get_ingestion_session(
                str(command.workspace_id)
            ) as session:
                run = (
                    await session.execute(
                        text(
                            """SELECT pipeline_version
                                 FROM ingestion_runs
                                WHERE workspace_id = :workspace_id
                                  AND run_id = :run_id
                                  AND revision_id = :revision_id"""
                        ),
                        {
                            "workspace_id": str(command.workspace_id),
                            "run_id": command.ingestion_run_id,
                            "revision_id": command.revision_id,
                        },
                    )
                ).mappings().one_or_none()
                if run is None:
                    raise InvalidArgumentError(
                        "Evidence verification requires the referenced ingestion run."
                    )
                version = evidence_manifest_version(
                    str(run["pipeline_version"]), command.extractor_version
                )
                counts = (
                    await session.execute(
                        text(
                            """SELECT
                                 (SELECT count(*)
                                    FROM chunks AS chunk
                                    JOIN document_revisions AS revision
                                      ON revision.workspace_id = chunk.workspace_id
                                     AND revision.revision_id = chunk.revision_id
                                   WHERE chunk.workspace_id = :workspace_id
                                     AND chunk.revision_id = :revision_id
                                     AND revision.state = 'searchable'
                                     AND revision.base_readiness = 'ready')
                                   AS chunk_count,
                                 (SELECT count(*) FROM entity_observations
                                   WHERE workspace_id = :workspace_id
                                     AND revision_id = :revision_id
                                     AND extractor_version = :extractor_version)
                                   AS observation_count,
                                 (SELECT count(*) FROM assertion_evidence
                                   WHERE workspace_id = :workspace_id
                                     AND revision_id = :revision_id
                                     AND extractor_version = :extractor_version)
                                   AS assertion_count"""
                        ),
                        {
                            "workspace_id": str(command.workspace_id),
                            "revision_id": command.revision_id,
                            "extractor_version": command.extractor_version,
                        },
                    )
                ).mappings().one()
                manifests = (
                    await session.execute(
                        text(
                            """SELECT batch_id, output_checksum, item_count
                                 FROM stage_manifests
                                WHERE workspace_id = :workspace_id
                                  AND ingestion_run_id = :run_id
                                  AND stage_name = 'evidence'
                                  AND pipeline_version = :pipeline_version
                                ORDER BY batch_id"""
                        ),
                        {
                            "workspace_id": str(command.workspace_id),
                            "run_id": command.ingestion_run_id,
                            "pipeline_version": version,
                        },
                    )
                ).mappings().all()
        except SQLAlchemyError as error:
            raise ExternalServiceError(
                "Không thể xác minh evidence extraction manifests."
            ) from error
        actual = (
            int(counts["chunk_count"]),
            int(counts["observation_count"]),
            int(counts["assertion_count"]),
            len(manifests),
        )
        expected = (
            command.expected_chunk_count,
            command.expected_observation_count,
            command.expected_assertion_count,
            command.expected_chunk_count,
        )
        if actual != expected or sum(int(row["item_count"]) for row in manifests) != (
            command.expected_observation_count + command.expected_assertion_count
        ):
            raise InvalidArgumentError(
                "Evidence manifests are incomplete for the current revision."
            )
        return EvidenceExtractionWorkflowResult(
            revision_id=command.revision_id,
            chunk_count=command.expected_chunk_count,
            observation_count=command.expected_observation_count,
            assertion_count=command.expected_assertion_count,
            manifest_checksum=_checksum([dict(row) for row in manifests]),
        )
