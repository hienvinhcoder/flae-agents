from datetime import UTC, datetime, timedelta
from uuid import UUID

from app.schemas.agent_memory import AssertionPolarity, EvidenceCitation, EvidenceProvenance
from app.schemas.memory_state import (
    ExpectedEvidenceRule,
    MemoryStateAssertion,
    MemoryStateProjectionInput,
)
from app.services.knowledge.memory_state.service import MemoryStateService


WORKSPACE_ID = UUID("81000000-0000-0000-0000-000000000001")
SUBJECT_ID = UUID("81000000-0000-0000-0000-000000000002")
DOCUMENT_ID = UUID("81000000-0000-0000-0000-000000000003")
NOW = datetime(2026, 7, 31, 12, tzinfo=UTC)


def _assertion(
    index: int,
    *,
    revision_order: int,
    object_value: str,
    polarity: AssertionPolarity = AssertionPolarity.affirmed,
    is_current: bool = True,
    valid_from: datetime | None = None,
    valid_to: datetime | None = None,
    source_modified_at: datetime = NOW,
) -> MemoryStateAssertion:
    assertion_id = UUID(f"82000000-0000-0000-0000-{index:012d}")
    revision_id = UUID(
        f"83000000-0000-0000-0000-{revision_order:012d}"
    )
    provenance = EvidenceProvenance(
        workspace_id=WORKSPACE_ID,
        source_id=UUID("84000000-0000-0000-0000-000000000001"),
        document_id=DOCUMENT_ID,
        revision_id=revision_id,
        chunk_id=f"chunk-{index}",
        source_name="Atlas policy",
        source_type="notion",
        location={"kind": "section", "heading_path": ("Policy",)},
        source_modified_at=source_modified_at,
        ingested_at=NOW,
        content_hash="sha256:" + f"{index:064x}",
    )
    return MemoryStateAssertion(
        assertion_id=assertion_id,
        subject_entity_id=SUBJECT_ID,
        predicate="has_status",
        object_value=object_value,
        polarity=polarity,
        confidence=0.9,
        valid_from=valid_from,
        valid_to=valid_to,
        revision_id=revision_id,
        revision_order=revision_order,
        is_current=is_current,
        citation=EvidenceCitation(
            assertion_id=assertion_id,
            provenance=provenance,
            evidence_start=0,
            evidence_end=12,
        ),
    )


def _input(
    assertions: tuple[MemoryStateAssertion, ...],
    *,
    rules: tuple[ExpectedEvidenceRule, ...] = (),
) -> MemoryStateProjectionInput:
    return MemoryStateProjectionInput(
        workspace_id=WORKSPACE_ID,
        graph_snapshot_id=UUID("85000000-0000-0000-0000-000000000001"),
        revision_set_checksum="sha256:" + "a" * 64,
        projection_version="memory-state-v1",
        inspected_at=NOW,
        assertions=assertions,
        expected_evidence_rules=rules,
    )


def test_change_finding_preserves_ordered_before_and_after_evidence() -> None:
    before = _assertion(
        1, revision_order=1, object_value="planned", is_current=False
    )
    after = _assertion(2, revision_order=2, object_value="launched")

    projection = MemoryStateService.project(_input((after, before)))

    assert len(projection.changes) == 1
    finding = projection.changes[0]
    assert finding.before == (before.citation,)
    assert finding.after == (after.citation,)
    assert finding.before_revision_order == 1
    assert finding.after_revision_order == 2


def test_contradictions_require_temporal_overlap_and_incompatible_evidence() -> None:
    first = _assertion(
        1,
        revision_order=1,
        object_value="approved",
        valid_from=NOW - timedelta(days=2),
        valid_to=NOW + timedelta(days=2),
    )
    object_conflict = _assertion(
        2,
        revision_order=1,
        object_value="rejected",
        valid_from=NOW - timedelta(days=1),
        valid_to=NOW + timedelta(days=1),
    )
    negation = _assertion(
        3,
        revision_order=1,
        object_value="approved",
        polarity=AssertionPolarity.negated,
        valid_from=NOW - timedelta(hours=1),
        valid_to=NOW + timedelta(hours=1),
    )
    non_overlapping = _assertion(
        4,
        revision_order=1,
        object_value="archived",
        valid_from=NOW + timedelta(days=3),
        valid_to=NOW + timedelta(days=4),
    )
    expired_conflict = _assertion(
        5,
        revision_order=1,
        object_value="paused",
        valid_from=NOW - timedelta(days=4),
        valid_to=NOW - timedelta(days=3),
    )

    projection = MemoryStateService.project(
        _input(
            (first, object_conflict, negation, non_overlapping, expired_conflict)
        )
    )

    evidence_pairs = {
        frozenset(group[0].assertion_id for group in finding.evidence_sets)
        for finding in projection.contradictions
    }
    assert evidence_pairs == {
        frozenset((first.assertion_id, object_conflict.assertion_id)),
        frozenset((first.assertion_id, negation.assertion_id)),
    }


