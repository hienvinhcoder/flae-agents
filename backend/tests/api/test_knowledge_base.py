from hashlib import sha256
from unittest.mock import patch, AsyncMock, MagicMock
import uuid

import pytest

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
from app.schemas.knowledge import (
    GraphEdge,
    GraphNode,
    KnowledgeGraphResponse,
    ManualDocumentCreate,
)
from app.services.knowledge.documents import KnowledgeBaseService

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
    with patch("app.api.v1.routes.knowledge.KnowledgeGraphService.get_graph", new_callable=AsyncMock) as mock_get:
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


@pytest.mark.asyncio
async def test_create_manual_document_uploads_exact_utf8_bytes_without_flag(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class FakeSession:
        def __init__(self) -> None:
            self.added = None

        def add(self, value) -> None:
            self.added = value

        async def commit(self) -> None:
            pass

        async def refresh(self, value) -> None:
            pass

    workspace_id = uuid.uuid4()
    payload = ManualDocumentCreate(
        title="Architecture",
        content_text="# Café 🚀\n",
    )
    content_bytes = payload.content_text.encode("utf-8")
    upload = AsyncMock(return_value="workspace/manual/document.md")
    start_workflow = AsyncMock(return_value="knowledge-ingestion-v1-run")
    monkeypatch.setattr(
        "app.services.knowledge.documents.GCSStorageService.upload_file",
        upload,
    )
    monkeypatch.setattr(
        "app.services.knowledge.documents._start_ingestion_workflow",
        start_workflow,
    )
    db = FakeSession()

    await KnowledgeBaseService.create_manual_document(
        db,
        workspace_id,
        "user-1",
        payload,
    )

    upload.assert_awaited_once_with(
        workspace_id=workspace_id,
        document_id=db.added.id,
        file_name=f"document-{db.added.id}.md",
        file_content=content_bytes,
        content_type="text/markdown",
    )
    assert db.added.gcs_path == "workspace/manual/document.md"
    assert db.added.content_checksum == "sha256:" + sha256(content_bytes).hexdigest()
