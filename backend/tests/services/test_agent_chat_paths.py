import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.chat import ChatSessionCreate
from app.services.agent_srv import AgentService
from app.services.chat_srv import ChatService


def scalar_result(value: object) -> MagicMock:
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    return result


@pytest.mark.asyncio
async def test_agent_service_chat_session_paths() -> None:
    db = AsyncMock(spec=AsyncSession)
    with patch.object(AgentService, "get_agent", new=AsyncMock(return_value=None)):
        assert await AgentService.create_chat_session(
            db, uuid4(), uuid4(), "user-1", ChatSessionCreate()
        ) is None

    agent = SimpleNamespace(id=uuid4())
    with patch.object(AgentService, "get_agent", new=AsyncMock(return_value=agent)):
        session = await AgentService.create_chat_session(
            db, uuid4(), agent.id, "user-1", ChatSessionCreate(title="Planning")
        )
    assert session is not None
    assert session.title == "Planning"
    db.add.assert_called()

    sessions_result = MagicMock()
    sessions_result.scalars.return_value.all.return_value = [session]
    db.execute.return_value = sessions_result
    assert await AgentService.list_chat_sessions(
        db, session.workspace_id, agent.id, "user-1"
    ) == [session]

    db.execute.return_value = scalar_result(session)
    assert await AgentService.get_chat_session(
        db, session.workspace_id, agent.id, session.id, "user-1"
    ) is session

    with patch.object(
        AgentService, "get_chat_session", new=AsyncMock(return_value=None)
    ):
        assert not await AgentService.delete_chat_session(
            db, uuid4(), uuid4(), uuid4(), "user-1"
        )
    with patch.object(
        AgentService, "get_chat_session", new=AsyncMock(return_value=session)
    ):
        assert await AgentService.delete_chat_session(
            db, uuid4(), uuid4(), uuid4(), "user-1"
        )


@pytest.mark.asyncio
async def test_agent_service_message_and_missing_agent_paths() -> None:
    db = AsyncMock(spec=AsyncSession)
    messages_result = MagicMock()
    messages_result.scalars.return_value.all.return_value = ["message"]
    db.execute.return_value = messages_result
    assert await AgentService.list_messages(db, uuid4()) == ["message"]

    message = await AgentService.create_message(
        db,
        uuid4(),
        "assistant",
        "Answer",
        [{"source_document": "Doc", "content": "Evidence", "score": 0.9}],
        "assistant",
    )
    assert message.content == "Answer"
    assert message.citations[0]["source_document"] == "Doc"

    with patch.object(AgentService, "get_agent", new=AsyncMock(return_value=None)):
        assert await AgentService.update_agent(db, uuid4(), uuid4(), MagicMock()) is None
        assert not await AgentService.delete_agent(db, uuid4(), uuid4())


class SessionContext:
    def __init__(self) -> None:
        self.db = AsyncMock(spec=AsyncSession)

    async def __aenter__(self) -> AsyncMock:
        return self.db

    async def __aexit__(self, *args: object) -> None:
        return None


class EventGraph:
    def __init__(self, events: list[dict[str, object]]) -> None:
        self.events = events

    async def astream_events(self, *args: object, **kwargs: object):
        del args, kwargs
        for event in self.events:
            if isinstance(event, Exception):
                raise event
            yield event


async def collect_stream(**kwargs: object) -> list[dict[str, object]]:
    payloads = []
    async for item in ChatService.stream_chat(**kwargs):
        payloads.append(json.loads(item.removeprefix("data: ")))
    return payloads


def stream_args() -> dict[str, object]:
    return {
        "workspace_id": uuid4(),
        "agent_id": uuid4(),
        "session_id": uuid4(),
        "user_uid": "user-1",
        "user_message": "What changed?",
    }


@pytest.mark.asyncio
async def test_chat_stream_reports_missing_agent_and_session() -> None:
    context = SessionContext()
    with (
        patch("app.services.chat_srv.AsyncSessionLocal", return_value=context),
        patch.object(AgentService, "get_agent", new=AsyncMock(return_value=None)),
    ):
        payloads = await collect_stream(**stream_args())
    assert payloads == [{"type": "error", "detail": "Agent không tồn tại"}]

    agent = SimpleNamespace(model_name="model", temperature=0.2, system_prompt="prompt")
    with (
        patch("app.services.chat_srv.AsyncSessionLocal", return_value=context),
        patch.object(AgentService, "get_agent", new=AsyncMock(return_value=agent)),
        patch.object(AgentService, "get_chat_session", new=AsyncMock(return_value=None)),
    ):
        payloads = await collect_stream(**stream_args())
    assert payloads == [{"type": "error", "detail": "Session không tồn tại"}]


@pytest.mark.asyncio
async def test_chat_stream_emits_citations_tokens_and_persists_answer() -> None:
    context = SessionContext()
    agent = SimpleNamespace(model_name="model", temperature=0.2, system_prompt="prompt")
    session = SimpleNamespace(id=uuid4())
    chunk = SimpleNamespace(content="Hello")
    graph = EventGraph([
        {
            "event": "on_tool_end",
            "name": "query_knowledge_base",
            "data": {"output": json.dumps({"citations": [{"source": "doc"}]})},
        },
        {
            "event": "on_chat_model_stream",
            "metadata": {"langgraph_node": "model"},
            "data": {"chunk": chunk},
        },
    ])
    create_message = AsyncMock()
    with (
        patch("app.services.chat_srv.AsyncSessionLocal", return_value=context),
        patch.object(AgentService, "get_agent", new=AsyncMock(return_value=agent)),
        patch.object(
            AgentService, "get_chat_session", new=AsyncMock(return_value=session)
        ),
        patch.object(AgentService, "create_message", new=create_message),
        patch("app.services.chat_srv.get_qa_agent_graph", return_value=graph),
    ):
        payloads = await collect_stream(**stream_args())
    assert [payload["type"] for payload in payloads] == ["citations", "token", "done"]
    assert create_message.await_count == 2
    assert create_message.await_args_list[-1].kwargs["content"] == "Hello"


@pytest.mark.asyncio
async def test_chat_stream_does_not_leak_internal_errors() -> None:
    context = SessionContext()
    agent = SimpleNamespace(model_name="model", temperature=0.2, system_prompt="prompt")
    graph = EventGraph([RuntimeError("private provider detail")])
    with (
        patch("app.services.chat_srv.AsyncSessionLocal", return_value=context),
        patch.object(AgentService, "get_agent", new=AsyncMock(return_value=agent)),
        patch.object(
            AgentService, "get_chat_session", new=AsyncMock(return_value=object())
        ),
        patch.object(AgentService, "create_message", new=AsyncMock()),
        patch("app.services.chat_srv.get_qa_agent_graph", return_value=graph),
    ):
        payloads = await collect_stream(**stream_args())
    assert payloads == [{"type": "error", "detail": "Không thể xử lý hội thoại."}]
    assert "private provider detail" not in json.dumps(payloads)