def test_expired_assertion_is_reported_as_stale_gap_evidence() -> None:
    expired = _assertion(
        1,
        revision_order=1,
        object_value="healthy",
        valid_from=NOW - timedelta(days=2),
        valid_to=NOW - timedelta(days=1),
    )
    rule = ExpectedEvidenceRule(
        rule_id=UUID("86000000-0000-0000-0000-000000000003"),
        description="Service health must currently be valid",
        subject_entity_id=SUBJECT_ID,
        predicate="has_status",
    )

    projection = MemoryStateService.project(_input((expired,), rules=(rule,)))

    assert projection.gaps[0].supporting_evidence == (expired.citation,)
    assert projection.gaps[0].stale_after == expired.valid_to


def test_gap_is_created_only_from_explicit_rule_and_never_implies_falsehood() -> None:
    rule = ExpectedEvidenceRule(
        rule_id=UUID("86000000-0000-0000-0000-000000000001"),
        description="Every launch has a current status assertion",
        subject_entity_id=SUBJECT_ID,
        predicate="launch_status",
        minimum_confidence=0.8,
    )

    projection = MemoryStateService.project(_input((), rules=(rule,)))

    assert len(projection.gaps) == 1
    assert projection.gaps[0].expected_evidence_rule == rule.description
    assert projection.gaps[0].supporting_evidence == ()
    assert projection.gaps[0].does_not_imply_falsehood is True


def test_stale_gap_cites_existing_evidence_and_rebuild_is_idempotent() -> None:
    stale = _assertion(
        1,
        revision_order=1,
        object_value="healthy",
        source_modified_at=NOW - timedelta(days=10),
    )
    rule = ExpectedEvidenceRule(
        rule_id=UUID("86000000-0000-0000-0000-000000000002"),
        description="Service health must be refreshed every seven days",
        subject_entity_id=SUBJECT_ID,
        predicate="has_status",
        stale_after_seconds=7 * 24 * 60 * 60,
    )

    first = MemoryStateService.project(_input((stale,), rules=(rule,)))
    retry = MemoryStateService.project(_input((stale,), rules=(rule,)))
    after_delete = MemoryStateService.project(_input((), rules=(rule,)))

    assert first == retry
    assert first.gaps[0].supporting_evidence == (stale.citation,)
    assert first.gaps[0].stale_after == NOW - timedelta(days=3)
    assert after_delete.gaps[0].supporting_evidence == ()
    assert after_delete.projection_id != first.projection_id


class FakeMemoryStateRepository:
    def __init__(self, command: MemoryStateProjectionInput) -> None:
        self.command = command
        self.published = []

    async def load_projection_input(
        self, workspace_id, *, projection_version, inspected_at
    ):
        assert workspace_id == self.command.workspace_id
        assert projection_version == self.command.projection_version
        return self.command.model_copy(update={"inspected_at": inspected_at})

    async def publish_atomic(self, projection):
        self.published.append(projection)
        return projection


async def test_workspace_projection_loads_current_basis_and_publishes_atomically() -> None:
    command = _input((_assertion(1, revision_order=1, object_value="healthy"),))
    repository = FakeMemoryStateRepository(command)
    service = MemoryStateService(repository=repository)

    projection = await service.project_workspace(
        WORKSPACE_ID,
        projection_version="memory-state-v1",
        inspected_at=NOW,
    )

    assert repository.published == [projection]
    assert projection.graph_snapshot_id == command.graph_snapshot_id
