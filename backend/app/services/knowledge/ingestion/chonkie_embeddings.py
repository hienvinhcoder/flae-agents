"""Gemini embeddings adapter for Chonkie SemanticChunker (FLAE settings)."""

from __future__ import annotations

from typing import Any

import numpy as np
import tiktoken
from chonkie.embeddings.base import BaseEmbeddings

from app.core.config import settings
from app.core.exceptions import InvalidArgumentError
from app.core.logger import get_logger

logger = get_logger(__name__)

_ENCODING: tiktoken.Encoding | None = None


def _cl100k() -> tiktoken.Encoding:
    global _ENCODING
    if _ENCODING is None:
        _ENCODING = tiktoken.get_encoding("cl100k_base")
    return _ENCODING


class FlaeGeminiEmbeddings(BaseEmbeddings):
    """Chonkie embeddings backed by FLAE's Gemini embedding path."""

    def __init__(self) -> None:
        super().__init__()
        if not settings.GEMINI_API_KEY:
            raise InvalidArgumentError(
                "GEMINI_API_KEY is required for semantic chunking with Gemini embeddings."
            )
        self._dimension = int(settings.EMBEDDING_DIMENSIONS)
        self._model = settings.GEMINI_EMBEDDING_MODEL

    @property
    def dimension(self) -> int:
        return self._dimension

    def get_tokenizer(self) -> Any:
        """cl100k — same tokenizer FLAE uses for chunk token budgets."""
        return _cl100k()

    def embed(self, text: str) -> np.ndarray:
        vectors = self.embed_batch([text])
        return vectors[0]

    def embed_batch(self, texts: list[str]) -> list[np.ndarray]:
        # Lazy import avoids circular import with ingestion.service.
        from app.services.knowledge.ingestion.service import IngestionService

        if not texts:
            return []
        embeddings, _tokens = IngestionService.generate_embeddings(texts, "semantic_chunk")
        out: list[np.ndarray] = []
        for index, emb in enumerate(embeddings):
            if emb is None:
                raise InvalidArgumentError(
                    f"Gemini returned no embedding for semantic-chunk text index {index}."
                )
            out.append(np.asarray(emb, dtype=np.float32))
        logger.debug(
            "FlaeGeminiEmbeddings batch complete",
            extra={"batch_size": len(texts), "model": self._model},
        )
        return out

    def __repr__(self) -> str:
        return (
            f"FlaeGeminiEmbeddings(model={self._model!r}, "
            f"dimensions={self._dimension})"
        )
