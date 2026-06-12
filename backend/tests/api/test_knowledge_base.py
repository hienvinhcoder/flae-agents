import pytest
import uuid
from unittest.mock import patch, AsyncMock, MagicMock

# Mock require_roles decorator dependency TRƯỚC KHI import main/app
def mock_require_roles(roles):
    async def dummy_dep(*args, **kwargs):
        return "admin"
    return dummy_dep

patcher = patch("app.core.security.require_roles", mock_require_roles)
patcher.start()

from main import app
from fastapi.testclient import TestClient
from app.core.security import get_current_user, get_current_workspace_id
from app.schemas.sche_knowledge_base import KnowledgeGraphResponse, GraphNode, GraphEdge

# Khôi phục require_roles ngay lập tức để tránh làm hỏng các test case của file khác
patcher.stop()

client = TestClient(app)


def override_get_current_user():
    mock_user = MagicMock()
    mock_user.firebase_uid = "mock_firebase_uid_123"
    mock_user.email = "test@example.com"
    return mock_user

def override_get_current_workspace_id():
    return uuid.UUID("11111111-2222-3333-4444-555555555555")

app.dependency_overrides[get_current_user] = override_get_current_user
app.dependency_overrides[get_current_workspace_id] = override_get_current_workspace_id


@pytest.fixture
def mock_graph_service():
    with patch("app.api.v1.endpoints.knowledge_base.KnowledgeGraphService.get_graph", new_callable=AsyncMock) as mock_get:
        mock_response = KnowledgeGraphResponse(
            nodes=[
                GraphNode(
                    id="entity_1",
                    name="Apple Inc.",
                    type="Organization",
                    description="Tech company",
                    frequency=5,
                    degree=2
                ),
                GraphNode(
                    id="entity_2",
                    name="Steve Jobs",
                    type="Person",
                    description="Founder",
                    frequency=3,
                    degree=1
                )
            ],
            edges=[
                GraphEdge(
                    id="rel_1",
                    source="entity_2",
                    target="entity_1",
                    label="FOUNDED",
                    description="Steve Jobs founded Apple",
                    weight=3
                )
            ]
        )
        mock_get.return_value = mock_response
        yield mock_get


def test_get_knowledge_graph_success(mock_graph_service):
    response = client.get("/api/v1/knowledge-base/graph")
    print("RESPONSE JSON:", response.json())
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == "200"
    assert data["message"] == "Success"
    assert "data" in data
    
    # Kiểm tra cấu trúc nodes
    nodes = data["data"]["nodes"]
    assert len(nodes) == 2
    assert nodes[0]["id"] == "entity_1"
    assert nodes[0]["name"] == "Apple Inc."
    assert nodes[0]["type"] == "Organization"
    assert nodes[0]["frequency"] == 5
    assert nodes[0]["degree"] == 2
    
    # Kiểm tra cấu trúc edges
    edges = data["data"]["edges"]
    assert len(edges) == 1
    assert edges[0]["id"] == "rel_1"
    assert edges[0]["source"] == "entity_2"
    assert edges[0]["target"] == "entity_1"
    assert edges[0]["label"] == "FOUNDED"
    assert edges[0]["weight"] == 3
