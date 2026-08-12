from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import ExternalServiceError
from app.services.knowledge.discovery.topic_summary import TopicSummaryService
from app.services.knowledge.discovery.topics import TopicService


class MockRow:
    def __init__(self, topic_id, name, type, summary, similarity):
        self.topic_id = topic_id
        self.name = name
        self.type = type
        self.summary = summary
        self.similarity = similarity


def scalar_result(value: object) -> MagicMock:
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    return result


def memberships_result(*values: object) -> MagicMock:
    result = MagicMock()
    result.scalars.return_value.all.return_value = list(values)
    return result


def rag_session(*results: object) -> tuple[AsyncMock, MagicMock]:
    session = AsyncMock()
    session.execute.side_effect = list(results)
    manager = MagicMock()
    manager.schema = "rag"
    manager.get_async_session.return_value.__aenter__.return_value = session
    manager.get_async_session.return_value.__aexit__.return_value = False
    return session, manager


@pytest.mark.asyncio
async def test_topic_summary_skips_missing_topic() -> None:
    session, manager = rag_session(scalar_result(None))

    with patch(
        "app.services.knowledge.discovery.topic_summary.rag_db_manager", manager
    ):
        result = await TopicSummaryService().update("workspace-1", "topic-1")

    assert result == {"status": "skipped", "reason": "Topic not found"}
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_topic_summary_completes_queue_when_evidence_is_missing() -> None:
    topic = SimpleNamespace(name="Architecture")
    session, manager = rag_session(
        scalar_result(topic),
        MagicMock(),
        memberships_result(),
        MagicMock(),
    )

    with patch(
        "app.services.knowledge.discovery.topic_summary.rag_db_manager", manager
    ):
        result = await TopicSummaryService().update("workspace-1", "topic-1")

    assert result == {"status": "skipped", "reason": "No evidence"}
    assert session.commit.await_count == 2
    assert session.execute.await_count == 4
    assert "completed" in str(session.execute.await_args_list[-1].args[0].compile().params)


@pytest.mark.asyncio
async def test_topic_summary_marks_queue_failed_on_provider_error() -> None:
    topic = SimpleNamespace(name="Architecture")
    membership = SimpleNamespace(member_type="chunk", member_id="chunk-1")
    chunks = [("Evidence",)]
    session, manager = rag_session(
        scalar_result(topic),
        MagicMock(),
        memberships_result(membership),
        chunks,
        MagicMock(),
    )
    provider_error = RuntimeError("provider unavailable")

    with (
        patch(
            "app.services.knowledge.discovery.topic_summary.rag_db_manager", manager
        ),
        patch.object(
            TopicSummaryService,
            "_generate_summary",
            side_effect=provider_error,
        ),
        pytest.raises(ExternalServiceError) as error,
    ):
        await TopicSummaryService().update("workspace-1", "topic-1")

    assert error.value.__cause__ is provider_error
    assert session.commit.await_count == 2
    assert "failed" in str(session.execute.await_args_list[-1].args[0].compile().params)


@pytest.mark.asyncio
async def test_topic_summary_preserves_provider_application_error() -> None:
    topic = SimpleNamespace(name="Architecture")
    membership = SimpleNamespace(member_type="chunk", member_id="chunk-1")
    session, manager = rag_session(
        scalar_result(topic),
        MagicMock(),
        memberships_result(membership),
        [("Evidence",)],
        MagicMock(),
    )
    provider_error = ExternalServiceError("Gemini unavailable")

    with (
        patch(
            "app.services.knowledge.discovery.topic_summary.rag_db_manager", manager
        ),
        patch.object(
            TopicSummaryService,
            "_generate_summary",
            side_effect=provider_error,
        ),
        pytest.raises(ExternalServiceError) as error,
    ):
        await TopicSummaryService().update("workspace-1", "topic-1")

    assert error.value is provider_error
    assert session.commit.await_count == 2
    assert "failed" in str(session.execute.await_args_list[-1].args[0].compile().params)


@pytest.mark.asyncio
async def test_topic_summary_updates_topic_embedding_and_queue() -> None:
    events: list[str] = []
    topic = SimpleNamespace(
        name="Architecture",
        summary=None,
        current_state=None,
        updated_at=None,
        embedding=None,
    )
    membership = SimpleNamespace(member_type="chunk", member_id="chunk-1")
    results = iter(
        [
            scalar_result(topic),
            MagicMock(),
            memberships_result(membership),
            [("Evidence",)],
            MagicMock(),
        ]
    )
    session = AsyncMock()

    async def execute(*args: object, **kwargs: object) -> object:
        del args, kwargs
        events.append("execute")
        return next(results)

    async def commit() -> None:
        events.append("commit")

    session.execute.side_effect = execute
    session.commit.side_effect = commit
    manager = MagicMock(schema="rag")
    manager.get_async_session.return_value.__aenter__.return_value = session
    manager.get_async_session.return_value.__aexit__.return_value = False

    def generate_summary(prompt: str) -> tuple[str, str]:
        assert "Evidence" in prompt
        events.append("provider")
        return "Summary", "Current state"

    async def generate_embedding(name: str, summary: str) -> list[float]:
        assert (name, summary) == ("Architecture", "Summary")
        events.append("embedding")
        return [0.1, 0.2]

    async def run_in_thread(function: object, *args: object) -> object:
        events.append("to_thread")
        return function(*args)  # type: ignore[operator]

    with (
        patch(
            "app.services.knowledge.discovery.topic_summary.rag_db_manager", manager
        ),
        patch.object(
            TopicSummaryService,
            "_generate_summary",
            side_effect=generate_summary,
        ),
        patch.object(
            TopicSummaryService,
            "_generate_embedding",
            new=AsyncMock(side_effect=generate_embedding),
        ),
        patch(
            "app.services.knowledge.discovery.topic_summary.asyncio.to_thread",
            new=AsyncMock(side_effect=run_in_thread),
        ),
    ):
        result = await TopicSummaryService().update("workspace-1", "topic-1")

    assert result == {"status": "completed", "topic_id": "topic-1"}
    assert topic.summary == "Summary"
    assert topic.current_state == "Current state"
    assert topic.embedding == [0.1, 0.2]
    assert topic.updated_at is not None
    assert events == [
        "execute",
        "execute",
        "commit",
        "execute",
        "execute",
        "to_thread",
        "provider",
        "embedding",
        "execute",
        "commit",
    ]


