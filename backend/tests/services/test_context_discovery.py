from datetime import UTC, datetime
from uuid import UUID

import pytest

from app.schemas.agent_memory import MembershipDerivation, MembershipTargetKind
from app.schemas.context_discovery import (
    ContextDiscoveryPolicy,
    ContextEvidenceSignal,
)
from app.services.context_discovery_service import ContextDiscoveryService


WORKSPACE_ID = UUID("60000000-0000-0000-0000-000000000001")
TOPIC_RUN_ID = UUID("61000000-0000-0000-0000-000000000001")
REVISION_ID = UUID("62000000-0000-0000-0000-000000000001")
SOURCE_ID = UUID("63000000-0000-0000-0000-000000000001")
RELATIONSHIP_ID = UUID("64000000-0000-0000-0000-000000000001")
TOPIC_ID = UUID("64500000-0000-0000-0000-000000000001")
NOW = datetime(2026, 7, 30, tzinfo=UTC)


def _signal(
    index: int,
    name: str,
    context_type: str,
    *,
    source_id: UUID = SOURCE_ID,
    relationship_ids: tuple[UUID, ...] = (),
    topic_ids: tuple[UUID, ...] = (),
) -> ContextEvidenceSignal:
    return ContextEvidenceSignal(
        signal_id=UUID(f"65000000-0000-0000-0000-{index:012d}"),
        revision_id=REVISION_ID,
        chunk_id=f"chunk-{index}",
        source_id=source_id,
        candidate_name=name,
        context_type=context_type,
        target_kind=MembershipTargetKind.source,
        target_id=str(source_id),
        confidence=0.9,
        derivation=MembershipDerivation.combined,
        supporting_evidence_ids=(
            UUID(f"66000000-0000-0000-0000-{index:012d}"),
        ),
        graph_relationship_ids=relationship_ids,
        topic_ids=topic_ids,
    )


def _discover(signals, *, previous_contexts=(), topic_run_id=TOPIC_RUN_ID):
    return ContextDiscoveryService.discover(
        workspace_id=WORKSPACE_ID,
        topic_discovery_run_id=topic_run_id,
        revision_set_checksum="sha256:" + "c" * 64,
        signals=signals,
        discovery_version="context-v1",
        observed_at=NOW,
        policy=ContextDiscoveryPolicy(),
        previous_contexts=previous_contexts,
    )


def test_same_source_can_belong_to_multiple_contexts_without_copying_evidence() -> None:
    shared_evidence = UUID("66000000-0000-0000-0000-000000000099")
    project = _signal(1, "Aurora Project", "project").model_copy(
        update={"supporting_evidence_ids": (shared_evidence,)}
    )
    customer = _signal(2, "Aurora Customer", "customer").model_copy(
        update={"supporting_evidence_ids": (shared_evidence,)}
    )

    result = _discover((project, customer))

    memberships = [item for context in result.contexts for item in context.memberships]
    assert len(memberships) == 2
    assert {item.target_id for item in memberships} == {str(SOURCE_ID)}
    assert memberships[0].membership_id != memberships[1].membership_id
    assert {
        evidence
        for item in result.membership_revisions
        for evidence in item.supporting_evidence_ids
    } == {shared_evidence}


def test_reorder_and_small_update_preserve_context_identity_and_name() -> None:
    signals = (
        _signal(1, "Billing Platform", "product"),
        _signal(
            2,
            "Billing Platform",
            "product",
            source_id=UUID("63000000-0000-0000-0000-000000000002"),
        ),
    )
    first = _discover(signals)
    replay = _discover(
        tuple(reversed(signals)),
        previous_contexts=first.contexts,
        topic_run_id=UUID("61000000-0000-0000-0000-000000000002"),
    )

    assert replay.contexts[0].context_id == first.contexts[0].context_id
    assert replay.contexts[0].name == first.contexts[0].name
    assert replay.taxonomy_churn == 0.0


def test_cross_context_edges_remain_canonical_relationship_references() -> None:
    result = _discover(
        (
            _signal(1, "Aurora Project", "project", relationship_ids=(RELATIONSHIP_ID,)),
            _signal(2, "Billing Platform", "product", relationship_ids=(RELATIONSHIP_ID,)),
        )
    )

    assert len(result.graph_bridges) == 1
    bridge = result.graph_bridges[0]
    assert bridge.relationship_id == RELATIONSHIP_ID
    assert bridge.left_context_id != bridge.right_context_id
    assert bridge.supporting_evidence_ids


def test_context_keeps_topic_roots_for_catalog_navigation() -> None:
    result = _discover((_signal(1, "Aurora Project", "project", topic_ids=(TOPIC_ID,)),))

    assert result.contexts[0].primary_topic_root_ids == (TOPIC_ID,)
    assert result.contexts[0].lineage[0].kind.value == "created"
    assert result.contexts[0].lineage[0].evidence_ids


@pytest.mark.parametrize(
    ("name", "context_type"),
    (
        ("Aurora Project", "project"),
        ("Billing Platform", "product"),
        ("Security Team", "team"),
        ("Helios Customer", "customer"),
    ),
)
def test_supported_context_types_form_typed_candidates(name: str, context_type: str) -> None:
    result = _discover((_signal(1, name, context_type),))

    assert result.contexts[0].context_type == context_type
