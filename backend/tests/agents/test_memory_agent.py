import json
from unittest.mock import AsyncMock, MagicMock, patch

from langchain_core.messages import AIMessage, ToolMessage

from app.agents.memory.graph import (
    MemoryAgentBudget,
    MemoryAgentRequest,
    MemoryAgentRuntime,
)
from app.agents.memory.tools import build_catalog_tools, build_memory_tools
from app.services.knowledge.repositories.tenant import AuthorizationContext
from app.schemas.memory_query import MemoryQueryRequest


class FakeCapabilityService:
    def __init__(self, result) -> None:
        self.result = result
        self.requests: list[MemoryQueryRequest] = []

    async def search(self, request: MemoryQueryRequest):
        self.requests.append(request)
        return self.result


async def test_memory_tools_call_capability_service_with_typed_budgets() -> None:
    result = MagicMock()
    result.model_dump.return_value = {"text_hits": [], "graph_paths": []}
    service = FakeCapabilityService(result)
    tools = build_memory_tools(service)

    output = await tools[0].ainvoke(
        {"query": "Find the Aurora incident", "max_chunks": 3, "max_paths": 2}
    )

    assert tools[0].name == "search_company_memory"
    assert "evidence" in tools[0].description.lower()
    assert output == {"text_hits": [], "graph_paths": []}
    assert service.requests[0].budget.max_chunks == 3
    assert service.requests[0].budget.max_paths == 2


async def test_runtime_preserves_tool_citations_and_enforces_recursion_budget() -> None:
    citation = {
        "assertion_id": "assertion-a",
        "revision_id": "revision-a",
        "chunk_id": "chunk-a",
        "resource_uri": "flae://workspace/ws/chunks/chunk-a",
        "evidence_start": 0,
        "evidence_end": 8,
        "source_id": "source-a",
        "source_name": "ADR",
    }
    fake_graph = MagicMock()
    fake_graph.ainvoke = AsyncMock(
        return_value={
            "messages": [
                ToolMessage(
                    content=json.dumps({"citations": [citation]}),
                    tool_call_id="call-1",
                ),
                AIMessage(content="Aurora was caused by PR-1842 [assertion-a]."),
            ]
        }
    )
    runtime = MemoryAgentRuntime(fake_graph)

    outcome = await runtime.run(
        MemoryAgentRequest(
            question="What caused Aurora?",
            budget=MemoryAgentBudget(max_steps=6, timeout_ms=2_000),
        )
    )

    assert outcome.status == "complete"
    assert outcome.citation_ids == ("assertion-a",)
    assert "PR-1842" in outcome.answer
    assert fake_graph.ainvoke.await_args.kwargs["config"]["recursion_limit"] == 6


async def test_langsmith_failure_does_not_change_agent_correctness() -> None:
    fake_graph = MagicMock()
    fake_graph.ainvoke = AsyncMock(
        return_value={"messages": [AIMessage(content="Evidence-backed answer.")]}
    )
    tracer = MagicMock()
    tracer.record = AsyncMock(side_effect=RuntimeError("langsmith unavailable"))
    runtime = MemoryAgentRuntime(fake_graph, tracer=tracer)

    outcome = await runtime.run(MemoryAgentRequest(question="Question"))

    assert outcome.status == "complete"
    assert outcome.answer == "Evidence-backed answer."


def test_runtime_factory_uses_create_agent_with_read_only_tools() -> None:
    service = MagicMock()
    model = MagicMock()
    compiled = MagicMock()
    with patch("app.agents.memory.graph.create_agent", return_value=compiled) as factory:
        runtime = MemoryAgentRuntime.build(model=model, service=service)

    assert runtime.graph is compiled
    assert {tool.name for tool in factory.call_args.kwargs["tools"]} == {
        "search_company_memory",
        "explore_company_graph",
        "explain_memory_evidence",
    }


async def test_catalog_tools_navigate_workspace_context_topics_without_prior_ids() -> None:
    context_id = "75000000-0000-0000-0000-000000000001"
    topic_id = "74000000-0000-0000-0000-000000000001"
    page = MagicMock()
    page.model_dump.return_value = {
        "items": [{"context_id": context_id, "name": "Aurora"}],
        "next_cursor": None,
    }
    detail = MagicMock()
    detail.model_dump.return_value = {
        "context_id": context_id,
        "topic_ids": [topic_id],
    }
    topics = MagicMock()
    topics.model_dump.return_value = {
        "items": [{"topic_id": topic_id, "name": "Incident"}]
    }
    catalog = MagicMock()
    catalog.list_contexts = AsyncMock(return_value=page)
    catalog.get_context = AsyncMock(return_value=detail)
    catalog.list_topics = AsyncMock(return_value=topics)
    authorization = AuthorizationContext(
        workspace_id="10000000-0000-0000-0000-000000000001",
        subject_id="user-1",
        authorization_version="acl-v1",
    )
    tools = build_catalog_tools(catalog, authorization)

    discovered = await tools[0].ainvoke({"limit": 10})
    context = await tools[1].ainvoke({"context_id": context_id})
    topic_page = await tools[2].ainvoke(
        {"context_id": context_id, "limit": 10}
    )

    assert discovered["items"][0]["context_id"] == context_id
    assert context["topic_ids"] == [topic_id]
    assert topic_page["items"][0]["topic_id"] == topic_id
    assert {tool.name for tool in tools} == {
        "discover_company_contexts",
        "get_company_context",
        "list_context_topics",
    }
