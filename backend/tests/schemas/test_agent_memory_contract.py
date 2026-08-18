from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from pydantic import TypeAdapter, ValidationError

from app.schemas.agent_memory import (
    AssertionEvidence,
    AssertionPolarity,
    AssertionQualifier,
    ChangeFinding,
    CodeLocation,
    ContextSummary,
    DomainError,
    DomainErrorCode,
    EvidenceCitation,
    EvidenceMembership,
    EvidenceProvenance,
    EntityObservation,
    FacetReadiness,
    FacetState,
    GapFinding,
    GraphPath,
    GraphHop,
    MemoryFinding,
    MembershipDerivation,
    MembershipTargetKind,
    PageLocation,
    RelationshipProjection,
    ResourceKind,
    RevisionLifecycle,
    RevisionState,
    TaxonomyLifecycle,
    Topic,
    TopicSummary,
)
from app.schemas.knowledge import KnowledgeSearchResponse


NOW = datetime(2026, 7, 29, tzinfo=UTC)


def _ids() -> dict[str, UUID]:
    return {
        "workspace_id": uuid4(),
        "source_id": uuid4(),
        "document_id": uuid4(),
        "revision_id": uuid4(),
        "assertion_id": uuid4(),
        "subject_observation_id": uuid4(),
        "object_observation_id": uuid4(),
    }


def _provenance() -> EvidenceProvenance:
    ids = _ids()
    return EvidenceProvenance(
        workspace_id=ids["workspace_id"],
        source_id=ids["source_id"],
        document_id=ids["document_id"],
        revision_id=ids["revision_id"],
        chunk_id="chunk-adr-7",
        source_name="Architecture repository",
        source_type="github",
        location=CodeLocation(path="docs/adr-007.md", start_line=12, end_line=18),
        source_modified_at=NOW,
        ingested_at=NOW,
        content_hash="sha256:" + "a" * 64,
    )


def test_revision_lifecycle_and_readiness_enforce_normative_states() -> None:
    lifecycle = RevisionLifecycle(
        revision_id=uuid4(),
        state=RevisionState.searchable,
        base=FacetReadiness(state=FacetState.ready, updated_at=NOW),
        graph=FacetReadiness(state=FacetState.pending, updated_at=NOW),
        discovery=FacetReadiness(state=FacetState.failed, updated_at=NOW, reason="timeout"),
    )

    assert lifecycle.base.state is FacetState.ready
    assert lifecycle.graph.state is FacetState.pending
    assert lifecycle.discovery.state is FacetState.failed

    with pytest.raises(ValidationError, match="base readiness cannot be stale"):
        RevisionLifecycle(
            revision_id=uuid4(),
            state=RevisionState.searchable,
            base=FacetReadiness(state=FacetState.stale, updated_at=NOW),
            graph=FacetReadiness(state=FacetState.pending, updated_at=NOW),
            discovery=FacetReadiness(state=FacetState.pending, updated_at=NOW),
        )


def test_assertion_requires_exactly_one_object_and_ordered_span() -> None:
    ids = _ids()
    base = {
        "assertion_id": ids["assertion_id"],
        "workspace_id": ids["workspace_id"],
        "revision_id": ids["revision_id"],
        "chunk_id": "chunk-42",
        "subject_observation_id": ids["subject_observation_id"],
        "predicate": "approved_by",
        "polarity": AssertionPolarity.affirmed,
        "confidence": 0.93,
        "evidence_start": 4,
        "evidence_end": 20,
        "extractor_version": "extractor-v2",
        "qualifiers": [AssertionQualifier(name="environment", text_value="production")],
    }

    assertion = AssertionEvidence(**base, object_observation_id=ids["object_observation_id"])
    assert assertion.object_observation_id == ids["object_observation_id"]

    with pytest.raises(ValidationError, match="exactly one assertion object"):
        AssertionEvidence(**base)
    with pytest.raises(ValidationError, match="exactly one assertion object"):
        AssertionEvidence(
            **base,
            object_observation_id=ids["object_observation_id"],
            object_value="duplicate object",
        )
    with pytest.raises(ValidationError, match="evidence span must be ordered"):
        AssertionEvidence(
            **(base | {"evidence_start": 20, "evidence_end": 20}),
            object_value="Vendor Nova",
        )


