"""Validation and deterministic materialization of revision-scoped evidence."""

from __future__ import annotations

from hashlib import sha256
import json
import unicodedata
from uuid import NAMESPACE_URL, uuid5

from app.core.exceptions import InvalidArgumentError
from app.db.rag_db import DBManager
from app.schemas.agent_memory import AssertionEvidence, EntityObservation
from app.schemas.enrichment import (
    EvidenceAssertionCandidate,
    EvidenceExtractionActivityInput,
    EvidenceExtractionCandidateBatch,
    EvidenceExtractionContext,
    EvidenceExtractionResult,
    EvidenceObservationCandidate,
    MaterializedAssertion,
    MaterializedEvidence,
    MaterializedObservation,
)
from app.services.knowalge_base.evidence_repository import EvidenceRepository


def canonical_evidence_checksum(value: object) -> str:
    encoded = json.dumps(
        value, ensure_ascii=False, separators=(",", ":"), sort_keys=True
    ).encode("utf-8")
    return "sha256:" + sha256(encoded).hexdigest()


def _normalized_mention(value: str) -> str:
    return unicodedata.normalize("NFKC", " ".join(value.casefold().split()))


class EvidenceService:
    def __init__(self, manager: DBManager) -> None:
        self._repository = EvidenceRepository(manager)

    async def load_current_context(
        self, command: EvidenceExtractionActivityInput
    ) -> EvidenceExtractionContext:
        return await self._repository.load_current_context(command)

    async def persist_candidates(
        self,
        command: EvidenceExtractionActivityInput,
        candidates: EvidenceExtractionCandidateBatch,
    ) -> EvidenceExtractionResult:
        return await self._repository.persist(
            command,
            candidates,
            materialize=self.materialize,
            after_write=self._after_write_boundary,
        )

    @staticmethod
    def _after_write_boundary(_boundary: str) -> None:
        """Failure-injection hook used to prove transaction atomicity."""

    @staticmethod
    def materialize(
        context: EvidenceExtractionContext,
        candidates: EvidenceExtractionCandidateBatch,
    ) -> MaterializedEvidence:
        unique_candidates = EvidenceService._deduplicate_observations(
            candidates.observations
        )
        observations = tuple(
            EvidenceService._materialize_observation(context, candidate)
            for candidate in unique_candidates
        )
        by_key = {
            candidate.mention_key: observation
            for candidate, observation in zip(
                unique_candidates, observations, strict=True
            )
        }
        assertions = tuple(
            EvidenceService._materialize_assertion(context, candidate, by_key)
            for candidate in candidates.assertions
        )
        deduplicated_assertions = tuple(
            {item.evidence_key: item for item in assertions}.values()
        )
        return MaterializedEvidence(
            observations=observations,
            assertions=deduplicated_assertions,
        )

    @staticmethod
    def _deduplicate_observations(
        candidates: tuple[EvidenceObservationCandidate, ...],
    ) -> tuple[EvidenceObservationCandidate, ...]:
        by_key: dict[str, EvidenceObservationCandidate] = {}
        for candidate in candidates:
            previous = by_key.get(candidate.mention_key)
            if previous is not None and previous != candidate:
                raise InvalidArgumentError(
                    "Duplicate mention key maps to conflicting observations."
                )
            by_key[candidate.mention_key] = candidate
        return tuple(by_key.values())

    @staticmethod
    def _materialize_observation(
        context: EvidenceExtractionContext,
        candidate: EvidenceObservationCandidate,
    ) -> MaterializedObservation:
        EvidenceService._validate_span(
            context.chunk_text,
            candidate.evidence_start,
            candidate.evidence_end,
            candidate.raw_mention,
        )
        normalized = _normalized_mention(candidate.raw_mention)
        if normalized != candidate.normalized_mention:
            raise InvalidArgumentError(
                "Observation normalized mention does not match its evidence span."
            )
        identity = {
            "revision_id": str(context.revision_id),
            "chunk_id": context.chunk_id,
            "start": candidate.evidence_start,
            "end": candidate.evidence_end,
            "raw_mention": candidate.raw_mention,
            "proposed_type": candidate.proposed_type,
            "extractor_version": context.extractor_version,
        }
        evidence_key = canonical_evidence_checksum(identity)
        base = EntityObservation(
            observation_id=uuid5(NAMESPACE_URL, evidence_key),
            workspace_id=context.workspace_id,
            revision_id=context.revision_id,
            chunk_id=context.chunk_id,
            raw_mention=candidate.raw_mention,
            normalized_mention=normalized,
            proposed_type=candidate.proposed_type,
            evidence_start=candidate.evidence_start,
            evidence_end=candidate.evidence_end,
            extractor_version=context.extractor_version,
            confidence=candidate.confidence,
            external_ids=candidate.external_ids,
            disambiguation_attributes=candidate.disambiguation_attributes,
        )
        return MaterializedObservation(
            **base.model_dump(), evidence_key=evidence_key
        )

    @staticmethod
    def _materialize_assertion(
        context: EvidenceExtractionContext,
        candidate: EvidenceAssertionCandidate,
        observations: dict[str, MaterializedObservation],
    ) -> MaterializedAssertion:
        subject = observations.get(candidate.subject_mention_key)
        if subject is None:
            raise InvalidArgumentError("Assertion references an unknown observation.")
        object_observation = None
        if candidate.object_mention_key is not None:
            object_observation = observations.get(candidate.object_mention_key)
            if object_observation is None:
                raise InvalidArgumentError(
                    "Assertion references an unknown observation."
                )
        EvidenceService._validate_span(
            context.chunk_text,
            candidate.evidence_start,
            candidate.evidence_end,
        )
        covered = [subject]
        if object_observation is not None:
            covered.append(object_observation)
        if any(
            item.evidence_start < candidate.evidence_start
            or item.evidence_end > candidate.evidence_end
            for item in covered
        ):
            raise InvalidArgumentError(
                "Assertion span must cover its referenced observations."
            )
        if candidate.predicate != candidate.predicate.strip():
            raise InvalidArgumentError("Assertion predicate must be trimmed.")
        identity = {
            "revision_id": str(context.revision_id),
            "chunk_id": context.chunk_id,
            "subject_observation_id": str(subject.observation_id),
            "predicate": candidate.predicate,
            "object_observation_id": (
                str(object_observation.observation_id)
                if object_observation is not None
                else None
            ),
            "object_value": candidate.object_value,
            "polarity": candidate.polarity.value,
            "start": candidate.evidence_start,
            "end": candidate.evidence_end,
            "extractor_version": context.extractor_version,
        }
        evidence_key = canonical_evidence_checksum(identity)
        base = AssertionEvidence(
            assertion_id=uuid5(NAMESPACE_URL, evidence_key),
            workspace_id=context.workspace_id,
            revision_id=context.revision_id,
            chunk_id=context.chunk_id,
            subject_observation_id=subject.observation_id,
            predicate=candidate.predicate,
            object_observation_id=(
                object_observation.observation_id
                if object_observation is not None
                else None
            ),
            object_value=candidate.object_value,
            polarity=candidate.polarity,
            confidence=candidate.confidence,
            valid_from=candidate.valid_from,
            valid_to=candidate.valid_to,
            evidence_start=candidate.evidence_start,
            evidence_end=candidate.evidence_end,
            extractor_version=context.extractor_version,
            qualifiers=candidate.qualifiers,
        )
        return MaterializedAssertion(
            **base.model_dump(), evidence_key=evidence_key
        )

    @staticmethod
    def _validate_span(
        text: str,
        start: int,
        end: int,
        expected_text: str | None = None,
    ) -> None:
        if start < 0 or end <= start or end > len(text):
            raise InvalidArgumentError("Evidence span is outside the source chunk.")
        if expected_text is not None and text[start:end] != expected_text:
            raise InvalidArgumentError("Evidence span does not match source text.")
