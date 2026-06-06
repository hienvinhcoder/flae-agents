import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock

from main import app
from app.core.security import get_current_user

client = TestClient(app)

def override_get_current_user():
    mock_user = MagicMock()
    mock_user.firebase_uid = "mock_firebase_uid_123"
    mock_user.email = "test@example.com"
    return mock_user

app.dependency_overrides[get_current_user] = override_get_current_user

@pytest.fixture
def mock_workspace_service():
    with patch("app.api.v1.endpoints.workspace.WorkspaceService.create_manual_workspace", new_callable=AsyncMock) as mock_create:
        mock_workspace = MagicMock()
        mock_workspace.id = "mock_workspace_id"
        mock_workspace.name = "My Shop"
        mock_workspace.platform = "manual"
        mock_create.return_value = mock_workspace
        yield mock_create

def test_create_manual_workspace_success(mock_workspace_service):
    response = client.post(
        "/api/v1/workspaces/manual",
        json={
            "name": "My Shop",
            "industry": "Retail",
            "description": "A test shop",
            "website": "https://myshop.com"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == "200"
    assert data["message"] == "Success"
    assert data["data"]["name"] == "My Shop"
    assert data["data"]["platform"] == "manual"
    assert data["data"]["id"] == "mock_workspace_id"
