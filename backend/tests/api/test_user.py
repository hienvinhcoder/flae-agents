import pytest
import uuid
from unittest.mock import patch, AsyncMock, MagicMock

from main import app
from fastapi.testclient import TestClient
from app.core.security import get_current_user, verify_token

client = TestClient(app)

def override_get_current_user():
    mock_user = MagicMock()
    mock_user.firebase_uid = "mock_firebase_uid_123"
    mock_user.email = "test@example.com"
    mock_user.full_name = "Test User"
    mock_user.is_active = True
    mock_user.avatar_url = "https://example.com/avatar.png"
    mock_user.login_providers = ["google"]
    mock_user.current_workspace_id = None
    return mock_user

def override_verify_token():
    return {"uid": "mock_firebase_uid_123", "email": "test@example.com"}

@pytest.fixture(autouse=True)
def setup_dependencies():
    old_get_current_user = app.dependency_overrides.get(get_current_user)
    old_verify_token = app.dependency_overrides.get(verify_token)

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[verify_token] = override_verify_token
    yield
    
    if old_get_current_user is not None:
        app.dependency_overrides[get_current_user] = old_get_current_user
    else:
        app.dependency_overrides.pop(get_current_user, None)
        
    if old_verify_token is not None:
        app.dependency_overrides[verify_token] = old_verify_token
    else:
        app.dependency_overrides.pop(verify_token, None)

@pytest.fixture
def mock_workspace_service():
    with patch("app.api.v1.endpoints.user.WorkspaceService.update_current_workspace", new_callable=AsyncMock) as mock_update:
        mock_user = MagicMock()
        mock_user.id = uuid.UUID("11111111-2222-3333-4444-555555555555")
        mock_user.firebase_uid = "mock_firebase_uid_123"
        mock_user.email = "test@example.com"
        mock_user.full_name = "Test User"
        mock_user.is_active = True
        mock_user.login_providers = ["google"]
        mock_user.avatar_url = "https://example.com/avatar.png"
        mock_user.current_workspace_id = "99999999-8888-7777-6666-555555555555"
        mock_update.return_value = mock_user
        yield mock_update

@pytest.fixture
def mock_user_service():
    with patch("app.api.v1.endpoints.user.UserService.create_user", new_callable=AsyncMock) as mock_create:
        mock_user = MagicMock()
        mock_user.id = uuid.UUID("11111111-2222-3333-4444-555555555555")
        mock_user.firebase_uid = "mock_firebase_uid_123"
        mock_user.email = "test@example.com"
        mock_user.full_name = "Test User"
        mock_user.is_active = True
        mock_user.login_providers = ["google"]
        mock_user.avatar_url = "https://example.com/avatar.png"
        mock_create.return_value = mock_user
        yield mock_create

def test_update_current_workspace_success(mock_workspace_service):
    target_workspace_id = "99999999-8888-7777-6666-555555555555"
    response = client.put(
        "/api/v1/users/current-workspace",
        json={"workspace_id": target_workspace_id}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == "200"
    assert data["message"] == "Success"
    assert data["data"]["current_workspace_id"] == target_workspace_id
    mock_workspace_service.assert_called_once()

def test_update_user_profile_success():
    # Khi PUT /api/v1/users/some-user-id, FastAPI phải map đúng vào endpoint update_user chứ không phải update_current_workspace
    user_id = "some-user-id"
    response = client.put(
        f"/api/v1/users/{user_id}"
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == "200"
    assert data["message"] == "User updated successfully"
    assert data["data"]["user_id"] == user_id
    assert data["data"]["updated"] is True

def test_delete_user_success():
    user_id = "some-user-id"
    response = client.delete(
        f"/api/v1/users/{user_id}"
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == "200"
    assert data["message"] == "User deleted successfully"
    assert data["data"]["user_id"] == user_id
    assert data["data"]["deleted"] is True

def test_create_user_success(mock_user_service):
    response = client.post(
        "/api/v1/users",
        json={
            "email": "test@example.com",
            "full_name": "Test User",
            "avatar_url": "https://example.com/avatar.png",
            "login_provider": "google"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["code"] == "201"
    assert data["data"]["email"] == "test@example.com"
    assert data["data"]["id"] == "11111111-2222-3333-4444-555555555555"
    mock_user_service.assert_called_once()
