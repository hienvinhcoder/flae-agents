"""Persistence boundary for immutable topic-discovery versions."""

from __future__ import annotations

from collections import defaultdict
import json
from uuid import NAMESPACE_URL, UUID, uuid5

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.exceptions import ExternalServiceError, InvalidArgumentError
from app.db.rag_db import DBManager
from app.schemas.agent_memory_discovery import (
    EvidenceMembership,
    TaxonomyLineage,
    Topic,
)
from app.schemas.topic_discovery import TopicDiscoveryResult


class TopicDiscoveryRepository:
    def __init__(self, manager: DBManager) -> None:
        self._manager = manager

    async def load_latest(self, workspace_id: UUID) -> tuple[Topic, ...]:
        try:
            async with self._manager.get_ingestion_session(str(workspace_id)) as session:
                run = (
                    await session.execute(
                        text(
                            """SELECT discovery_run_id, taxonomy_version
                                 FROM topic_discovery_runs
                                WHERE workspace_id = :workspace_id
                                  AND status = 'complete'
                                ORDER BY created_at DESC, discovery_run_id DESC
                                LIMIT 1"""
                        ),
                        {"workspace_id": str(workspace_id)},
                    )
                ).mappings().one_or_none()
                if run is None:
                    return ()
                params = {
                    "workspace_id": str(workspace_id),
                    "run_id": run["discovery_run_id"],
                }
                topic_rows = (
                    await session.execute(
                        text(
                            """SELECT topic_id, name, aliases, lifecycle,
                                      primary_parent_id, secondary_parent_ids,
                                      promotion_evidence_count
                                 FROM topic_versions
                                WHERE workspace_id = :workspace_id
                                  AND discovery_run_id = :run_id
                                ORDER BY topic_id"""
                        ),
                        params,
                    )
                ).mappings().all()
                membership_rows = (
                    await session.execute(
                        text(
                            """SELECT topic_id, membership_id, target_kind,
                                      target_id, confidence, derivation,
                                      first_seen_run_id AS first_seen_snapshot_id,
                                      last_seen_run_id AS last_seen_snapshot_id,
                                      supporting_evidence_ids
                                 FROM topic_membership_versions
                                WHERE workspace_id = :workspace_id
                                  AND discovery_run_id = :run_id
                                ORDER BY topic_id, membership_id"""
                        ),
                        params,
                    )
                ).mappings().all()
                lineage_rows = (
                    await session.execute(
                        text(
                            """SELECT event_type AS kind, occurred_at,
                                      discovery_run_id AS snapshot_id,
                                      predecessor_ids, successor_ids, evidence_ids
                                 FROM topic_lineage_events
                                WHERE workspace_id = :workspace_id
                                  AND discovery_run_id = :run_id
                                ORDER BY lineage_id"""
                        ),
                        params,
                    )
                ).mappings().all()
        except SQLAlchemyError as error:
            raise ExternalServiceError(
                "Không thể đọc topic-discovery version từ RAG database."
            ) from error
        memberships: dict[UUID, list[EvidenceMembership]] = defaultdict(list)
        for row in membership_rows:
            values = dict(row)
            topic_id = UUID(str(values.pop("topic_id")))
            memberships[topic_id].append(EvidenceMembership.model_validate(values))
        lineage = tuple(TaxonomyLineage.model_validate(row) for row in lineage_rows)
        return tuple(
            Topic.model_validate(
                dict(row)
                | {
                    "workspace_id": workspace_id,
                    "memberships": tuple(
                        memberships[UUID(str(row["topic_id"]))]
                    ),
                    "lineage": tuple(
                        event
                        for event in lineage
                        if UUID(str(row["topic_id"])) in event.successor_ids
                    ),
                    "discovery_version": run["taxonomy_version"],
                }
            )
            for row in topic_rows
        )

    async def persist(self, projection: TopicDiscoveryResult) -> TopicDiscoveryResult:
        try:
            async with self._manager.get_ingestion_session(
                str(projection.workspace_id)
            ) as session:
                try:
                    await session.execute(
                        text(
                            "SELECT pg_advisory_xact_lock(hashtextextended(:key, 41722))"
                        ),
                        {"key": str(projection.workspace_id)},
                    )
                    existing = await session.scalar(
                        text(
                            """SELECT taxonomy_checksum FROM topic_discovery_runs
                                WHERE workspace_id = :workspace_id
                                  AND discovery_run_id = :run_id"""
                        ),
                        {
                            "workspace_id": str(projection.workspace_id),
                            "run_id": projection.discovery_run_id,
                        },
                    )
                    if existing is not None:
                        if existing != projection.taxonomy_checksum:
                            raise InvalidArgumentError(
                                "Topic discovery replay conflicts with its stored checksum."
                            )
                        return projection
                    await self._write_run(session, projection)
                    await self._write_topics(session, projection)
                    await self._write_memberships(session, projection)
                    await self._write_membership_revisions(session, projection)
                    await self._write_lineage(session, projection)
                    await session.commit()
                except Exception:
                    await session.rollback()
                    raise
        except SQLAlchemyError as error:
            raise ExternalServiceError(
                "Không thể ghi topic-discovery version vào RAG database."
            ) from error
        return projection

    @staticmethod
    async def _write_run(session, projection: TopicDiscoveryResult) -> None:
        await session.execute(
            text(
                """INSERT INTO topic_discovery_runs (
                     workspace_id, discovery_run_id, graph_snapshot_id,
                     revision_set_checksum, taxonomy_version, input_checksum,
                     taxonomy_checksum, observed_at, status,
                     taxonomy_change_count, taxonomy_churn
                   ) VALUES (
                     :workspace_id, :run_id, :graph_snapshot_id,
                     :revision_set_checksum, :taxonomy_version, :input_checksum,
                     :taxonomy_checksum, :observed_at, 'complete',
                     :taxonomy_change_count, :taxonomy_churn)"""
            ),
            {
                "workspace_id": str(projection.workspace_id),
                "run_id": projection.discovery_run_id,
                "graph_snapshot_id": projection.graph_snapshot_id,
                "revision_set_checksum": projection.revision_set_checksum,
                "taxonomy_version": projection.taxonomy_version,
                "input_checksum": projection.input_checksum,
                "taxonomy_checksum": projection.taxonomy_checksum,
                "observed_at": projection.observed_at,
                "taxonomy_change_count": projection.taxonomy_change_count,
                "taxonomy_churn": projection.taxonomy_churn,
            },
        )

    @staticmethod
    async def _write_topics(session, projection: TopicDiscoveryResult) -> None:
        if not projection.topics:
            return
        await session.execute(
            text(
                """INSERT INTO topic_versions (
                     workspace_id, discovery_run_id, topic_id, name, aliases,
                     lifecycle, primary_parent_id, secondary_parent_ids,
                     promotion_evidence_count, discovery_version
                   ) VALUES (
                     :workspace_id, :run_id, :topic_id, :name,
                     CAST(:aliases AS jsonb), :lifecycle, :primary_parent_id,
                     CAST(:secondary_parent_ids AS jsonb),
                     :promotion_evidence_count, :discovery_version)"""
            ),
            [
                {
                    "workspace_id": str(projection.workspace_id),
                    "run_id": projection.discovery_run_id,
                    "topic_id": topic.topic_id,
                    "name": topic.name,
                    "aliases": json.dumps(topic.aliases),
                    "lifecycle": topic.lifecycle.value,
                    "primary_parent_id": topic.primary_parent_id,
                    "secondary_parent_ids": json.dumps(
                        [str(value) for value in topic.secondary_parent_ids]
                    ),
                    "promotion_evidence_count": topic.promotion_evidence_count,
                    "discovery_version": topic.discovery_version,
                }
                for topic in projection.topics
            ],
        )

    @staticmethod
    async def _write_memberships(session, projection: TopicDiscoveryResult) -> None:
        rows = [
            (topic.topic_id, membership)
            for topic in projection.topics
            for membership in topic.memberships
        ]
        if not rows:
            return
        await session.execute(
            text(
                """INSERT INTO topic_membership_versions (
                     workspace_id, discovery_run_id, membership_id, topic_id,
                     target_kind, target_id, confidence, derivation,
                     first_seen_run_id, last_seen_run_id,
                     supporting_evidence_ids
                   ) VALUES (
                     :workspace_id, :run_id, :membership_id, :topic_id,
                     :target_kind, :target_id, :confidence, :derivation,
                     :first_seen_run_id, :last_seen_run_id,
                     CAST(:supporting_evidence_ids AS jsonb))"""
            ),
            [
                {
                    "workspace_id": str(projection.workspace_id),
                    "run_id": projection.discovery_run_id,
                    "topic_id": topic_id,
                    "membership_id": membership.membership_id,
                    "target_kind": membership.target_kind.value,
                    "target_id": membership.target_id,
                    "confidence": membership.confidence,
                    "derivation": membership.derivation.value,
                    "first_seen_run_id": membership.first_seen_snapshot_id,
                    "last_seen_run_id": membership.last_seen_snapshot_id,
                    "supporting_evidence_ids": json.dumps(
                        [str(value) for value in membership.supporting_evidence_ids]
                    ),
                }
                for topic_id, membership in rows
            ],
        )

    @staticmethod
    async def _write_membership_revisions(
        session, projection: TopicDiscoveryResult
    ) -> None:
        if not projection.membership_revisions:
            return
        await session.execute(
            text(
                """INSERT INTO topic_membership_revision_evidence (
                     workspace_id, discovery_run_id, membership_id,
                     revision_id, chunk_id, supporting_evidence_ids
                   ) VALUES (
                     :workspace_id, :run_id, :membership_id,
                     :revision_id, :chunk_id,
                     CAST(:supporting_evidence_ids AS jsonb))"""
            ),
            [
                {
                    "workspace_id": str(projection.workspace_id),
                    "run_id": projection.discovery_run_id,
                    **item.model_dump(
                        mode="json",
                        exclude={"topic_id", "supporting_evidence_ids"},
                    ),
                    "supporting_evidence_ids": json.dumps(
                        [str(value) for value in item.supporting_evidence_ids]
                    ),
                }
                for item in projection.membership_revisions
            ],
        )

    @staticmethod
    async def _write_lineage(session, projection: TopicDiscoveryResult) -> None:
        if not projection.lineage:
            return
        await session.execute(
            text(
                """INSERT INTO topic_lineage_events (
                     workspace_id, discovery_run_id, lineage_id, event_type,
                     occurred_at, predecessor_ids, successor_ids, evidence_ids
                   ) VALUES (
                     :workspace_id, :run_id, :lineage_id, :event_type,
                     :occurred_at, CAST(:predecessor_ids AS jsonb),
                     CAST(:successor_ids AS jsonb), CAST(:evidence_ids AS jsonb))"""
            ),
            [
                {
                    "workspace_id": str(projection.workspace_id),
                    "run_id": projection.discovery_run_id,
                    "lineage_id": uuid5(
                        NAMESPACE_URL,
                        f"flae:topic-lineage:{projection.discovery_run_id}:{index}",
                    ),
                    "event_type": item.kind.value,
                    "occurred_at": item.occurred_at,
                    "predecessor_ids": json.dumps(
                        [str(value) for value in item.predecessor_ids]
                    ),
                    "successor_ids": json.dumps(
                        [str(value) for value in item.successor_ids]
                    ),
                    "evidence_ids": json.dumps(
                        [str(value) for value in item.evidence_ids]
                    ),
                }
                for index, item in enumerate(projection.lineage)
            ],
        )
