from typing import List, Dict, Tuple
from langgraph.graph import StateGraph, START, END
from langgraph.types import RetryPolicy

from app.agents.extractor.state import ExtractionState
from app.agents.extractor.nodes import (
    prepare_prompts_node,
    extract_first_pass_node,
    extract_gleaning_node,
)
from app.agents.shared.models import get_gemini_llm


def should_glean(state: ExtractionState) -> str:
    if state["glean_max"] > 0:
        return "extract_gleaning"
    return END


# Xây dựng và compile graph
builder = StateGraph(ExtractionState)  # type: ignore
builder.add_node("prepare_prompts", prepare_prompts_node)

retry_policy = RetryPolicy(max_attempts=3, initial_interval=1.0)
builder.add_node("extract_first_pass", extract_first_pass_node, retry_policy=retry_policy)
builder.add_node("extract_gleaning", extract_gleaning_node, retry_policy=retry_policy)

builder.add_edge(START, "prepare_prompts")
builder.add_edge("prepare_prompts", "extract_first_pass")
builder.add_conditional_edges(
    "extract_first_pass",
    should_glean,
    {
        "extract_gleaning": "extract_gleaning",
        END: END
    }
)
builder.add_edge("extract_gleaning", END)

extraction_graph = builder.compile()


async def run_extraction_agent(
    chunk: dict,
    model_name: str,
    api_key: str,
    entity_types: List[str],
    glean_max: int = 1,
    language: str = "auto"
) -> Tuple[Dict, int]:
    """
    Chạy LangGraph agent trích xuất thực thể và quan hệ cho một chunk duy nhất.
    """
    model = get_gemini_llm(
        model_name=model_name,
        api_key=api_key,
        temperature=0.1
    )
    
    # Tự động nhận diện ngôn ngữ nếu truyền vào "auto" hoặc không chỉ định
    if language == "auto" or not language:
        from app.agents.shared.utils import detect_language
        resolved_language = detect_language(chunk.get("text", ""))
    else:
        resolved_language = language
    
    initial_state = {
        "chunk_id": chunk["chunk_id"],
        "chunk_text": chunk["text"],
        "entity_types": entity_types,
        "language": resolved_language,
        "glean_max": glean_max,
        "model": model,
        "messages": [],
        "first_pass_result": "",
        "second_pass_result": "",
        "entities": [],
        "relations": [],
        "tokens_used": 0,
    }
    
    result = await extraction_graph.ainvoke(initial_state)
    
    output = {
        "entities": result.get("entities", []),
        "relations": result.get("relations", []),
    }
    return output, result.get("tokens_used", 0)
