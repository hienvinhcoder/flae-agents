"""Transport-independent contracts for evidence-first Company Memory.

These models describe domain capabilities. REST, MCP, Temporal, and agent
adapters may translate them, but must not weaken their provenance or typing.
"""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Annotated, Literal
from urllib.parse import quote
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


class ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class RevisionState(StrEnum):
    staging = "staging"
    searchable = "searchable"
    superseded = "superseded"
    failed = "failed"
    tombstoned = "tombstoned"


class FacetState(StrEnum):
    pending = "pending"
    ready = "ready"
    failed = "failed"
    stale = "stale"


class FacetName(StrEnum):
    base = "base"
    graph = "graph"
    discovery = "discovery"


class FacetReadiness(ContractModel):
    state: FacetState
    updated_at: datetime
    reason: str | None = Field(default=None, min_length=1, max_length=500)
    snapshot_id: UUID | None = None


class RevisionLifecycle(ContractModel):
    revision_id: UUID
    state: RevisionState
    base: FacetReadiness
    graph: FacetReadiness
    discovery: FacetReadiness

    @model_validator(mode="after")
    def validate_lifecycle(self) -> RevisionLifecycle:
        if self.base.state is FacetState.stale:
            raise ValueError("base readiness cannot be stale")
        if self.state is RevisionState.searchable and self.base.state is not FacetState.ready:
            raise ValueError("searchable revisions require ready base content")
        return self


class ResourceKind(StrEnum):
    revision = "revision"
    chunk = "chunk"
    assertion = "assertion"
    entity = "entity"
    topic = "topic"
    context = "context"


class PageLocation(ContractModel):
    kind: Literal["page"] = "page"
    page_number: int = Field(ge=1)
    start_offset: int | None = Field(default=None, ge=0)
    end_offset: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def validate_offsets(self) -> PageLocation:
        if self.start_offset is not None and self.end_offset is not None:
            if self.end_offset <= self.start_offset:
                raise ValueError("page location must be ordered")
        return self


class CodeLocation(ContractModel):
    kind: Literal["code"] = "code"
    path: str = Field(min_length=1, max_length=2_000)
    start_line: int = Field(ge=1)
    end_line: int = Field(ge=1)
    start_column: int | None = Field(default=None, ge=0)
    end_column: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def validate_lines(self) -> CodeLocation:
        if self.end_line < self.start_line:
            raise ValueError("code location must be ordered")
        return self


class MessageLocation(ContractModel):
    kind: Literal["message"] = "message"
    channel_external_id: str = Field(min_length=1, max_length=500)
    message_external_id: str = Field(min_length=1, max_length=500)
    message_timestamp: datetime
    thread_external_id: str | None = Field(default=None, max_length=500)


class SectionLocation(ContractModel):
    kind: Literal["section"] = "section"
    block_id: str | None = Field(default=None, min_length=1, max_length=500)
    heading_path: tuple[str, ...] = Field(min_length=1, max_length=32)

    @field_validator("heading_path")
    @classmethod
    def validate_heading_path(cls, value: tuple[str, ...]) -> tuple[str, ...]:
        if any(not heading.strip() or len(heading) > 500 for heading in value):
            raise ValueError("heading path entries must be non-empty and at most 500 characters")
        return value


SourceLocation = Annotated[
    PageLocation | CodeLocation | MessageLocation | SectionLocation,
    Field(discriminator="kind"),
]


class EvidenceProvenance(ContractModel):
    workspace_id: UUID
    source_id: UUID
    document_id: UUID
    revision_id: UUID
    chunk_id: str = Field(min_length=1, max_length=500, pattern=r"^[A-Za-z0-9._:-]+$")
    source_name: str = Field(min_length=1, max_length=500)
    source_type: str = Field(min_length=1, max_length=100)
    location: SourceLocation
    source_modified_at: datetime
    ingested_at: datetime
    content_hash: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    resource_uri: str | None = None

    def _canonical_resource_uri(self) -> str:
        chunk_id = quote(self.chunk_id, safe="._:-")
        return (
            f"flae://workspace/{self.workspace_id}/documents/{self.document_id}"
            f"/revisions/{self.revision_id}/chunks/{chunk_id}"
        )

    @model_validator(mode="after")
    def validate_resource_uri(self) -> EvidenceProvenance:
        canonical_uri = self._canonical_resource_uri()
        if self.resource_uri is not None and self.resource_uri != canonical_uri:
            raise ValueError("resource URI does not match provenance identity")
        self.resource_uri = canonical_uri
        return self


