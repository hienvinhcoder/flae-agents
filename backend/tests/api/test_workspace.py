import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock, MagicMock

from main import app
from app.core.security import get_current_user

client = TestClient(app)

def override_get_current_user():
    return {"uid": "mock_firebase_uid_123", "email": "test@example.com"}

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
        "/workspaces/manual",
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

def test_get_oauth_url_success():
    response = client.post(
        "/workspaces/oauth/url",
        json={
            "platform": "haravan",
            "shop_domain": "myshop.myharavan.com"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == "200"
    assert "auth_url" in data["data"]
    assert "myshop.myharavan.com" in data["data"]["auth_url"]
