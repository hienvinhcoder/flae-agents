import pytest
import uuid
from unittest.mock import MagicMock, AsyncMock, patch
from app.services.srv_topic import TopicService


class MockRow:
    def __init__(self, topic_id, name, type, summary, similarity):
        self.topic_id = topic_id
        self.name = name
        self.type = type
        self.summary = summary
        self.similarity = similarity


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

    with patch("app.services.topic_resolver.rag_db_manager", mock_db_manager):
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

    with patch("app.services.topic_resolver.rag_db_manager", mock_db_manager):
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

    with patch("app.services.srv_topic.rag_db_manager", mock_db_manager), \
         patch("app.services.srv_topic.TopicService.trigger_topic_updates_via_temporal", AsyncMock()) as mock_trigger:

        success = await TopicService.merge_topics(
            workspace_id=workspace_id,
            target_topic_id=target_topic_id,
            source_topic_ids=source_topic_ids
        )

        assert success is True
        assert mock_session.commit.called
        mock_trigger.assert_called_once_with(workspace_id, [target_topic_id])
