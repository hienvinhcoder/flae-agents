"""Application service for versioned semantic graph materialization."""

from __future__ import annotations

import asyncio
from hashlib import sha256
import json

from app.db.rag_db import DBManager
from app.schemas.graph_semantics import (
    GraphSemanticBuildInput,
    GraphSemanticBuildResult,
)
from app.services.knowalge_base.graph_semantic_repository import (
    GraphSemanticRepository,
)
from app.services.knowalge_base.graph_semantic_service import (
    DescriptionSummarizer,
    GraphSemanticService,
    SemanticEmbedder,
)


def _evidence_checksum(entities: tuple, relationships: tuple) -> str:
    value = {
        "entities": [item.model_dump(mode="json") for item in entities],
        "relationships": [item.model_dump(mode="json") for item in relationships],
    }
    payload = json.dumps(
        value, ensure_ascii=False, separators=(",", ":"), sort_keys=True
    ).encode()
    return "sha256:" + sha256(payload).hexdigest()


class GraphSemanticProjectionService:
    def __init__(self, manager: DBManager) -> None:
        self._repository = GraphSemanticRepository(manager)

    async def build_workspace(
        self,
        command: GraphSemanticBuildInput,
        *,
        embedder: SemanticEmbedder,
        summarizer: DescriptionSummarizer | None = None,
    ) -> GraphSemanticBuildResult:
        entities, relationships = await self._repository.load_evidence(command)
        input_checksum = _evidence_checksum(entities, relationships)
        existing = await self._repository.find_existing(
            command, input_checksum=input_checksum
        )
        if existing is not None:
            return existing
        projection = await asyncio.to_thread(
            GraphSemanticService(
                command.profile,
                embedder=embedder,
                summarizer=summarizer,
            ).build,
            entities,
            relationships,
        )
        return await self._repository.persist(
            command, projection, input_checksum=input_checksum
        )
