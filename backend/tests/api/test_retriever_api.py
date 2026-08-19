import pytest
import uuid
from unittest.mock import patch, AsyncMock, MagicMock

# Mock require_roles decorator BEFORE importing main/app
def mock_require_roles(roles):
    async def dummy_dep(*args, **kwargs):
        return "admin"
    return dummy_dep

patcher = patch("app.core.security.require_roles", mock_require_roles)
patcher.start()

from main import app
from fastapi.testclient import TestClient
from app.core.security import (
    get_current_user,
    get_current_user_uid,
    get_current_workspace_id,
)

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
app.dependency_overrides[get_current_user_uid] = lambda: "mock_firebase_uid_123"
app.dependency_overrides[get_current_workspace_id] = override_get_current_workspace_id


def test_search_knowledge_base_api_success():
    results = {
        "top_chunks": [
            {
                "id": "chunk-1",
                "score": 0.85,
                "type": "chunk",
                "name": "apple_info.txt",
                "source_document": "apple_info.txt",
                "content": "Apple manufactures iPhone.",
            }
        ],
        "top_paths": [],
    }
    diagnostics = {
        "readiness": {"base": "ready"},
        "timings_ms": {"total": 100},
    }

    with patch(
        "app.api.v1.routes.knowledge.RetrieverService.retrieve",
        new_callable=AsyncMock,
        return_value=(results, diagnostics),
    ) as mock_retrieve:

        payload = {
            "query": "Ai sản xuất iPhone?",
            "top_k_chunks": 5,
            "top_k_paths": 10,
        }

        response = client.post("/api/v1/knowledge-base/search", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == "200"
        assert data["message"] == "Success"
        assert "data" in data

        # Verify content
        search_data = data["data"]
        assert len(search_data["top_chunks"]) == 1
        assert search_data["top_chunks"][0]["id"] == "chunk-1"
        assert search_data["top_chunks"][0]["content"] == "Apple manufactures iPhone."

        assert search_data["top_paths"] == []
        assert search_data["diagnostics"]["readiness"]["base"] == "ready"

        mock_retrieve.assert_called_once_with(
            workspace_id="11111111-2222-3333-4444-555555555555",
            query="Ai sản xuất iPhone?",
            top_k_chunks=5,
            top_k_paths=10,
        )
