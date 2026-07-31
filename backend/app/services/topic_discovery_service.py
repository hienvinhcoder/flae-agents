"""Deterministic, evidence-backed topic discovery over graph evidence windows."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Protocol
from uuid import NAMESPACE_URL, UUID, uuid5

from app.schemas.agent_memory_discovery import (
    EvidenceMembership,
    MembershipDerivation,
    TaxonomyLifecycle,
    TaxonomyLineage,
    TaxonomyLineageKind,
    Topic,
)
from app.schemas.topic_discovery import (
    TopicDiscoveryPolicy,
    TopicDiscoveryResult,
    TopicEvidenceWindow,
    TopicMembershipRevision,
)
from app.services.topic_discovery_helpers import (
    canonicalize_windows,
    checksum,
    match_score,
    semantic_key,
    taxonomy_change_count,
    topic_material,
)


class TopicDiscoveryStore(Protocol):
    async def load_latest(self, workspace_id: UUID) -> tuple[Topic, ...]: ...
    async def persist(
        self, projection: TopicDiscoveryResult
    ) -> TopicDiscoveryResult: ...


class TopicDiscoveryService:
    def __init__(self, *, repository: TopicDiscoveryStore) -> None:
        self._repository = repository

    async def discover_workspace(
        self,
        *,
        workspace_id: UUID,
        graph_snapshot_id: UUID,
        revision_set_checksum: str,
        evidence_windows: tuple[TopicEvidenceWindow, ...],
        taxonomy_version: str,
        observed_at: datetime,
        policy: TopicDiscoveryPolicy,
    ) -> TopicDiscoveryResult:
        previous_topics = await self._repository.load_latest(workspace_id)
        projection = self.discover(
            workspace_id=workspace_id,
            graph_snapshot_id=graph_snapshot_id,
            revision_set_checksum=revision_set_checksum,
            evidence_windows=evidence_windows,
            taxonomy_version=taxonomy_version,
            observed_at=observed_at,
            policy=policy,
            previous_topics=previous_topics,
        )
        return await self._repository.persist(projection)

    @staticmethod
    def discover(
        *,
        workspace_id: UUID,
        graph_snapshot_id: UUID,
        revision_set_checksum: str,
        evidence_windows: tuple[TopicEvidenceWindow, ...],
        taxonomy_version: str,
        observed_at: datetime,
        policy: TopicDiscoveryPolicy,
        previous_topics: tuple[Topic, ...] = (),
    ) -> TopicDiscoveryResult:
        ordered_windows = canonicalize_windows(evidence_windows)
        input_checksum = checksum(
            [item.model_dump(mode="json") for item in ordered_windows]
        )
        run_id = uuid5(
            NAMESPACE_URL,
            f"flae:topic-discovery:{workspace_id}:{graph_snapshot_id}:"
            f"{taxonomy_version}:{input_checksum}",
        )
        grouped = TopicDiscoveryService._group_windows(ordered_windows)
        matches = TopicDiscoveryService._matches(grouped, previous_topics, policy)
        assignments = TopicDiscoveryService._assign_existing(matches)
        topics, revisions, lineage = TopicDiscoveryService._build_topics(
            workspace_id=workspace_id,
            run_id=run_id,
            taxonomy_version=taxonomy_version,
            observed_at=observed_at,
            grouped=grouped,
            previous_topics=previous_topics,
            matches=matches,
            assignments=assignments,
            policy=policy,
        )
        material = [topic_material(topic) for topic in topics]
        taxonomy_checksum = checksum(material)
        change_count = taxonomy_change_count(previous_topics, topics)
        denominator = max(len(previous_topics), len(topics), 1)
        return TopicDiscoveryResult(
            discovery_run_id=run_id,
            workspace_id=workspace_id,
            graph_snapshot_id=graph_snapshot_id,
            revision_set_checksum=revision_set_checksum,
            taxonomy_version=taxonomy_version,
            input_checksum=input_checksum,
            taxonomy_checksum=taxonomy_checksum,
            observed_at=observed_at,
            topics=topics,
            membership_revisions=revisions,
            lineage=lineage,
            taxonomy_change_count=change_count,
            taxonomy_churn=min(1.0, change_count / denominator),
        )

    @staticmethod
    def _group_windows(
        windows: tuple[TopicEvidenceWindow, ...],
    ) -> dict[str, tuple[TopicEvidenceWindow, ...]]:
        grouped: dict[str, list[TopicEvidenceWindow]] = defaultdict(list)
        for window in windows:
            key = semantic_key(window.candidate_name)
            if key:
                grouped[key].append(window)
        return {
            key: tuple(sorted(items, key=lambda item: str(item.window_id)))
            for key, items in sorted(grouped.items())
        }

    @staticmethod
    def _matches(
        grouped: dict[str, tuple[TopicEvidenceWindow, ...]],
        previous_topics: tuple[Topic, ...],
        policy: TopicDiscoveryPolicy,
    ) -> dict[str, tuple[tuple[Topic, float], ...]]:
        result: dict[str, tuple[tuple[Topic, float], ...]] = {}
        eligible = tuple(
            topic
            for topic in previous_topics
            if topic.lifecycle not in {TaxonomyLifecycle.merged, TaxonomyLifecycle.archived}
        )
        for key, windows in grouped.items():
            scored = [
                (topic, match_score(key, windows, topic)) for topic in eligible
            ]
            result[key] = tuple(
                sorted(
                    (
                        item
                        for item in scored
                        if item[1] >= policy.resolution_overlap_threshold
                    ),
                    key=lambda item: (-item[1], str(item[0].topic_id)),
                )
            )
        return result

    @staticmethod
    def _assign_existing(
        matches: dict[str, tuple[tuple[Topic, float], ...]],
    ) -> dict[str, Topic | None]:
        preferred_key: dict[UUID, str] = {}
        topic_candidates: dict[UUID, list[tuple[float, str]]] = defaultdict(list)
        for key, candidates in matches.items():
            for topic, score in candidates:
                topic_candidates[topic.topic_id].append((score, key))
        for topic_id, candidates in topic_candidates.items():
            preferred_key[topic_id] = sorted(
                candidates, key=lambda item: (-item[0], item[1])
            )[0][1]
        assignments: dict[str, Topic | None] = {}
        for key, candidates in matches.items():
            available = [
                topic for topic, _ in candidates if preferred_key[topic.topic_id] == key
            ]
            assignments[key] = available[0] if available else None
        return assignments

    @staticmethod
    def _build_topics(
        *,
        workspace_id: UUID,
        run_id: UUID,
        taxonomy_version: str,
        observed_at,
        grouped: dict[str, tuple[TopicEvidenceWindow, ...]],
        previous_topics: tuple[Topic, ...],
        matches: dict[str, tuple[tuple[Topic, float], ...]],
        assignments: dict[str, Topic | None],
        policy: TopicDiscoveryPolicy,
    ) -> tuple[
        tuple[Topic, ...],
        tuple[TopicMembershipRevision, ...],
        tuple[TaxonomyLineage, ...],
    ]:
        topics: list[Topic] = []
        revisions: list[TopicMembershipRevision] = []
        topic_ids_by_key: dict[str, UUID] = {}
        for key, windows in grouped.items():
            previous = assignments[key]
            topic_id = previous.topic_id if previous else uuid5(
                NAMESPACE_URL, f"flae:topic:{workspace_id}:{key}"
            )
            topic_ids_by_key[key] = topic_id
            memberships, provenance = TopicDiscoveryService._memberships(
                workspace_id, topic_id, run_id, windows, previous
            )
            revisions.extend(provenance)
            distinct_chunks = len({window.chunk_id for window in windows})
            promotion_evidence_count = max(
                distinct_chunks,
                previous.promotion_evidence_count if previous is not None else 0,
            )
            lifecycle = (
                TaxonomyLifecycle.active
                if promotion_evidence_count >= policy.promotion_min_distinct_chunks
                or (previous is not None and previous.lifecycle is TaxonomyLifecycle.active)
                else TaxonomyLifecycle.candidate
            )
            aliases = {
                alias for window in windows for alias in window.aliases if alias.strip()
            }
            if previous is not None:
                aliases.update(previous.aliases)
            proposed_name = sorted(
                {window.candidate_name for window in windows},
                key=lambda value: (value.casefold(), value),
            )[0]
            name = (
                previous.name
                if previous is not None
                and previous.lifecycle is TaxonomyLifecycle.active
                else proposed_name
            )
            topics.append(
                Topic(
                    topic_id=topic_id,
                    workspace_id=workspace_id,
                    name=name,
                    aliases=tuple(sorted(aliases, key=str.casefold)),
                    lifecycle=lifecycle,
                    memberships=memberships,
                    promotion_evidence_count=promotion_evidence_count,
                    discovery_version=taxonomy_version,
                )
            )
        ordered_topics = tuple(sorted(topics, key=lambda item: str(item.topic_id)))
        lineage = TopicDiscoveryService._lineage(
            run_id,
            observed_at,
            grouped,
            previous_topics,
            matches,
            topic_ids_by_key,
        )
        topics_with_lineage = tuple(
            topic.model_copy(
                update={
                    "lineage": tuple(
                        event
                        for event in lineage
                        if topic.topic_id in event.successor_ids
                    )
                }
            )
            for topic in ordered_topics
        )
        return (
            topics_with_lineage,
            tuple(
                sorted(
                    revisions,
                    key=lambda item: (
                        str(item.topic_id),
                        str(item.membership_id),
                        str(item.revision_id),
                        item.chunk_id,
                    ),
                )
            ),
            lineage,
        )

    @staticmethod
    def _memberships(workspace_id, topic_id, run_id, windows, previous):
        grouped: dict[tuple[str, str], list[TopicEvidenceWindow]] = defaultdict(list)
        for window in windows:
            grouped[(window.target_kind.value, window.target_id)].append(window)
        previous_by_target = (
            {(item.target_kind.value, item.target_id): item for item in previous.memberships}
            if previous is not None
            else {}
        )
        memberships: list[EvidenceMembership] = []
        revisions: list[TopicMembershipRevision] = []
        for target, items in sorted(grouped.items()):
            first = previous_by_target.get(target)
            membership_id = first.membership_id if first else uuid5(
                NAMESPACE_URL,
                f"flae:topic-membership:{workspace_id}:{topic_id}:{target[0]}:{target[1]}",
            )
            evidence_ids = tuple(
                sorted(
                    {evidence for item in items for evidence in item.supporting_evidence_ids},
                    key=str,
                )
            )
            memberships.append(
                EvidenceMembership(
                    membership_id=membership_id,
                    target_kind=items[0].target_kind,
                    target_id=target[1],
                    confidence=max(item.confidence for item in items),
                    derivation=(
                        items[0].derivation
                        if len({item.derivation for item in items}) == 1
                        else MembershipDerivation.combined
                    ),
                    first_seen_snapshot_id=(
                        first.first_seen_snapshot_id if first is not None else run_id
                    ),
                    last_seen_snapshot_id=run_id,
                    supporting_evidence_ids=evidence_ids,
                )
            )
            revision_evidence: dict[tuple[UUID, str], set[UUID]] = defaultdict(set)
            for item in items:
                revision_evidence[(item.revision_id, item.chunk_id)].update(
                    item.supporting_evidence_ids
                )
            revisions.extend(
                TopicMembershipRevision(
                    membership_id=membership_id,
                    topic_id=topic_id,
                    revision_id=revision_id,
                    chunk_id=chunk_id,
                    supporting_evidence_ids=tuple(sorted(evidence, key=str)),
                )
                for (revision_id, chunk_id), evidence in sorted(
                    revision_evidence.items(), key=lambda item: (str(item[0][0]), item[0][1])
                )
            )
        return tuple(memberships), revisions

    @staticmethod
    def _lineage(
        run_id,
        observed_at,
        grouped,
        previous_topics,
        matches,
        topic_ids_by_key,
    ):
        events: list[TaxonomyLineage] = []
        matched_successors: dict[UUID, set[UUID]] = defaultdict(set)
        evidence_by_successor: dict[UUID, set[UUID]] = defaultdict(set)
        for key, candidates in matches.items():
            successor = topic_ids_by_key[key]
            evidence_ids = {
                evidence_id
                for window in grouped[key]
                for evidence_id in window.supporting_evidence_ids
            }
            evidence_by_successor[successor].update(evidence_ids)
            for predecessor, _ in candidates:
                matched_successors[predecessor.topic_id].add(successor)
            predecessor_ids = tuple(sorted({item[0].topic_id for item in candidates}, key=str))
            if len(predecessor_ids) > 1:
                events.append(
                    TaxonomyLineage(
                        kind=TaxonomyLineageKind.merged,
                        occurred_at=observed_at,
                        snapshot_id=run_id,
                        predecessor_ids=predecessor_ids,
                        successor_ids=(successor,),
                        evidence_ids=tuple(sorted(evidence_ids, key=str))[:1_000],
                    )
                )
            elif not predecessor_ids:
                events.append(
                    TaxonomyLineage(
                        kind=TaxonomyLineageKind.created,
                        occurred_at=observed_at,
                        snapshot_id=run_id,
                        successor_ids=(successor,),
                        evidence_ids=tuple(sorted(evidence_ids, key=str))[:1_000],
                    )
                )
        for predecessor in previous_topics:
            successors = tuple(sorted(matched_successors[predecessor.topic_id], key=str))
            if len(successors) > 1:
                evidence_ids = {
                    evidence_id
                    for successor in successors
                    for evidence_id in evidence_by_successor[successor]
                }
                events.append(
                    TaxonomyLineage(
                        kind=TaxonomyLineageKind.split_event,
                        occurred_at=observed_at,
                        snapshot_id=run_id,
                        predecessor_ids=(predecessor.topic_id,),
                        successor_ids=successors,
                        evidence_ids=tuple(sorted(evidence_ids, key=str))[:1_000],
                    )
                )
        return tuple(
            sorted(events, key=lambda item: (item.kind.value, tuple(map(str, item.successor_ids))))
        )