def test_qualifier_is_typed_and_forbids_unbounded_payloads() -> None:
    assert AssertionQualifier(name="attempts", integer_value=3).integer_value == 3

    with pytest.raises(ValidationError, match="exactly one qualifier value"):
        AssertionQualifier(name="attempts", integer_value=3, text_value="three")
    with pytest.raises(ValidationError):
        AssertionQualifier.model_validate({"name": "payload", "value": {"nested": "object"}})


def test_observation_resolution_is_explicit_and_complete() -> None:
    ids = _ids()
    observation = EntityObservation(
        observation_id=uuid4(),
        workspace_id=ids["workspace_id"],
        revision_id=ids["revision_id"],
        chunk_id="chunk-42",
        raw_mention="Atlas",
        normalized_mention="atlas",
        proposed_type="project",
        evidence_start=0,
        evidence_end=5,
        extractor_version="extractor-v2",
        confidence=0.85,
    )
    assert observation.canonical_entity_id is None

    with pytest.raises(ValidationError, match="resolved observations require"):
        observation.model_copy(update={"canonical_entity_id": uuid4()}).model_validate(
            observation.model_copy(update={"canonical_entity_id": uuid4()}).model_dump()
        )


def test_source_locations_and_canonical_uri_round_trip() -> None:
    provenance = _provenance()
    dumped = provenance.model_dump(mode="json")
    restored = EvidenceProvenance.model_validate(dumped)

    assert restored.location == CodeLocation(
        path="docs/adr-007.md", start_line=12, end_line=18
    )
    assert str(restored.resource_uri).endswith(
        f"/documents/{restored.document_id}/revisions/{restored.revision_id}/chunks/chunk-adr-7"
    )

    page = PageLocation(page_number=3, start_offset=8, end_offset=40)
    assert PageLocation.model_validate(page.model_dump()).page_number == 3


def test_derived_navigation_summaries_cannot_validate_as_evidence() -> None:
    topic_summary = TopicSummary(
        topic_id=uuid4(),
        text="Deployment and rollback decisions",
        supporting_evidence_ids=(uuid4(),),
        generated_at=NOW,
        summary_version="summary-v1",
    )
    context_summary = ContextSummary(
        context_id=uuid4(),
        text="Aurora incident response",
        supporting_evidence_ids=(uuid4(),),
        generated_at=NOW,
        summary_version="summary-v1",
    )

    assert topic_summary.is_derived is True
    assert context_summary.is_derived is True
    with pytest.raises(ValidationError):
        EvidenceCitation.model_validate(topic_summary.model_dump(mode="json"))
    with pytest.raises(ValidationError):
        EvidenceCitation.model_validate(context_summary.model_dump(mode="json"))


def test_graph_hop_preserves_direction_predicate_and_assertion_citation() -> None:
    provenance = _provenance()
    citation = EvidenceCitation(
        assertion_id=uuid4(),
        provenance=provenance,
        evidence_start=12,
        evidence_end=42,
    )
    hop = GraphHop(
        source_entity_id=uuid4(),
        target_entity_id=uuid4(),
        predicate="implements",
        polarity=AssertionPolarity.affirmed,
        citations=(citation,),
    )

    assert hop.source_entity_id != hop.target_entity_id
    assert hop.citations[0].assertion_id == citation.assertion_id


def test_graph_path_requires_continuous_directed_hops() -> None:
    provenance = _provenance()
    citation = EvidenceCitation(
        assertion_id=uuid4(), provenance=provenance, evidence_start=1, evidence_end=5
    )
    first = GraphHop(
        source_entity_id=uuid4(),
        target_entity_id=uuid4(),
        predicate="depends_on",
        polarity=AssertionPolarity.affirmed,
        citations=(citation,),
    )
    disconnected = GraphHop(
        source_entity_id=uuid4(),
        target_entity_id=uuid4(),
        predicate="caused",
        polarity=AssertionPolarity.affirmed,
        citations=(citation,),
    )

    with pytest.raises(ValidationError, match="continuous"):
        GraphPath(path_id="path-1", hops=(first, disconnected), score=0.8)


def test_memberships_are_many_to_many_and_evidence_backed() -> None:
    evidence_id = uuid4()
    source_id = uuid4()
    first = EvidenceMembership(
        membership_id=uuid4(),
        target_kind=MembershipTargetKind.source,
        target_id=str(source_id),
        confidence=0.8,
        derivation=MembershipDerivation.combined,
        first_seen_snapshot_id=uuid4(),
        last_seen_snapshot_id=uuid4(),
        supporting_evidence_ids=(evidence_id,),
    )
    second = first.model_copy(update={"membership_id": uuid4()})

    assert first.target_id == second.target_id
    assert first.membership_id != second.membership_id


