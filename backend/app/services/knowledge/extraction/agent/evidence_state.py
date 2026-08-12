"""Typed LangGraph state for evidence extraction."""

from langchain_core.messages import BaseMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from typing import TypedDict

from app.schemas.enrichment import EvidenceExtractionCandidateBatch


class EvidenceExtractionState(TypedDict):
    chunk_id: str
    chunk_text: str
    entity_types: list[str]
    language: str
    extractor_version: str
    glean_max: int
    gleans_completed: int
    model: ChatGoogleGenerativeAI
    system_prompt: str
    messages: list[BaseMessage]
    evidence: EvidenceExtractionCandidateBatch
    tokens_used: int
