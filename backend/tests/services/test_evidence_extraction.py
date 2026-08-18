import json
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.services.knowledge.extraction.agent.evidence_nodes import parse_evidence_output
from app.core.exceptions import InvalidArgumentError
from app.schemas.enrichment import EvidenceExtractionContext
from app.services.knowledge.extraction.evidence_service import EvidenceService


def _raw_extraction() -> str:
    text = "Atlas Edge uses Minh Stream."
    return json.dumps(
        {
            "observations": [
                {
                    "mention_key": "atlas",
                    "raw_mention": "Atlas Edge",
                    "normalized_mention": "atlas edge",
                    "proposed_type": "project",
                    "description": "Atlas Edge is a project.",
                    "evidence_start": text.index("Atlas Edge"),
                    "evidence_end": text.index("Atlas Edge") + len("Atlas Edge"),
                    "confidence": 0.98,
                    "external_ids": ["project:atlas-edge"],
                    "disambiguation_attributes": [
                        {"name": "repository", "value": "atlas-edge"}
                    ],
                },
                {
                    "mention_key": "minh_stream",
                    "raw_mention": "Minh Stream",
                    "normalized_mention": "minh stream",
                    "proposed_type": "library",
                    "description": "Minh Stream is a library.",
                    "evidence_start": text.index("Minh Stream"),
                    "evidence_end": text.index("Minh Stream") + len("Minh Stream"),
                    "confidence": 0.97,
                    "external_ids": ["package:minh-stream"],
                    "disambiguation_attributes": [],
                },
            ],
            "assertions": [
                {
                    "subject_mention_key": "atlas",
                    "predicate": "uses",
                    "object_mention_key": "minh_stream",
                    "polarity": "affirmed",
                    "keywords": ["uses"],
                    "description": "Atlas Edge uses Minh Stream.",
                    "confidence": 0.96,
                    "evidence_start": 0,
                    "evidence_end": len(text),
                    "qualifiers": [],
                }
            ],
        }
    )


def _context() -> EvidenceExtractionContext:
    return EvidenceExtractionContext(
        workspace_id=uuid4(),
        revision_id=uuid4(),
        chunk_id="chk_atlas_edge",
        chunk_text="Atlas Edge uses Minh Stream.",
        extractor_version="evidence-v1",
    )


def test_parser_rejects_malformed_or_topic_coupled_output() -> None:
    with pytest.raises(InvalidArgumentError, match="valid JSON"):
        parse_evidence_output("not-json")

    payload = json.loads(_raw_extraction())
    payload["topic_assignments"] = [{"topic_id": "must-not-exist"}]
    with pytest.raises(ValidationError, match="topic_assignments"):
        parse_evidence_output(json.dumps(payload))


def test_materialization_deduplicates_mentions_and_preserves_direction() -> None:
    payload = json.loads(_raw_extraction())
    payload["observations"].append(dict(payload["observations"][0]))
    candidates = parse_evidence_output(json.dumps(payload))
    context = _context()

    first = EvidenceService.materialize(context, candidates)
    second = EvidenceService.materialize(context, candidates)

    assert first == second
    assert len(first.observations) == 2
    assertion = first.assertions[0]
    observations = {item.raw_mention: item for item in first.observations}
    assert assertion.subject_observation_id == observations["Atlas Edge"].observation_id
    assert assertion.object_observation_id == observations["Minh Stream"].observation_id
    assert assertion.predicate == "uses"
    assert assertion.keywords == ("uses",)
    assert assertion.description == "Atlas Edge uses Minh Stream."
    assert assertion.evidence_start == 0
    assert assertion.evidence_end == len(context.chunk_text)


def test_materialization_rejects_fabricated_spans_and_unknown_mentions() -> None:
    context = _context()
    payload = json.loads(_raw_extraction())
    payload["observations"][0]["evidence_start"] = 1
    with pytest.raises(InvalidArgumentError, match="span"):
        EvidenceService.materialize(context, parse_evidence_output(json.dumps(payload)))

    payload = json.loads(_raw_extraction())
    payload["assertions"][0]["object_mention_key"] = "missing"
    with pytest.raises(InvalidArgumentError, match="unknown observation"):
        EvidenceService.materialize(context, parse_evidence_output(json.dumps(payload)))
