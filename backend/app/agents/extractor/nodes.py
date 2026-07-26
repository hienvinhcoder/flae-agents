import hashlib
from typing import Tuple, List, Dict

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from app.agents.extractor.state import ExtractionState
from app.agents.extractor.prompts import (
    ENTITY_EXTRACTION_SYSTEM,
    ENTITY_EXTRACTION_USER,
    ENTITY_CONTINUE_EXTRACTION_USER,
    TUPLE_DELIMITER,
    COMPLETION_DELIMITER,
)
from app.utils import clean_entity_name


def _get_unique_id(text: str, prefix: str = "") -> str:
    return f"{prefix}{hashlib.md5(text.encode('utf-8')).hexdigest()}"


def _parse_llm_output(
    raw_text: str,
    chunk_id: str
) -> Tuple[List[Dict], List[Dict], List[Dict], List[Dict]]:
    entities = []
    relations = []
    topic_assignments = []
    topic_candidates = []

    # split by COMPLETION_DELIMITER to ignore any trailing text
    lines = [
        line.strip() for line in raw_text.split(COMPLETION_DELIMITER)[0].split('\n')
        if line.strip()
    ]

    for line in lines:
        parts = line.split(TUPLE_DELIMITER)

        if len(parts) < 2:
            continue

        category = parts[0].lower()
        if category == 'entity' and len(parts) == 4:
            entity_name = clean_entity_name(parts[1])
            entities.append({
                "entity_id": _get_unique_id(entity_name.lower(), prefix="ent-"),
                "entity_name": entity_name,
                "entity_type": clean_entity_name(parts[2]),
                "description": parts[3].strip(),
                "source_chunk_id": chunk_id
            })
        elif category == 'relation' and len(parts) == 5:
            src = clean_entity_name(parts[1])
            tgt = clean_entity_name(parts[2])
            source, target = sorted((src, tgt))
            source_lower, target_lower = sorted((src.lower(), tgt.lower()))
            relations.append({
                "relation_id": _get_unique_id(f"{source_lower}-{target_lower}", prefix="rel-"),
                "source": source,
                "target": target,
                "keywords": parts[3].strip(),
                "description": parts[4].strip(),
                "source_chunk_id": chunk_id
            })
        elif category == 'topic_assignment' and len(parts) == 4:
            try:
                confidence_str = parts[2].strip()
                confidence = float(confidence_str) if confidence_str else 1.0
            except ValueError:
                confidence = 1.0
            topic_assignments.append({
                "topic_id": parts[1].strip(),
                "confidence": confidence,
                "reason": parts[3].strip()
            })
        elif category == 'topic_candidate' and len(parts) == 4:
            try:
                confidence_str = parts[2].strip()
                confidence = float(confidence_str) if confidence_str else 1.0
            except ValueError:
                confidence = 1.0
            topic_candidates.append({
                "name": parts[1].strip(),
                "confidence": confidence,
                "reason": parts[3].strip()
            })

    return entities, relations, topic_assignments, topic_candidates


def prepare_prompts_node(state: ExtractionState) -> dict:
    cand_list = state.get("candidate_topics", [])
    if cand_list:
        cand_str = ", ".join([f"[id: {c['topic_id']}, name: {c['name']}]" for c in cand_list])
    else:
        cand_str = "None"

    shared_prompt_context = {
        "entity_types": ", ".join(state["entity_types"]),
        "candidate_topics": cand_str,
        "tuple_delimiter": TUPLE_DELIMITER,
        "completion_delimiter": COMPLETION_DELIMITER,
        "language": state["language"],
    }
    system_prompt = ENTITY_EXTRACTION_SYSTEM.format(
        **shared_prompt_context,
        input_text=state["chunk_text"]
    )
    user_prompt = ENTITY_EXTRACTION_USER.format(**shared_prompt_context)
    glean_user_prompt = ENTITY_CONTINUE_EXTRACTION_USER.format(**shared_prompt_context)
    return {
        "system_prompt": system_prompt,
        "user_prompt": user_prompt,
        "glean_user_prompt": glean_user_prompt
    }


async def extract_first_pass_node(state: ExtractionState) -> dict:
    messages = [
        SystemMessage(content=state["system_prompt"]),
        HumanMessage(content=state["user_prompt"])
    ]

    response = await state["model"].ainvoke(messages)

    raw_text = response.content
    if not isinstance(raw_text, str):
        raw_text = ""

    tokens = 0
    if response.response_metadata and "token_usage" in response.response_metadata:
        tokens = response.response_metadata["token_usage"].get("total_tokens", 0)

    ents, rels, topic_assigns, topic_cands = _parse_llm_output(raw_text, state["chunk_id"])

    return {
        "first_pass_result": raw_text,
        "entities": ents,
        "relations": rels,
        "topic_assignments": topic_assigns,
        "topic_candidates": topic_cands,
        "tokens_used": tokens,
        "messages": [
            HumanMessage(content=state["user_prompt"]),
            AIMessage(content=raw_text)
        ]
    }


async def extract_gleaning_node(state: ExtractionState) -> dict:
    messages = [
        SystemMessage(content=state["system_prompt"]),
        *state["messages"],
        HumanMessage(content=state["glean_user_prompt"])
    ]

    response = await state["model"].ainvoke(messages)

    raw_text = response.content
    if not isinstance(raw_text, str):
        raw_text = ""

    tokens = 0
    if response.response_metadata and "token_usage" in response.response_metadata:
        tokens = response.response_metadata["token_usage"].get("total_tokens", 0)

    gleaned_ents, gleaned_rels, gleaned_assigns, gleaned_cands = _parse_llm_output(raw_text, state["chunk_id"])

    all_ents = state["entities"] + gleaned_ents
    all_rels = state["relations"] + gleaned_rels
    all_assigns = state.get("topic_assignments", []) + gleaned_assigns
    all_cands = state.get("topic_candidates", []) + gleaned_cands

    return {
        "second_pass_result": raw_text,
        "entities": all_ents,
        "relations": all_rels,
        "topic_assignments": all_assigns,
        "topic_candidates": all_cands,
        "tokens_used": state["tokens_used"] + tokens
    }
