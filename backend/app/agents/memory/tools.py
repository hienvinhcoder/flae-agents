"""Read-only LangChain tools over canonical Company Memory capabilities."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field
from langchain_core.tools import BaseTool, tool

from app.schemas.memory_query import (
    MemoryQueryBudget,
    MemoryQueryRequest,
)
from app.db.rag_repository import AuthorizationContext
from app.schemas.discovery_catalog import CatalogListRequest
from app.services.knowledge.discovery.catalog_service import KnowledgeCatalogService
from app.services.knowledge.retrieval.query_service import KnowledgeQueryService
from app.services.knowledge.retrieval.models import TGSFeatures


class MemoryToolInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    query: str = Field(min_length=1, max_length=4_000)
    max_chunks: int = Field(default=5, ge=1, le=20)
    max_paths: int = Field(default=5, ge=0, le=20)


class EvidenceToolInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    assertion_id: str = Field(min_length=1, max_length=500)


class CatalogListToolInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    limit: int = Field(default=20, ge=1, le=100)
    cursor: str | None = Field(default=None, min_length=1, max_length=4_000)


class CatalogContextToolInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    context_id: UUID


class CatalogTopicListToolInput(CatalogContextToolInput):
    limit: int = Field(default=20, ge=1, le=100)
    cursor: str | None = Field(default=None, min_length=1, max_length=4_000)


def build_memory_tools(service: KnowledgeQueryService) -> list[BaseTool]:
    @tool("search_company_memory", args_schema=MemoryToolInput)
    async def search_company_memory(
        query: str, max_chunks: int = 5, max_paths: int = 5
    ) -> dict[str, object]:
        """Search current authorized company evidence and return cited text and graph paths.

        Args:
            query: Natural-language question about company knowledge.
            max_chunks: Maximum evidence chunks to return.
            max_paths: Maximum directed graph paths to return.
        """
        result = await service.search(
            MemoryQueryRequest(
                query=query,
                budget=MemoryQueryBudget(
                    max_chunks=max_chunks,
                    max_paths=max_paths,
                ),
            )
        )
        return result.model_dump(mode="json")

    @tool("explore_company_graph", args_schema=MemoryToolInput)
    async def explore_company_graph(
        query: str, max_chunks: int = 3, max_paths: int = 5
    ) -> dict[str, object]:
        """Explore current authorized directed relationships with hop-level evidence.

        Args:
            query: Entity or relationship question used to seed graph exploration.
            max_chunks: Maximum supporting chunks to return.
            max_paths: Maximum evidence-backed graph paths to return.
        """
        result = await service.search(
            MemoryQueryRequest(
                query=query,
                budget=MemoryQueryBudget(
                    max_chunks=max_chunks,
                    max_paths=max_paths,
                ),
                features=TGSFeatures(graph_to_text=True, text_to_graph=True),
            )
        )
        return result.model_dump(mode="json")

    @tool("explain_memory_evidence", args_schema=EvidenceToolInput)
    async def explain_memory_evidence(assertion_id: str) -> dict[str, object]:
        """Verify one assertion and return its exact authorized source excerpt.

        Args:
            assertion_id: Assertion evidence identifier from a prior memory result.
        """
        result = await service.explain_assertion(assertion_id)
        return result.model_dump(mode="json")

    return [search_company_memory, explore_company_graph, explain_memory_evidence]


def build_catalog_tools(
    service: KnowledgeCatalogService,
    authorization: AuthorizationContext,
) -> list[BaseTool]:
    def request(limit: int, cursor: str | None) -> CatalogListRequest:
        return CatalogListRequest(
            workspace_id=authorization.workspace_id,
            subject_id=authorization.subject_id,
            limit=limit,
            cursor=cursor,
        )

    @tool("discover_company_contexts", args_schema=CatalogListToolInput)
    async def discover_company_contexts(
        limit: int = 20, cursor: str | None = None
    ) -> dict[str, object]:
        """Discover authorized company contexts before targeted retrieval."""
        result = await service.list_contexts(request(limit, cursor))
        return result.model_dump(mode="json")

    @tool("get_company_context", args_schema=CatalogContextToolInput)
    async def get_company_context(context_id: UUID) -> dict[str, object]:
        """Get one authorized context and its topic roots."""
        result = await service.get_context(
            workspace_id=authorization.workspace_id,
            subject_id=authorization.subject_id,
            context_id=context_id,
        )
        return result.model_dump(mode="json")

    @tool("list_context_topics", args_schema=CatalogTopicListToolInput)
    async def list_context_topics(
        context_id: UUID,
        limit: int = 20,
        cursor: str | None = None,
    ) -> dict[str, object]:
        """Browse the authorized topic table of contents for one context."""
        result = await service.list_topics(
            request(limit, cursor), context_id=context_id
        )
        return result.model_dump(mode="json")

    return [
        discover_company_contexts,
        get_company_context,
        list_context_topics,
    ]
