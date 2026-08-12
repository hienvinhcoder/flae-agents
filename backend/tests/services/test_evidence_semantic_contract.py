from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.enrichment import (
    EvidenceExtractionCandidateBatch,
    EvidenceExtractionContext,
)
from app.services.knowledge.extraction.evidence_service import EvidenceService


def _payload() -> dict[str, object]:
    return {
        "observations": [
            {
                "mention_key": "atlas",
                "raw_mention": "Atlas",
                "normalized_mention": "atlas",
                "proposed_type": "project",
                "description": "Atlas is the event gateway project.",
                "evidence_start": 0,
                "evidence_end": 5,
                "confidence": 0.98,
            },
            {
                "mention_key": "helios",
                "raw_mention": "Helios",
                "normalized_mention": "helios",
                "proposed_type": "service",
                "description": "Helios receives Atlas events.",
                "evidence_start": 19,
                "evidence_end": 25,
                "confidence": 0.97,
            },
        ],
        "assertions": [
            {
                "subject_mention_key": "atlas",
                "predicate": "publishes_to",
                "object_mention_key": "helios",
                "polarity": "affirmed",
                "keywords": ["events", "publishes"],
                "description": "Atlas publishes events to Helios.",
                "confidence": 0.96,
                "evidence_start": 0,
                "evidence_end": 25,
            }
        ],
    }


def test_materialized_evidence_preserves_semantic_source_fields() -> None:
    context = EvidenceExtractionContext(
        workspace_id=uuid4(),
        revision_id=uuid4(),
        chunk_id="chunk-atlas-helios",
        chunk_text="Atlas publishes to Helios.",
        extractor_version="evidence-v2",
    )

    evidence = EvidenceService.materialize(
        context, EvidenceExtractionCandidateBatch.model_validate(_payload())
    )

    assert [item.description for item in evidence.observations] == [
        "Atlas is the event gateway project.",
        "Helios receives Atlas events.",
    ]
    assert evidence.assertions[0].keywords == ("events", "publishes")
    assert evidence.assertions[0].description == "Atlas publishes events to Helios."


@pytest.mark.parametrize(
    ("collection", "field"),
    (("observations", "description"), ("assertions", "description")),
)
def test_semantic_evidence_fields_are_required(
    collection: str, field: str
) -> None:
    payload = _payload()
    records = payload[collection]
    assert isinstance(records, list)
    first = records[0]
    assert isinstance(first, dict)
    first.pop(field)

    with pytest.raises(ValidationError):
        EvidenceExtractionCandidateBatch.model_validate(payload)
