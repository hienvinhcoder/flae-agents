"""LangGraph node helpers for topic-free evidence extraction."""

from __future__ import annotations

import json

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from pydantic import ValidationError

from app.agents.extractor.evidence_prompts import (
    EVIDENCE_GLEAN_PROMPT,
    EVIDENCE_SYSTEM_PROMPT,
    EVIDENCE_USER_PROMPT,
)
from app.agents.extractor.evidence_state import EvidenceExtractionState
from app.core.exceptions import InvalidArgumentError
from app.schemas.enrichment import EvidenceExtractionCandidateBatch


def parse_evidence_output(raw_text: str) -> EvidenceExtractionCandidateBatch:
    """Parse strict JSON model output; schema rejects any topic side effects."""
    try:
        payload = json.loads(raw_text)
    except json.JSONDecodeError as error:
        raise InvalidArgumentError("Evidence extraction output must be valid JSON.") from error
    if not isinstance(payload, dict):
        raise InvalidArgumentError("Evidence extraction output must be a JSON object.")
    try:
        return EvidenceExtractionCandidateBatch.model_validate(payload)
    except ValidationError:
        raise


def prepare_evidence_prompt_node(state: EvidenceExtractionState) -> dict:
    prompt = EVIDENCE_SYSTEM_PROMPT.format(
        chunk_id=state["chunk_id"],
        chunk_text=state["chunk_text"],
        entity_types=", ".join(state["entity_types"]),
        language=state["language"],
        extractor_version=state["extractor_version"],
    )
    return {"system_prompt": prompt}


async def extract_evidence_first_pass_node(
    state: EvidenceExtractionState,
) -> dict:
    response = await state["model"].ainvoke(
        [
            SystemMessage(content=state["system_prompt"]),
            HumanMessage(content=EVIDENCE_USER_PROMPT),
        ]
    )
    raw_text = response.content if isinstance(response.content, str) else ""
    batch = parse_evidence_output(raw_text)
    return {
        "evidence": batch,
        "tokens_used": _token_count(response.response_metadata),
        "messages": [
            HumanMessage(content=EVIDENCE_USER_PROMPT),
            AIMessage(content=raw_text),
        ],
    }


async def extract_evidence_glean_node(state: EvidenceExtractionState) -> dict:
    response = await state["model"].ainvoke(
        [
            SystemMessage(content=state["system_prompt"]),
            *state["messages"],
            HumanMessage(content=EVIDENCE_GLEAN_PROMPT),
        ]
    )
    raw_text = response.content if isinstance(response.content, str) else ""
    gleaned = parse_evidence_output(raw_text)
    existing = state["evidence"]
    return {
        "evidence": EvidenceExtractionCandidateBatch(
            observations=existing.observations + gleaned.observations,
            assertions=existing.assertions + gleaned.assertions,
        ),
        "tokens_used": state["tokens_used"]
        + _token_count(response.response_metadata),
        "gleans_completed": state["gleans_completed"] + 1,
        "messages": [
            *state["messages"],
            HumanMessage(content=EVIDENCE_GLEAN_PROMPT),
            AIMessage(content=raw_text),
        ],
    }


def _token_count(metadata: dict | None) -> int:
    if not metadata:
        return 0
    usage = metadata.get("token_usage")
    if not isinstance(usage, dict):
        return 0
    value = usage.get("total_tokens", 0)
    return int(value) if isinstance(value, int | float) else 0
