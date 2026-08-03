"""Typed contracts for evidence extraction and graph enrichment."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.agent_memory import (
    AssertionEvidence,
    AssertionPolarity,
    AssertionQualifier,
    EntityObservation,
    ObservationAttribute,
)


class EnrichmentModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class EvidenceObservationCandidate(EnrichmentModel):
    mention_key: str = Field(min_length=1, max_length=200, pattern=r"^[A-Za-z0-9._:-]+$")
    raw_mention: str = Field(min_length=1, max_length=1_000)
    normalized_mention: str = Field(min_length=1, max_length=1_000)
    proposed_type: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=8_000)
    evidence_start: int = Field(ge=0)
    evidence_end: int = Field(gt=0)
    confidence: float = Field(ge=0.0, le=1.0)
    external_ids: tuple[str, ...] = Field(default=(), max_length=100)
    disambiguation_attributes: tuple[ObservationAttribute, ...] = Field(
        default=(), max_length=100
    )

    @model_validator(mode="after")
    def validate_span(self) -> EvidenceObservationCandidate:
        if self.evidence_end <= self.evidence_start:
            raise ValueError("observation evidence span must be ordered")
        return self


class EvidenceAssertionCandidate(EnrichmentModel):
    subject_mention_key: str = Field(min_length=1, max_length=200)
    predicate: str = Field(min_length=1, max_length=200)
    object_mention_key: str | None = Field(default=None, min_length=1, max_length=200)
    object_value: str | None = Field(default=None, min_length=1, max_length=4_000)
    polarity: AssertionPolarity
    keywords: tuple[str, ...] = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=8_000)
    confidence: float = Field(ge=0.0, le=1.0)
    valid_from: datetime | None = None
    valid_to: datetime | None = None
    evidence_start: int = Field(ge=0)
    evidence_end: int = Field(gt=0)
    qualifiers: tuple[AssertionQualifier, ...] = Field(default=(), max_length=100)

    @model_validator(mode="after")
    def validate_candidate(self) -> EvidenceAssertionCandidate:
        if (self.object_mention_key is None) == (self.object_value is None):
            raise ValueError("exactly one assertion candidate object is required")
        if self.evidence_end <= self.evidence_start:
            raise ValueError("assertion evidence span must be ordered")
        if self.valid_from is not None and self.valid_to is not None:
            if self.valid_to <= self.valid_from:
                raise ValueError("assertion validity interval must be ordered")
        return self


class EvidenceExtractionCandidateBatch(EnrichmentModel):
    observations: tuple[EvidenceObservationCandidate, ...] = Field(max_length=1_000)
    assertions: tuple[EvidenceAssertionCandidate, ...] = Field(max_length=2_000)


class EvidenceExtractionContext(EnrichmentModel):
    workspace_id: UUID
    revision_id: UUID
    chunk_id: str = Field(min_length=1, max_length=500)
    chunk_text: str = Field(min_length=1, max_length=2_000_000)
    extractor_version: str = Field(min_length=1, max_length=200)


class MaterializedObservation(EntityObservation):
    model_config = ConfigDict(extra="forbid", frozen=True)
    evidence_key: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    description: str = Field(min_length=1, max_length=8_000)


class MaterializedAssertion(AssertionEvidence):
    model_config = ConfigDict(extra="forbid", frozen=True)
    evidence_key: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    keywords: tuple[str, ...] = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=8_000)


class MaterializedEvidence(EnrichmentModel):
    observations: tuple[MaterializedObservation, ...]
    assertions: tuple[MaterializedAssertion, ...]


class EvidenceExtractionActivityInput(EnrichmentModel):
    workspace_id: UUID
    ingestion_run_id: UUID
    revision_id: UUID
    chunk_id: str = Field(min_length=1, max_length=500)
    extractor_version: str = Field(min_length=1, max_length=200)
    model_name: str = Field(min_length=1, max_length=200)
    glean_max: int = Field(default=0, ge=0, le=2)


class EvidenceExtractionResult(EnrichmentModel):
    revision_id: UUID
    chunk_id: str
    observation_count: int = Field(ge=0)
    assertion_count: int = Field(ge=0)
    output_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")


class EvidenceBatchPlanInput(EnrichmentModel):
    workspace_id: UUID
    ingestion_run_id: UUID
    revision_id: UUID
    extractor_version: str = Field(min_length=1, max_length=200)
    model_name: str = Field(min_length=1, max_length=200)
    glean_max: int = Field(default=0, ge=0, le=2)
    cursor: str | None = Field(default=None, min_length=1, max_length=500)
    batch_size: int = Field(default=20, ge=1, le=100)


class EvidenceBatchPlan(EnrichmentModel):
    items: tuple[EvidenceExtractionActivityInput, ...] = Field(max_length=100)
    next_cursor: str | None = Field(default=None, min_length=1, max_length=500)

    @model_validator(mode="after")
    def validate_progress(self) -> EvidenceBatchPlan:
        if not self.items and self.next_cursor is not None:
            raise ValueError("evidence batch cursor cannot advance without items")
        return self


class EvidenceManifestVerificationInput(EnrichmentModel):
    workspace_id: UUID
    ingestion_run_id: UUID
    revision_id: UUID
    extractor_version: str = Field(min_length=1, max_length=200)
    expected_chunk_count: int = Field(ge=1)
    expected_observation_count: int = Field(ge=0)
    expected_assertion_count: int = Field(ge=0)


class EvidenceExtractionWorkflowInput(EnrichmentModel):
    workspace_id: UUID
    ingestion_run_id: UUID
    revision_id: UUID
    extractor_version: str = Field(min_length=1, max_length=200)
    model_name: str = Field(min_length=1, max_length=200)
    glean_max: int = Field(default=0, ge=0, le=2)
    batch_size: int = Field(default=20, ge=1, le=100)
    max_parallel_chunks: int = Field(default=4, ge=1, le=16)
    max_chunks: int = Field(default=5_000, ge=1, le=10_000)


class EvidenceExtractionWorkflowResult(EnrichmentModel):
    revision_id: UUID
    chunk_count: int = Field(ge=1)
    observation_count: int = Field(ge=0)
    assertion_count: int = Field(ge=0)
    manifest_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")


class GraphReadinessUpdate(EnrichmentModel):
    workspace_id: UUID
    revision_id: UUID
    readiness: Literal["pending", "ready", "failed", "stale"]
    reason: str | None = Field(default=None, min_length=1, max_length=500)
