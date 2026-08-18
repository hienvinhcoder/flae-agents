"""Typed inputs and outputs for evidence-backed memory-state projections."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import Field, model_validator

from app.schemas.agent_memory import (
    AssertionPolarity,
    ChangeFinding,
    ContractModel,
    ContradictionFinding,
    EvidenceCitation,
    GapFinding,
)


class MemoryStateAssertion(ContractModel):
    assertion_id: UUID
    subject_entity_id: UUID
    predicate: str = Field(min_length=1, max_length=200)
    object_entity_id: UUID | None = None
    object_value: str | None = Field(default=None, max_length=4_000)
    polarity: AssertionPolarity
    confidence: float = Field(ge=0.0, le=1.0)
    valid_from: datetime | None = None
    valid_to: datetime | None = None
    revision_id: UUID
    revision_order: int = Field(ge=0)
    is_current: bool
    citation: EvidenceCitation

    @model_validator(mode="after")
    def validate_evidence(self) -> MemoryStateAssertion:
        if (self.object_entity_id is None) == (self.object_value is None):
            raise ValueError("exactly one memory-state assertion object is required")
        if self.valid_from is not None and self.valid_to is not None:
            if self.valid_to <= self.valid_from:
                raise ValueError("assertion validity interval must be ordered")
        if self.citation.assertion_id != self.assertion_id:
            raise ValueError("citation must identify the projected assertion")
        if self.citation.provenance.revision_id != self.revision_id:
            raise ValueError("citation revision must match the projected assertion")
        return self


class ExpectedEvidenceRule(ContractModel):
    rule_id: UUID
    description: str = Field(min_length=1, max_length=4_000)
    subject_entity_id: UUID
    predicate: str = Field(min_length=1, max_length=200)
    required_polarities: tuple[AssertionPolarity, ...] = (
        AssertionPolarity.affirmed,
    )
    minimum_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    stale_after_seconds: int | None = Field(default=None, ge=1)

    @model_validator(mode="after")
    def validate_polarities(self) -> ExpectedEvidenceRule:
        if not self.required_polarities:
            raise ValueError("expected evidence rule requires at least one polarity")
        return self


class OrderedChangeFinding(ChangeFinding):
    before_revision_order: int = Field(ge=0)
    after_revision_order: int = Field(ge=0)

    @model_validator(mode="after")
    def validate_revision_order(self) -> OrderedChangeFinding:
        if self.after_revision_order <= self.before_revision_order:
            raise ValueError("change finding revisions must be ordered")
        return self


class MemoryStateProjectionInput(ContractModel):
    workspace_id: UUID
    graph_snapshot_id: UUID
    revision_set_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    projection_version: str = Field(min_length=1, max_length=200)
    inspected_at: datetime
    assertions: tuple[MemoryStateAssertion, ...] = Field(max_length=100_000)
    expected_evidence_rules: tuple[ExpectedEvidenceRule, ...] = Field(
        default=(), max_length=10_000
    )


class MemoryStateProjection(ContractModel):
    projection_id: UUID
    workspace_id: UUID
    graph_snapshot_id: UUID
    revision_set_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    projection_version: str = Field(min_length=1, max_length=200)
    projection_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    inspected_at: datetime
    changes: tuple[OrderedChangeFinding, ...] = ()
    contradictions: tuple[ContradictionFinding, ...] = ()
    gaps: tuple[GapFinding, ...] = ()


class MemoryStateActivityInput(ContractModel):
    workspace_id: UUID
    projection_version: str = Field(min_length=1, max_length=200)
    inspected_at: datetime


class MemoryStateProjectionResult(ContractModel):
    projection_id: UUID
    projection_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    change_count: int = Field(ge=0)
    contradiction_count: int = Field(ge=0)
    gap_count: int = Field(ge=0)


class MemoryStateWorkflowInput(ContractModel):
    workspace_id: UUID
    projection_version: str = Field(min_length=1, max_length=200)