class EntityObservation(ContractModel):
    observation_id: UUID
    workspace_id: UUID
    revision_id: UUID
    chunk_id: str = Field(min_length=1, max_length=500)
    raw_mention: str = Field(min_length=1, max_length=1_000)
    normalized_mention: str = Field(min_length=1, max_length=1_000)
    proposed_type: str = Field(min_length=1, max_length=200)
    evidence_start: int = Field(ge=0)
    evidence_end: int = Field(gt=0)
    extractor_version: str = Field(min_length=1, max_length=200)
    confidence: float = Field(ge=0.0, le=1.0)
    external_ids: tuple[str, ...] = Field(default=(), max_length=100)
    disambiguation_attributes: tuple[ObservationAttribute, ...] = ()
    canonical_entity_id: UUID | None = None
    resolver_version: str | None = Field(default=None, min_length=1, max_length=200)
    resolver_confidence: float | None = Field(default=None, ge=0.0, le=1.0)

    @model_validator(mode="after")
    def validate_span_and_resolution(self) -> EntityObservation:
        if self.evidence_end <= self.evidence_start:
            raise ValueError("evidence span must be ordered")
        resolution_fields = (
            self.canonical_entity_id,
            self.resolver_version,
            self.resolver_confidence,
        )
        if any(value is not None for value in resolution_fields) and not all(
            value is not None for value in resolution_fields
        ):
            raise ValueError("resolved observations require entity, version, and confidence")
        return self


class ObservationAttribute(ContractModel):
    name: str = Field(min_length=1, max_length=200)
    value: str = Field(min_length=1, max_length=2_000)


class AssertionPolarity(StrEnum):
    affirmed = "affirmed"
    negated = "negated"
    uncertain = "uncertain"


class AssertionQualifier(ContractModel):
    name: str = Field(min_length=1, max_length=200)
    text_value: str | None = Field(default=None, max_length=4_000)
    integer_value: int | None = None
    number_value: float | None = None
    boolean_value: bool | None = None
    datetime_value: datetime | None = None
    unit: str | None = Field(default=None, min_length=1, max_length=100)

    @model_validator(mode="after")
    def validate_value(self) -> AssertionQualifier:
        values = (
            self.text_value,
            self.integer_value,
            self.number_value,
            self.boolean_value,
            self.datetime_value,
        )
        if sum(value is not None for value in values) != 1:
            raise ValueError("exactly one qualifier value is required")
        return self


class AssertionEvidence(ContractModel):
    assertion_id: UUID
    workspace_id: UUID
    revision_id: UUID
    chunk_id: str = Field(min_length=1, max_length=500)
    subject_observation_id: UUID
    predicate: str = Field(min_length=1, max_length=200)
    object_observation_id: UUID | None = None
    object_value: str | None = Field(default=None, max_length=4_000)
    polarity: AssertionPolarity
    confidence: float = Field(ge=0.0, le=1.0)
    valid_from: datetime | None = None
    valid_to: datetime | None = None
    evidence_start: int = Field(ge=0)
    evidence_end: int = Field(gt=0)
    extractor_version: str = Field(min_length=1, max_length=200)
    qualifiers: tuple[AssertionQualifier, ...] = Field(default=(), max_length=100)

    @model_validator(mode="after")
    def validate_assertion(self) -> AssertionEvidence:
        if (self.object_observation_id is None) == (self.object_value is None):
            raise ValueError("exactly one assertion object is required")
        if self.evidence_end <= self.evidence_start:
            raise ValueError("evidence span must be ordered")
        if self.valid_from is not None and self.valid_to is not None:
            if self.valid_to <= self.valid_from:
                raise ValueError("assertion validity interval must be ordered")
        return self


class EvidenceCitation(ContractModel):
    assertion_id: UUID
    provenance: EvidenceProvenance
    evidence_start: int = Field(ge=0)
    evidence_end: int = Field(gt=0)

    @model_validator(mode="after")
    def validate_span(self) -> EvidenceCitation:
        if self.evidence_end <= self.evidence_start:
            raise ValueError("citation span must be ordered")
        return self


from app.schemas.agent_memory_discovery import (
    Context,
    ContextSummary,
    DerivedSummary,
    EvidenceMembership,
    MembershipDerivation,
    MembershipTargetKind,
    TaxonomyLifecycle,
    TaxonomyLineage,
    TaxonomyLineageKind,
    Topic,
    TopicSummary,
)


class CanonicalEntity(ContractModel):
    entity_id: UUID
    workspace_id: UUID
    name: str = Field(min_length=1, max_length=1_000)
    entity_type: str = Field(min_length=1, max_length=200)
    aliases: tuple[str, ...] = Field(default=(), max_length=1_000)
    resolver_version: str = Field(min_length=1, max_length=200)
    observation_ids: tuple[UUID, ...] = Field(min_length=1, max_length=100_000)


