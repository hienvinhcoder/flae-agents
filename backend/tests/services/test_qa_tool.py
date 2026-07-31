from collections.abc import Callable
from typing import cast
from unittest.mock import AsyncMock, patch

import pytest

from app.agents.qa.tools import KnowledgeToolResult, query_knowledge_base


def tool_coroutine() -> Callable[..., object]:
    assert query_knowledge_base.coroutine is not None
    return cast(Callable[..., object], query_knowledge_base.coroutine)


@pytest.mark.asyncio
async def test_query_knowledge_base_requires_workspace() -> None:
    result = await tool_coroutine()("question", {"configurable": {}})
    assert result == {"context": "", "citations": []}


@pytest.mark.asyncio
async def test_query_knowledge_base_formats_context_and_citations() -> None:
    retrieve = AsyncMock(
        return_value=(
            {
                "top_chunks": [
                    {
                        "source_document": "Handbook",
                        "content": "Approved policy",
                        "score": "0.75",
                    }
                ]
            },
            {},
        )
    )
    with patch(
        "app.agents.qa.tools.RetrieverService.retrieve", new=retrieve
    ):
        result = cast(
            KnowledgeToolResult,
            await tool_coroutine()(
                "policy", {"configurable": {"workspace_id": "ws-1"}}
            ),
        )
    assert result["context"] == "[1] Tài liệu: Handbook\nNội dung: Approved policy"
    assert result["citations"][0]["score"] == 0.75


@pytest.mark.asyncio
async def test_query_knowledge_base_hides_retriever_errors() -> None:
    with patch(
        "app.agents.qa.tools.RetrieverService.retrieve",
        new=AsyncMock(side_effect=RuntimeError("private database detail")),
    ):
        result = await tool_coroutine()(
            "policy", {"configurable": {"workspace_id": "ws-1"}}
        )
    assert result == {
        "context": "Không thể truy xuất tài liệu lúc này.",
        "citations": [],
    }
