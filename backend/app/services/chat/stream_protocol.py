"""Helpers for LangGraph astream_events (v2) → chat SSE payloads."""

from __future__ import annotations

import json
from typing import Any

from app.core.logger import get_logger

logger = get_logger(__name__)


def sse_event(payload: dict[str, Any]) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def text_from_model_chunk(chunk: object | None) -> str:
    """Normalize Gemini/LangChain chunk content (str or content-block list) to text."""
    if chunk is None:
        return ""
    text_attr = getattr(chunk, "text", None)
    if isinstance(text_attr, str) and text_attr:
        return text_attr
    return _normalize_content(getattr(chunk, "content", None))


def _normalize_content(content: object) -> str:
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(_normalize_content(item) for item in content)
    if isinstance(content, dict):
        block_type = content.get("type")
        text = content.get("text")
        if block_type in (None, "text") and isinstance(text, str):
            return text
        return ""
    nested = getattr(content, "text", None)
    return nested if isinstance(nested, str) else ""


def parse_tool_output(output: object) -> dict[str, Any]:
    if isinstance(output, dict):
        return output
    if isinstance(output, str):
        try:
            parsed = json.loads(output)
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    nested = getattr(output, "content", None)
    if nested is not None and nested is not output:
        return parse_tool_output(nested)
    return {}


def citations_from_tool_output(output: object) -> list[dict[str, Any]]:
    raw = parse_tool_output(output).get("citations")
    if not isinstance(raw, list):
        return []
    citations: list[dict[str, Any]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        source = item.get("source_document") or item.get("source")
        content = item.get("content", "")
        if not isinstance(source, str) or not source.strip():
            continue
        if not isinstance(content, str):
            continue
        score = item.get("score")
        citations.append({
            "content": content,
            "score": float(score) if isinstance(score, (int, float)) else None,
            "source_document": source,
        })
    return citations