class RelationshipProjection(ContractModel):
    relationship_id: UUID
    workspace_id: UUID
    source_entity_id: UUID
    target_entity_id: UUID
    predicate: str = Field(min_length=1, max_length=200)
    polarity: AssertionPolarity
    assertion_ids: tuple[UUID, ...] = Field(min_length=1, max_length=100_000)
    frequency: int = Field(ge=1)
    projection_version: str = Field(min_length=1, max_length=200)

    @model_validator(mode="after")
    def validate_frequency(self) -> RelationshipProjection:
        unique_assertion_count = len(set(self.assertion_ids))
        if self.frequency != unique_assertion_count:
            raise ValueError("relationship frequency must derive from unique assertions")
        if len(self.assertion_ids) != unique_assertion_count:
            raise ValueError("relationship assertion IDs must be unique")
        return self


class GraphHop(ContractModel):
    source_entity_id: UUID
    target_entity_id: UUID
    predicate: str = Field(min_length=1, max_length=200)
    polarity: AssertionPolarity
    citations: tuple[EvidenceCitation, ...] = Field(min_length=1, max_length=1_000)


class GraphPath(ContractModel):
    path_id: str = Field(min_length=1, max_length=500)
    hops: tuple[GraphHop, ...] = Field(min_length=1, max_length=20)
    score: float
    match_signals: tuple[str, ...] = Field(default=(), max_length=100)
    is_truncated: bool = False

    @model_validator(mode="after")
    def validate_continuity(self) -> GraphPath:
        for previous, current in zip(self.hops, self.hops[1:], strict=False):
            if previous.target_entity_id != current.source_entity_id:
                raise ValueError("graph path hops must be continuous")
        return self


class FindingKind(StrEnum):
    change = "change"
    contradiction = "contradiction"
    gap = "gap"


class ChangeFinding(ContractModel):
    kind: Literal[FindingKind.change] = FindingKind.change
    finding_id: UUID
    subject_entity_id: UUID
    predicate: str = Field(min_length=1, max_length=200)
    before: tuple[EvidenceCitation, ...] = Field(min_length=1, max_length=1_000)
    after: tuple[EvidenceCitation, ...] = Field(min_length=1, max_length=1_000)
    confidence: float = Field(ge=0.0, le=1.0)
    detected_at: datetime


class ContradictionFinding(ContractModel):
    kind: Literal[FindingKind.contradiction] = FindingKind.contradiction
    finding_id: UUID
    subject_entity_id: UUID
    predicate: str = Field(min_length=1, max_length=200)
    evidence_sets: tuple[tuple[EvidenceCitation, ...], ...] = Field(
        min_length=2, max_length=100
    )
    confidence: float = Field(ge=0.0, le=1.0)
    detected_at: datetime


class GapFinding(ContractModel):
    kind: Literal[FindingKind.gap] = FindingKind.gap
    finding_id: UUID
    expected_evidence_rule: str = Field(min_length=1, max_length=4_000)
    inspected_at: datetime
    stale_after: datetime | None = None
    confidence: float = Field(ge=0.0, le=1.0)
    supporting_evidence: tuple[EvidenceCitation, ...] = Field(default=(), max_length=1_000)
    does_not_imply_falsehood: Literal[True] = True


MemoryFinding = Annotated[
    ChangeFinding | ContradictionFinding | GapFinding,
    Field(discriminator="kind"),
]


class DomainErrorCode(StrEnum):
    invalid_argument = "INVALID_ARGUMENT"
    invalid_cursor = "INVALID_CURSOR"
    unauthenticated = "UNAUTHENTICATED"
    permission_denied = "PERMISSION_DENIED"
    resource_not_found = "RESOURCE_NOT_FOUND"
    revision_not_available = "REVISION_NOT_AVAILABLE"
    graph_not_ready = "GRAPH_NOT_READY"
    discovery_not_ready = "DISCOVERY_NOT_READY"
    snapshot_stale = "SNAPSHOT_STALE"
    rate_limited = "RATE_LIMITED"
    service_unavailable = "SERVICE_UNAVAILABLE"
    internal_error = "INTERNAL_ERROR"


class ReadinessErrorDetails(ContractModel):
    kind: Literal["readiness"] = "readiness"
    facet: FacetName
    state: FacetState


class CursorErrorDetails(ContractModel):
    kind: Literal["cursor"] = "cursor"
    reason: Literal["malformed", "expired", "scope_mismatch", "snapshot_changed"]


class ResourceErrorDetails(ContractModel):
    kind: Literal["resource"] = "resource"
    resource_kind: ResourceKind
    requested_revision_id: UUID | None = None


DomainErrorDetails = Annotated[
    ReadinessErrorDetails | CursorErrorDetails | ResourceErrorDetails,
    Field(discriminator="kind"),
]


class DomainError(ContractModel):
    code: DomainErrorCode
    message: str = Field(min_length=1, max_length=1_000)
    request_id: str = Field(min_length=1, max_length=200)
    retryable: bool
    details: DomainErrorDetails | None = None
