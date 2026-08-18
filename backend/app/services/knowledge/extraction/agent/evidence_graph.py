"""LangGraph orchestration for topic-free evidence extraction."""

from __future__ import annotations

from typing import Literal

from langgraph.graph import END, START, StateGraph

from app.services.knowledge.extraction.agent.evidence_nodes import (
    extract_evidence_first_pass_node,
    extract_evidence_glean_node,
    prepare_evidence_prompt_node,
)
from app.services.knowledge.extraction.agent.evidence_state import EvidenceExtractionState
from app.agents.shared.models import get_gemini_llm
from app.schemas.enrichment import EvidenceExtractionCandidateBatch


def _route_glean(
    state: EvidenceExtractionState,
) -> Literal["extract_glean", "__end__"]:
    return (
        "extract_glean"
        if state["gleans_completed"] < state["glean_max"]
        else "__end__"
    )


builder = StateGraph(EvidenceExtractionState)  # type: ignore[bad-specialization]
builder.add_node("prepare", prepare_evidence_prompt_node)
builder.add_node("extract_first", extract_evidence_first_pass_node)
builder.add_node("extract_glean", extract_evidence_glean_node)
builder.add_edge(START, "prepare")
builder.add_edge("prepare", "extract_first")
builder.add_conditional_edges(
    "extract_first",
    _route_glean,
    {"extract_glean": "extract_glean", END: END},
)
builder.add_conditional_edges(
    "extract_glean",
    _route_glean,
    {"extract_glean": "extract_glean", END: END},
)
evidence_extraction_graph = builder.compile()


async def run_evidence_extraction_agent(
    *,
    chunk: dict[str, str],
    model_name: str,
    api_key: str,
    entity_types: list[str],
    extractor_version: str,
    glean_max: int = 0,
    language: str = "auto",
) -> tuple[EvidenceExtractionCandidateBatch, int]:
    model = get_gemini_llm(
        model_name=model_name,
        api_key=api_key,
        temperature=0.0,
    )
    if language == "auto" or not language:
        from app.agents.shared.utils import detect_language

        resolved_language = detect_language(chunk["text"])
    else:
        resolved_language = language
    empty = EvidenceExtractionCandidateBatch(observations=(), assertions=())
    state: EvidenceExtractionState = {
        "chunk_id": chunk["chunk_id"],
        "chunk_text": chunk["text"],
        "entity_types": entity_types,
        "language": resolved_language,
        "extractor_version": extractor_version,
        "glean_max": glean_max,
        "gleans_completed": 0,
        "model": model,
        "system_prompt": "",
        "messages": [],
        "evidence": empty,
        "tokens_used": 0,
    }
    result = await evidence_extraction_graph.ainvoke(state)
    return result["evidence"], result["tokens_used"]
