from datetime import UTC, datetime
from uuid import UUID

import pytest

from app.core.exceptions import InvalidArgumentError
from app.schemas.agent_memory import (
    MembershipDerivation,
    MembershipTargetKind,
    TaxonomyLifecycle,
)
from app.schemas.topic_discovery import (
    TopicDiscoveryPolicy,
    TopicEvidenceWindow,
)
from app.services.knowledge.discovery.topic_service import TopicDiscoveryService


WORKSPACE_ID = UUID("10000000-0000-0000-0000-000000000001")
GRAPH_SNAPSHOT_ID = UUID("20000000-0000-0000-0000-000000000001")
REVISION_ID = UUID("30000000-0000-0000-0000-000000000001")
NOW = datetime(2026, 7, 30, tzinfo=UTC)


def _window(
    index: int,
    topic_name: str,
    *,
    chunk_id: str | None = None,
    target_id: str | None = None,
) -> TopicEvidenceWindow:
    evidence_id = UUID(f"40000000-0000-0000-0000-{index:012d}")
    return TopicEvidenceWindow(
        window_id=UUID(f"50000000-0000-0000-0000-{index:012d}"),
        revision_id=REVISION_ID,
        chunk_id=chunk_id or f"chunk-{index}",
        candidate_name=topic_name,
        target_kind=MembershipTargetKind.assertion,
        target_id=target_id or f"assertion-{index}",
        confidence=0.9,
        derivation=MembershipDerivation.combined,
        supporting_evidence_ids=(evidence_id,),
    )


def _discover(
    windows: tuple[TopicEvidenceWindow, ...],
    *,
    previous_topics=(),
):
    return TopicDiscoveryService.discover(
        workspace_id=WORKSPACE_ID,
        graph_snapshot_id=GRAPH_SNAPSHOT_ID,
        revision_set_checksum="sha256:" + "a" * 64,
        evidence_windows=windows,
        taxonomy_version="taxonomy-v1",
        observed_at=NOW,
        policy=TopicDiscoveryPolicy(),
        previous_topics=previous_topics,
    )


def test_one_chunk_cannot_promote_a_topic() -> None:
    result = _discover((_window(1, "Billing"),))

    assert len(result.topics) == 1
    assert result.topics[0].lifecycle is TaxonomyLifecycle.candidate
    assert result.topics[0].promotion_evidence_count == 1


def test_distinct_chunks_promote_and_keep_revision_scoped_memberships() -> None:
    result = _discover(
        (
            _window(1, "Billing", chunk_id="chunk-a"),
            _window(2, "Billing", chunk_id="chunk-b"),
        )
    )

    topic = result.topics[0]
    assert topic.lifecycle is TaxonomyLifecycle.active
    assert topic.promotion_evidence_count == 2
    assert len(topic.memberships) == 2
    assert {item.topic_id for item in result.membership_revisions} == {
        topic.topic_id
    }
    assert {item.revision_id for item in result.membership_revisions} == {
        REVISION_ID
    }
    assert {item.chunk_id for item in result.membership_revisions} == {
        "chunk-a",
        "chunk-b",
    }
    assert all(item.supporting_evidence_ids for item in result.membership_revisions)


def test_reordered_replay_preserves_identity_and_checksums() -> None:
    windows = (
        _window(1, "Usage Billing"),
        _window(2, "Usage Billing"),
        _window(3, "Invoice Processing"),
        _window(4, "Invoice Processing"),
    )
    first = _discover(windows)
    replay = _discover(tuple(reversed(windows)), previous_topics=first.topics)

    assert [topic.topic_id for topic in first.topics] == [
        topic.topic_id for topic in replay.topics
    ]
    assert replay.input_checksum == first.input_checksum
    assert replay.taxonomy_checksum == first.taxonomy_checksum
    assert replay.taxonomy_churn == 0.0


def test_same_evidence_target_can_belong_to_multiple_topics() -> None:
    result = _discover(
        (
            _window(1, "Billing", target_id="assertion-shared"),
            _window(2, "Billing"),
            _window(3, "Incident Response", target_id="assertion-shared"),
            _window(4, "Incident Response"),
        )
    )

    shared = [
        membership
        for topic in result.topics
        for membership in topic.memberships
        if membership.target_id == "assertion-shared"
    ]
    assert len(shared) == 2
    assert shared[0].membership_id != shared[1].membership_id