def test_single_evidence_window_cannot_promote_an_active_topic() -> None:
    membership = EvidenceMembership(
        membership_id=uuid4(),
        target_kind=MembershipTargetKind.chunk,
        target_id="chunk-1",
        confidence=0.9,
        derivation=MembershipDerivation.combined,
        first_seen_snapshot_id=uuid4(),
        last_seen_snapshot_id=uuid4(),
        supporting_evidence_ids=(uuid4(),),
    )

    with pytest.raises(ValidationError, match="at least two evidence windows"):
        Topic(
            topic_id=uuid4(),
            workspace_id=uuid4(),
            name="Too-early topic",
            lifecycle=TaxonomyLifecycle.active,
            memberships=(membership,),
            promotion_evidence_count=1,
            discovery_version="discovery-v1",
        )


def test_relationship_frequency_is_derived_from_unique_assertions() -> None:
    assertion_ids = (uuid4(), uuid4())
    relationship = RelationshipProjection(
        relationship_id=uuid4(),
        workspace_id=uuid4(),
        source_entity_id=uuid4(),
        target_entity_id=uuid4(),
        predicate="implements",
        polarity=AssertionPolarity.affirmed,
        assertion_ids=assertion_ids,
        frequency=2,
        projection_version="projection-v1",
    )
    assert relationship.frequency == 2

    with pytest.raises(ValidationError, match="derive from unique assertions"):
        RelationshipProjection.model_validate(
            relationship.model_dump() | {"assertion_ids": (assertion_ids[0],) * 2}
        )

    with pytest.raises(ValidationError, match="assertion IDs must be unique"):
        RelationshipProjection.model_validate(
            relationship.model_dump()
            | {
                "assertion_ids": (assertion_ids[0],) * 2,
                "frequency": 1,
            }
        )


def test_findings_are_a_closed_discriminated_union() -> None:
    provenance = _provenance()
    before = EvidenceCitation(
        assertion_id=uuid4(), provenance=provenance, evidence_start=1, evidence_end=4
    )
    after = EvidenceCitation(
        assertion_id=uuid4(), provenance=provenance, evidence_start=8, evidence_end=12
    )
    adapter = TypeAdapter(MemoryFinding)

    finding = adapter.validate_python(
        ChangeFinding(
            finding_id=uuid4(),
            subject_entity_id=uuid4(),
            predicate="expires_at",
            before=(before,),
            after=(after,),
            confidence=0.9,
            detected_at=NOW,
        ).model_dump(mode="json")
    )
    assert isinstance(finding, ChangeFinding)

    gap = GapFinding(
        finding_id=uuid4(),
        expected_evidence_rule="Every security exception has a current expiry assertion",
        inspected_at=NOW,
        stale_after=NOW,
        confidence=0.7,
    )
    assert gap.does_not_imply_falsehood is True


def test_domain_errors_use_stable_codes_and_safe_typed_details() -> None:
    error = DomainError(
        code=DomainErrorCode.graph_not_ready,
        message="Graph enrichment is not ready",
        request_id="req-123",
        retryable=True,
        details={"kind": "readiness", "facet": "graph", "state": "pending"},
    )

    assert error.code.value == "GRAPH_NOT_READY"
    with pytest.raises(ValidationError):
        DomainError(
            code=DomainErrorCode.internal_error,
            message="failed",
            request_id="req-456",
            retryable=False,
            details={"sql": "SELECT secret FROM users"},
        )


def test_legacy_rest_search_response_remains_json_compatible() -> None:
    payload = {
        "top_chunks": [
            {
                "id": "chunk-1",
                "score": 0.9,
                "name": "ADR 7",
                "source_document": "adr.md",
                "content": "The approved decision",
            }
        ],
        "top_paths": [],
        "diagnostics": {"mode": "legacy"},
    }

    response = KnowledgeSearchResponse.model_validate(payload)
    assert response.model_dump(mode="json") == {
        "top_chunks": [payload["top_chunks"][0] | {"type": "chunk", "reason": None}],
        "top_paths": [],
        "diagnostics": {"mode": "legacy"},
    }


def test_resource_kind_is_transport_independent() -> None:
    assert ResourceKind.chunk.value == "chunk"
