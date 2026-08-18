"""Production composition of persisted topic and overlapping-context discovery."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import NAMESPACE_URL, UUID, uuid5

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.exceptions import ExternalServiceError, InvalidArgumentError
from app.db.rag_db import DBManager
from app.schemas.agent_memory_discovery import (
    MembershipDerivation,
    MembershipTargetKind,
)
from app.schemas.context_discovery import (
    ContextDiscoveryResult,
    ContextEvidenceSignal,
)
from app.schemas.discovery_catalog import DiscoveryProjectionBundle, DiscoverySnapshot
from app.schemas.discovery_workflow import DiscoveryWorkflowInput
from app.schemas.topic_discovery import TopicEvidenceWindow
from app.services.knowledge.discovery.context_service import ContextDiscoveryService
from app.services.knowledge.discovery.snapshot_repository import DiscoverySnapshotRepository
from app.services.knowledge.discovery.snapshot_service import DiscoverySnapshotService
from app.services.knowledge.discovery.topic_repository import TopicDiscoveryRepository
from app.services.knowledge.discovery.topic_service import TopicDiscoveryService


class DiscoveryProjectionService:
    def __init__(self, manager: DBManager) -> None:
        self._manager = manager

    async def discover_and_publish(
        self, command: DiscoveryWorkflowInput
    ) -> DiscoverySnapshot:
        basis, rows, relationship_ids_by_chunk, previous_contexts = (
            await self._load_inputs(command.workspace_id)
        )
        if (
            basis["graph_snapshot_id"] != command.graph_snapshot_id
            or basis["revision_set_checksum"] != command.revision_set_checksum
        ):
            raise InvalidArgumentError(
                "Discovery workflow input is stale for the current graph snapshot."
            )
        observed_at = datetime.now(UTC)
        windows = self._topic_windows(command, rows)
        topics = await TopicDiscoveryService(
            repository=TopicDiscoveryRepository(self._manager)
        ).discover_workspace(
            workspace_id=command.workspace_id,
            graph_snapshot_id=command.graph_snapshot_id,
            revision_set_checksum=command.revision_set_checksum,
            evidence_windows=windows,
            taxonomy_version=command.taxonomy_version,
            observed_at=observed_at,
            policy=command.topic_policy,
        )
        contexts = ContextDiscoveryService.discover(
            workspace_id=command.workspace_id,
            topic_discovery_run_id=topics.discovery_run_id,
            revision_set_checksum=command.revision_set_checksum,
            signals=self._context_signals(
                topics,
                rows,
                relationship_ids_by_chunk,
                command.graph_snapshot_id,
            ),
            discovery_version=command.context_version,
            observed_at=observed_at,
            policy=command.context_policy,
            previous_contexts=previous_contexts,
        )
        return await DiscoverySnapshotService(
            repository=DiscoverySnapshotRepository(self._manager)
        ).publish(DiscoveryProjectionBundle(topics=topics, contexts=contexts))

    async def mark_failed(self, workspace_id: UUID, reason: str) -> None:
        try:
            async with self._manager.get_ingestion_session(str(workspace_id)) as session:
                await session.execute(
                    text(
                        """UPDATE document_revisions
                              SET discovery_readiness = 'failed',
                                  readiness_reason = :reason, updated_at = now()
                            WHERE workspace_id = :workspace_id
                              AND state = 'searchable'
                              AND base_readiness = 'ready'"""
                    ),
                    {"workspace_id": str(workspace_id), "reason": reason},
                )
                await session.commit()
        except SQLAlchemyError as error:
            raise ExternalServiceError(
                "Không thể cập nhật discovery readiness."
            ) from error

    async def _load_inputs(self, workspace_id: UUID):
        try:
            async with self._manager.get_ingestion_session(str(workspace_id)) as session:
                basis = (
                    await session.execute(
                        text(
                            """SELECT snapshot_id AS graph_snapshot_id,
                                      revision_set_checksum
                                 FROM graph_snapshots
                                WHERE workspace_id = :workspace_id
                                  AND status = 'current'
                                  AND semantic_projection_id IS NOT NULL"""
                        ),
                        {"workspace_id": str(workspace_id)},
                    )
                ).mappings().one_or_none()
                rows = (
                    await session.execute(
                        text(
                            """SELECT entity.entity_id, entity.canonical_name,
                                      mapping.evidence_id, mapping.revision_id,
                                      mapping.chunk_id, chunk.source_id,
                                      chunk.source_name
                                 FROM current_entity_semantic_versions AS entity
                                 JOIN current_semantic_graph_mappings AS mapping
                                   ON mapping.workspace_id = entity.workspace_id
                                  AND mapping.semantic_projection_id = entity.semantic_projection_id
                                  AND mapping.target_kind = 'entity'
                                  AND mapping.target_id = entity.entity_id
                                 JOIN current_chunks AS chunk
                                   ON chunk.workspace_id = mapping.workspace_id
                                  AND chunk.revision_id = mapping.revision_id
                                  AND chunk.chunk_id = mapping.chunk_id
                                WHERE entity.workspace_id = :workspace_id
                                ORDER BY entity.entity_id, mapping.evidence_id"""
                        ),
                        {"workspace_id": str(workspace_id)},
                    )
                ).mappings().all()
                relationship_rows = (
                    await session.execute(
                        text(
                            """SELECT chunk_id, target_id
                                 FROM current_semantic_graph_mappings
                                WHERE workspace_id = :workspace_id
                                  AND target_kind = 'relationship'"""
                        ),
                        {"workspace_id": str(workspace_id)},
                    )
                ).mappings().all()
                previous_payload = (
                    await session.execute(
                        text(
                            """SELECT payload.context_payload
                                 FROM discovery_snapshots AS snapshot
                                 JOIN discovery_snapshot_payloads AS payload
                                   ON payload.workspace_id = snapshot.workspace_id
                                  AND payload.snapshot_id = snapshot.snapshot_id
                                WHERE snapshot.workspace_id = :workspace_id
                                  AND snapshot.status = 'current'"""
                        ),
                        {"workspace_id": str(workspace_id)},
                    )
                ).scalar_one_or_none()
        except SQLAlchemyError as error:
            raise ExternalServiceError(
                "Không thể đọc graph basis cho discovery."
            ) from error
        if basis is None or not rows:
            raise InvalidArgumentError(
                "Discovery requires a current semantic graph with evidence."
            )
        relationship_ids_by_chunk: dict[str, set[UUID]] = {}
        for row in relationship_rows:
            relationship_ids_by_chunk.setdefault(row["chunk_id"], set()).add(
                UUID(str(row["target_id"]))
            )
        previous_contexts = (
            ContextDiscoveryResult.model_validate(previous_payload).contexts
            if previous_payload is not None
            else ()
        )
        return dict(basis), rows, relationship_ids_by_chunk, previous_contexts

    @staticmethod
    def _topic_windows(command: DiscoveryWorkflowInput, rows) -> tuple[TopicEvidenceWindow, ...]:
        return tuple(
            TopicEvidenceWindow(
                window_id=uuid5(
                    NAMESPACE_URL,
                    f"topic-window:{command.graph_snapshot_id}:{row['evidence_id']}:"
                    f"{row['entity_id']}",
                ),
                revision_id=row["revision_id"],
                chunk_id=row["chunk_id"],
                candidate_name=row["canonical_name"],
                target_kind=MembershipTargetKind.entity,
                target_id=str(row["entity_id"]),
                confidence=1.0,
                derivation=MembershipDerivation.graph_overlap,
                supporting_evidence_ids=(row["evidence_id"],),
            )
            for row in rows
        )

    @staticmethod
    def _context_signals(
        topics,
        rows,
        relationship_ids_by_chunk,
        graph_snapshot_id,
    ) -> tuple[ContextEvidenceSignal, ...]:
        rows_by_evidence = {row["evidence_id"]: row for row in rows}
        signals: list[ContextEvidenceSignal] = []
        for topic in topics.topics:
            for membership in topic.memberships:
                for evidence_id in membership.supporting_evidence_ids:
                    row = rows_by_evidence.get(evidence_id)
                    if row is None:
                        continue
                    signals.append(
                        ContextEvidenceSignal(
                            signal_id=uuid5(
                                NAMESPACE_URL,
                                f"context-signal:{graph_snapshot_id}:"
                                f"{topic.topic_id}:{evidence_id}",
                            ),
                            revision_id=row["revision_id"],
                            chunk_id=row["chunk_id"],
                            source_id=row["source_id"],
                            candidate_name=topic.name,
                            context_type="topic_cluster",
                            target_kind=MembershipTargetKind.source,
                            target_id=str(row["source_id"]),
                            confidence=membership.confidence,
                            derivation=MembershipDerivation.graph_overlap,
                            supporting_evidence_ids=(evidence_id,),
                            graph_relationship_ids=tuple(
                                sorted(
                                    relationship_ids_by_chunk.get(
                                        row["chunk_id"], set()
                                    ),
                                    key=str,
                                )
                            ),
                            topic_ids=(topic.topic_id,),
                        )
                    )
        return tuple(signals)