def test_identical_duplicate_window_is_an_idempotent_noop() -> None:
    first = _window(1, "Billing")

    single = _discover((first,))
    duplicate = _discover((first, first))

    assert duplicate.input_checksum == single.input_checksum
    assert duplicate.taxonomy_checksum == single.taxonomy_checksum
    assert duplicate.membership_revisions == single.membership_revisions


def test_conflicting_duplicate_window_is_rejected() -> None:
    first = _window(1, "Billing")
    conflict = first.model_copy(update={"target_id": "different-assertion"})

    with pytest.raises(InvalidArgumentError, match="conflicting evidence"):
        _discover((first, conflict))


def test_multiple_derivations_for_one_membership_are_recorded_as_combined() -> None:
    first = _window(1, "Billing", target_id="assertion-shared")
    second = _window(2, "Billing", target_id="assertion-shared").model_copy(
        update={"derivation": MembershipDerivation.graph_overlap}
    )

    result = _discover((first, second))

    assert result.topics[0].memberships[0].derivation is MembershipDerivation.combined


def test_new_graph_snapshot_does_not_count_evidence_freshness_as_taxonomy_churn() -> None:
    windows = (_window(1, "Billing"), _window(2, "Billing"))
    first = _discover(windows)

    refreshed = TopicDiscoveryService.discover(
        workspace_id=WORKSPACE_ID,
        graph_snapshot_id=UUID("20000000-0000-0000-0000-000000000002"),
        revision_set_checksum="sha256:" + "b" * 64,
        evidence_windows=windows,
        taxonomy_version="taxonomy-v1",
        observed_at=NOW,
        policy=TopicDiscoveryPolicy(),
        previous_topics=first.topics,
    )

    assert refreshed.topics[0].topic_id == first.topics[0].topic_id
    assert refreshed.taxonomy_churn == 0.0


def test_merge_and_split_emit_reversible_lineage() -> None:
    billing = _discover(
        (_window(1, "Billing"), _window(2, "Billing"))
    ).topics[0]
    invoicing = _discover(
        (_window(3, "Invoicing"), _window(4, "Invoicing"))
    ).topics[0].model_copy(update={"aliases": ("Billing",)})
    merged = _discover(
        (_window(5, "Billing"), _window(6, "Billing")),
        previous_topics=(billing, invoicing),
    )

    assert any(item.kind.value == "merged" for item in merged.lineage)
    merge = next(item for item in merged.lineage if item.kind.value == "merged")
    assert set(merge.predecessor_ids) == {billing.topic_id, invoicing.topic_id}
    assert merge.evidence_ids

    platform = _discover(
        (
            _window(7, "Platform", target_id="runtime-a"),
            _window(8, "Platform", target_id="runtime-b"),
            _window(9, "Platform", target_id="security-a"),
            _window(10, "Platform", target_id="security-b"),
        )
    ).topics[0]
    split = _discover(
        (
            _window(11, "Platform Runtime", target_id="runtime-a"),
            _window(12, "Platform Runtime", target_id="runtime-b"),
            _window(13, "Platform Security", target_id="security-a"),
            _window(14, "Platform Security", target_id="security-b"),
        ),
        previous_topics=(platform,),
    )

    split_events = [item for item in split.lineage if item.kind.value == "split"]
    assert split_events
    assert split_events[0].predecessor_ids == (platform.topic_id,)
    assert len(split_events[0].successor_ids) == 2
    assert split_events[0].evidence_ids


@pytest.mark.asyncio
async def test_workspace_discovery_loads_previous_taxonomy_and_persists_result() -> None:
    previous = _discover((_window(1, "Billing"), _window(2, "Billing")))

    class FakeRepository:
        def __init__(self):
            self.persisted = None

        async def load_latest(self, workspace_id):
            assert workspace_id == WORKSPACE_ID
            return previous.topics

        async def persist(self, projection):
            self.persisted = projection
            return projection

    repository = FakeRepository()
    service = TopicDiscoveryService(repository=repository)

    updated = await service.discover_workspace(
        workspace_id=WORKSPACE_ID,
        graph_snapshot_id=GRAPH_SNAPSHOT_ID,
        revision_set_checksum="sha256:" + "b" * 64,
        evidence_windows=(_window(3, "Billing"),),
        taxonomy_version="taxonomy-v1",
        observed_at=NOW,
        policy=TopicDiscoveryPolicy(),
    )

    assert updated.topics[0].topic_id == previous.topics[0].topic_id
    assert updated.topics[0].lifecycle is TaxonomyLifecycle.active
    assert repository.persisted == updated