@pytest.mark.asyncio
async def test_pre_filter_topics():
    workspace_id = "11111111-2222-3333-4444-555555555555"
    chunk_embedding = [0.1, 0.2, 0.3]
    text_content = "Học máy (Machine Learning) là một lĩnh vực của AI."

    mock_session = MagicMock()
    mock_execute_res = MagicMock()

    mock_rows = [
        MockRow("topic-1", "Machine Learning", "topic", "AI summary", 0.85),
        MockRow("topic-2", "Artificial Intelligence", "domain", "AI summary", 0.72)
    ]
    mock_execute_res.__iter__.return_value = mock_rows
    mock_session.execute = AsyncMock(return_value=mock_execute_res)

    mock_db_manager = MagicMock()
    mock_db_manager.get_async_session.return_value.__aenter__.return_value = mock_session

    with patch("app.services.knowledge.discovery.topic_resolver.rag_db_manager", mock_db_manager):
        candidates = await TopicService.pre_filter_topics(
            workspace_id=workspace_id,
            chunk_embedding=chunk_embedding,
            text_content=text_content,
            entity_names=[]
        )

        assert len(candidates) == 2
        assert candidates[0]["name"] == "Machine Learning"
        assert candidates[1]["name"] == "Artificial Intelligence"


def test_resolve_topic_assignments_auto_assign():
    workspace_id = "11111111-2222-3333-4444-555555555555"
    chunk_id = "chunk-1"
    doc_id = "doc-1"
    chunk_embedding = [0.1, 0.2, 0.3]

    llm_assignments = [
        {"topic_id": "topic-ml", "confidence": 0.9}
    ]

    mock_conn = MagicMock()
    mock_cursor = MagicMock()

    # fetchone trả về lần lượt (entity_ids, relation_ids) và sau đó là vector similarity
    mock_cursor.fetchone.side_effect = [
        (["ent-1"], ["rel-1"]), # Lần gọi 1: entity_ids, relation_ids
        (0.85,)                 # Lần gọi 2: vector similarity
    ]
    mock_cursor.fetchall.return_value = []
    mock_conn.cursor.return_value = mock_cursor

    mock_db_manager = MagicMock()
    mock_db_manager.get_conn.return_value = mock_conn

    with patch("app.services.knowledge.discovery.topic_resolver.rag_db_manager", mock_db_manager):
        affected_topics = TopicService.resolve_topic_assignments(
            workspace_id=workspace_id,
            chunk_id=chunk_id,
            chunk_embedding=chunk_embedding,
            llm_assignments=llm_assignments,
            llm_candidates=[],
            doc_id=doc_id
        )

        assert len(affected_topics) == 1
        assert affected_topics[0] == "topic-ml"


@pytest.mark.asyncio
async def test_merge_topics():
    workspace_id = "11111111-2222-3333-4444-555555555555"
    target_topic_id = "topic-target"
    source_topic_ids = ["topic-src1"]

    mock_session = MagicMock()
    mock_session.execute = AsyncMock()
    mock_session.commit = AsyncMock()
    mock_session.delete = AsyncMock()
    mock_session.add = MagicMock()

    mock_topic_target = MagicMock(topic_id="topic-target", name="Target Topic", type="topic")
    mock_topic_src1 = MagicMock(topic_id="topic-src1", name="Source Topic 1", type="topic")

    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = mock_topic_target

    mock_res.scalars.return_value.all.side_effect = [
        [mock_topic_src1],
        []
    ]
    mock_session.execute.return_value = mock_res

    mock_db_manager = MagicMock()
    mock_db_manager.get_async_session.return_value.__aenter__.return_value = mock_session

    with patch("app.services.knowledge.discovery.topics.rag_db_manager", mock_db_manager), \
         patch("app.services.knowledge.discovery.topics.TopicService.trigger_topic_updates_via_temporal", AsyncMock()) as mock_trigger:

        success = await TopicService.merge_topics(
            workspace_id=workspace_id,
            target_topic_id=target_topic_id,
            source_topic_ids=source_topic_ids
        )

        assert success is True
        assert mock_session.commit.called
        mock_trigger.assert_called_once_with(workspace_id, [target_topic_id])
