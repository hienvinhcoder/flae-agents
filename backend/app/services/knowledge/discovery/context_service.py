"""Deterministic overlapping-context discovery over topic/source signals."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from uuid import NAMESPACE_URL, UUID, uuid5

from app.core.exceptions import InvalidArgumentError
from app.schemas.agent_memory_discovery import (
    Context,
    EvidenceMembership,
    MembershipDerivation,
    TaxonomyLifecycle,
    TaxonomyLineage,
    TaxonomyLineageKind,
)
from app.schemas.context_discovery import (
    ContextDiscoveryPolicy,
    ContextDiscoveryResult,
    ContextEvidenceSignal,
    ContextGraphBridge,
    ContextMembershipRevision,
)
from app.services.knowledge.discovery.topic_helpers import checksum, semantic_key


class ContextDiscoveryService:
    @staticmethod
    def discover(
        *,
        workspace_id: UUID,
        topic_discovery_run_id: UUID,
        revision_set_checksum: str,
        signals: tuple[ContextEvidenceSignal, ...],
        discovery_version: str,
        observed_at: datetime,
        policy: ContextDiscoveryPolicy,
        previous_contexts: tuple[Context, ...] = (),
    ) -> ContextDiscoveryResult:
        ordered = ContextDiscoveryService._canonicalize(signals)
        input_checksum = checksum([item.model_dump(mode="json") for item in ordered])
        run_id = uuid5(
            NAMESPACE_URL,
            f"flae:context-discovery:{workspace_id}:{topic_discovery_run_id}:"
            f"{discovery_version}:{input_checksum}",
        )
        grouped = ContextDiscoveryService._group(ordered)
        assignments = ContextDiscoveryService._assign(
            grouped, previous_contexts, policy.resolution_overlap_threshold
        )
        contexts, revisions, context_ids = ContextDiscoveryService._contexts(
            workspace_id,
            run_id,
            discovery_version,
            observed_at,
            grouped,
            assignments,
            policy,
        )
        bridges = ContextDiscoveryService._bridges(grouped, context_ids)
        context_checksum = checksum(
            [ContextDiscoveryService._material(item) for item in contexts]
            + [item.model_dump(mode="json") for item in bridges]
        )
        change_count = ContextDiscoveryService._change_count(
            previous_contexts, contexts
        )
        denominator = max(len(previous_contexts), len(contexts), 1)
        return ContextDiscoveryResult(
            discovery_run_id=run_id,
            workspace_id=workspace_id,
            topic_discovery_run_id=topic_discovery_run_id,
            revision_set_checksum=revision_set_checksum,
            discovery_version=discovery_version,
            input_checksum=input_checksum,
            context_checksum=context_checksum,
            observed_at=observed_at,
            contexts=contexts,
            membership_revisions=revisions,
            graph_bridges=bridges,
            taxonomy_change_count=change_count,
            taxonomy_churn=min(1.0, change_count / denominator),
        )

    @staticmethod
    def _canonicalize(
        signals: tuple[ContextEvidenceSignal, ...],
    ) -> tuple[ContextEvidenceSignal, ...]:
        unique: dict[UUID, ContextEvidenceSignal] = {}
        for signal in signals:
            existing = unique.get(signal.signal_id)
            if existing is not None and existing != signal:
                raise InvalidArgumentError(
                    "A context signal ID cannot describe conflicting evidence."
                )
            unique[signal.signal_id] = signal
        return tuple(sorted(unique.values(), key=lambda item: str(item.signal_id)))

    @staticmethod
    def _group(signals):
        grouped = defaultdict(list)
        for signal in signals:
            key = semantic_key(signal.candidate_name)
            if key:
                grouped[key].append(signal)
        return {
            key: tuple(sorted(items, key=lambda item: str(item.signal_id)))
            for key, items in sorted(grouped.items())
        }

    @staticmethod
    def _assign(grouped, previous_contexts, threshold):
        unused = {
            context.context_id: context
            for context in previous_contexts
            if context.lifecycle not in {
                TaxonomyLifecycle.merged,
                TaxonomyLifecycle.archived,
            }
        }
        assignments = {}
        for key, signals in grouped.items():
            target_ids = {item.target_id for item in signals}
            scored = []
            for context in unused.values():
                names = {
                    semantic_key(context.name),
                    *(semantic_key(alias) for alias in context.aliases),
                }
                previous_ids = {item.target_id for item in context.memberships}
                union = target_ids | previous_ids
                score = (
                    1.0
                    if key in names
                    else len(target_ids & previous_ids) / len(union)
                    if union
                    else 0.0
                )
                if score >= threshold:
                    scored.append((score, context))
            selected = sorted(scored, key=lambda item: (-item[0], str(item[1].context_id)))
            assignments[key] = selected[0][1] if selected else None
            if selected:
                unused.pop(selected[0][1].context_id)
        return assignments

    @staticmethod
    def _contexts(
        workspace_id,
        run_id,
        discovery_version,
        observed_at,
        grouped,
        assignments,
        policy,
    ):
        contexts = []
        revisions = []
        context_ids = {}
        for key, signals in grouped.items():
            previous = assignments[key]
            context_id = previous.context_id if previous else uuid5(
                NAMESPACE_URL, f"flae:context:{workspace_id}:{key}"
            )
            context_ids[key] = context_id
            memberships, provenance = ContextDiscoveryService._memberships(
                workspace_id, run_id, context_id, signals, previous
            )
            revisions.extend(provenance)
            source_count = len({item.source_id for item in signals})
            active = source_count >= policy.promotion_min_distinct_sources or (
                previous is not None
                and previous.lifecycle is TaxonomyLifecycle.active
            )
            confidence = sum(item.confidence for item in signals) / len(signals)
            proposed = sorted(
                {item.candidate_name for item in signals}, key=str.casefold
            )[0]
            aliases = {alias for item in signals for alias in item.aliases}
            topic_ids = tuple(
                sorted({topic_id for item in signals for topic_id in item.topic_ids}, key=str)
            )
            if previous is not None:
                aliases.update(previous.aliases)
            lineage = previous.lineage if previous is not None else (
                TaxonomyLineage(
                    kind=TaxonomyLineageKind.created,
                    occurred_at=observed_at,
                    snapshot_id=run_id,
                    successor_ids=(context_id,),
                    evidence_ids=tuple(
                        sorted(
                            {
                                evidence_id
                                for signal in signals
                                for evidence_id in signal.supporting_evidence_ids
                            },
                            key=str,
                        )
                    )[:1_000],
                ),
            )
            contexts.append(
                Context(
                    context_id=context_id,
                    workspace_id=workspace_id,
                    name=previous.name if previous and active else proposed,
                    aliases=tuple(sorted(aliases, key=str.casefold)),
                    context_type=(previous.context_type if previous else signals[0].context_type),
                    lifecycle=(TaxonomyLifecycle.active if active else TaxonomyLifecycle.candidate),
                    confidence=confidence,
                    stability_score=1.0 if previous else min(1.0, source_count / 2),
                    primary_topic_root_ids=topic_ids,
                    memberships=memberships,
                    lineage=lineage,
                    discovery_version=discovery_version,
                )
            )
        return (
            tuple(sorted(contexts, key=lambda item: str(item.context_id))),
            tuple(sorted(revisions, key=lambda item: (str(item.context_id), str(item.membership_id), item.chunk_id))),
            context_ids,
        )

    @staticmethod
    def _memberships(workspace_id, run_id, context_id, signals, previous):
        grouped = defaultdict(list)
        for signal in signals:
            grouped[(signal.target_kind.value, signal.target_id)].append(signal)
        old = (
            {(item.target_kind.value, item.target_id): item for item in previous.memberships}
            if previous
            else {}
        )
        memberships = []
        revisions = []
        for target, items in sorted(grouped.items()):
            prior = old.get(target)
            membership_id = prior.membership_id if prior else uuid5(
                NAMESPACE_URL,
                f"flae:context-membership:{workspace_id}:{context_id}:{target[0]}:{target[1]}",
            )
            evidence = tuple(sorted({value for item in items for value in item.supporting_evidence_ids}, key=str))
            derivations = {item.derivation for item in items}
            memberships.append(
                EvidenceMembership(
                    membership_id=membership_id,
                    target_kind=items[0].target_kind,
                    target_id=target[1],
                    confidence=max(item.confidence for item in items),
                    derivation=(items[0].derivation if len(derivations) == 1 else MembershipDerivation.combined),
                    first_seen_snapshot_id=(prior.first_seen_snapshot_id if prior else run_id),
                    last_seen_snapshot_id=run_id,
                    supporting_evidence_ids=evidence,
                )
            )
            for item in items:
                revisions.append(
                    ContextMembershipRevision(
                        membership_id=membership_id,
                        context_id=context_id,
                        revision_id=item.revision_id,
                        chunk_id=item.chunk_id,
                        supporting_evidence_ids=item.supporting_evidence_ids,
                    )
                )
        return tuple(memberships), revisions

    @staticmethod
    def _bridges(grouped, context_ids):
        contexts_by_relationship = defaultdict(set)
        evidence_by_relationship = defaultdict(set)
        for key, signals in grouped.items():
            for signal in signals:
                for relationship_id in signal.graph_relationship_ids:
                    contexts_by_relationship[relationship_id].add(context_ids[key])
                    evidence_by_relationship[relationship_id].update(signal.supporting_evidence_ids)
        bridges = []
        for relationship_id, context_ids_for_edge in contexts_by_relationship.items():
            ordered = sorted(context_ids_for_edge, key=str)
            for index, left in enumerate(ordered):
                for right in ordered[index + 1 :]:
                    bridges.append(
                        ContextGraphBridge(
                            relationship_id=relationship_id,
                            left_context_id=left,
                            right_context_id=right,
                            supporting_evidence_ids=tuple(sorted(evidence_by_relationship[relationship_id], key=str))[:1_000],
                        )
                    )
        return tuple(sorted(bridges, key=lambda item: (str(item.relationship_id), str(item.left_context_id), str(item.right_context_id))))

    @staticmethod
    def _material(context):
        return {
            "context_id": str(context.context_id),
            "name": context.name,
            "aliases": context.aliases,
            "context_type": context.context_type,
            "lifecycle": context.lifecycle.value,
            "memberships": [item.model_dump(mode="json") for item in context.memberships],
        }

    @staticmethod
    def _change_count(previous, current):
        def identity(item):
            return item.name, item.aliases, item.context_type, item.lifecycle.value

        before = {item.context_id: identity(item) for item in previous}
        after = {item.context_id: identity(item) for item in current}
        return len(set(before) ^ set(after)) + sum(
            before[item_id] != after[item_id] for item_id in set(before) & set(after)
        )
