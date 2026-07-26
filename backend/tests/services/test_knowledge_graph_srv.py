import pytest
import uuid
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.knowledge_graph_srv import KnowledgeGraphService
from app.schemas.sche_knowledge_base import KnowledgeGraphResponse

@pytest.mark.asyncio
async def test_get_graph_success():
    workspace_id = uuid.UUID("11111111-2222-3333-4444-555555555555")

    # Giả lập kết quả trả về từ database cho entities
    mock_entity_row_1 = MagicMock()
    mock_entity_row_1.entity_id = "ent_1"
    mock_entity_row_1.entity_name = "Apple Inc."
    mock_entity_row_1.entity_type = "Organization"
    mock_entity_row_1.description = "A tech company"
    mock_entity_row_1.frequency = 10
    mock_entity_row_1.degree = 3

    mock_entity_row_2 = MagicMock()
    mock_entity_row_2.entity_id = "ent_2"
    mock_entity_row_2.entity_name = "Steve Jobs"
    mock_entity_row_2.entity_type = "Person"
    mock_entity_row_2.description = "Co-founder of Apple"
    mock_entity_row_2.frequency = 5
    mock_entity_row_2.degree = 2

    # Giả lập kết quả trả về từ database cho relationships
    mock_relation_row = MagicMock()
    mock_relation_row.relation_id = "rel_1"
    mock_relation_row.source_id = "ent_2"
    mock_relation_row.source_name = "Steve Jobs"
    mock_relation_row.target_id = "ent_1"
    mock_relation_row.target_name = "Apple Inc."
    mock_relation_row.keywords = "FOUNDED"
    mock_relation_row.description = "Steve Jobs founded Apple Inc."
    mock_relation_row.frequency = 5

    # Mock AsyncSession.execute
    mock_session = AsyncMock()
    # Mock kết quả trả về khi execute query
    mock_session.execute.side_effect = [
        [mock_entity_row_1, mock_entity_row_2],  # Lần 1: entities_result
        [mock_relation_row]                     # Lần 2: relations_result
    ]

    # Mock asynccontextmanager get_async_session của rag_db_manager
    class MockAsyncContextManager:
        async def __aenter__(self):
            return mock_session
        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass

    with patch("app.services.knowledge_graph_srv.rag_db_manager") as mock_db_manager:
        mock_db_manager.schema = "public"
        mock_db_manager.get_async_session.return_value = MockAsyncContextManager()

        result = await KnowledgeGraphService.get_graph(workspace_id)

        assert isinstance(result, KnowledgeGraphResponse)
        assert len(result.nodes) == 2
        assert len(result.edges) == 1

        # Kiểm tra node 1
        assert result.nodes[0].id == "ent_1"
        assert result.nodes[0].name == "Apple Inc."
        assert result.nodes[0].type == "Organization"
        assert result.nodes[0].description == "A tech company"
        assert result.nodes[0].frequency == 10
        assert result.nodes[0].degree == 3

        # Kiểm tra edge 1
        assert result.edges[0].id == "rel_1"
        assert result.edges[0].source == "ent_2"
        assert result.edges[0].target == "ent_1"
        assert result.edges[0].label == "FOUNDED"
        assert result.edges[0].description == "Steve Jobs founded Apple Inc."
        assert result.edges[0].weight == 5

        # Đảm bảo get_async_session được gọi với workspace_id dạng string
        mock_db_manager.get_async_session.assert_called_once_with(str(workspace_id))
