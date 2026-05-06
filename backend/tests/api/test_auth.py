import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from main import app
from app.core.security import get_current_user_uid

client = TestClient(app)

def override_get_current_user_uid():
    return "mock_firebase_uid_123"

app.dependency_overrides[get_current_user_uid] = override_get_current_user_uid

@pytest.fixture
def mock_auth_service():
    with patch("app.api.endpoints.auth.auth_service.sync_firebase_user") as mock_sync:
        mock_user = MagicMock()
        mock_user.id = "mock_firestore_id_123"
        mock_user.firebase_uid = "mock_firebase_uid_123"
        mock_user.email = "test@example.com"
        mock_user.full_name = "Test User"
        mock_user.avatar_url = "https://example.com/avatar.png"
        mock_user.is_active = True
        mock_sync.return_value = mock_user
        yield mock_sync

def test_sync_user_success(mock_auth_service):
    response = client.post(
        "/auth/sync-user",
        json={
            "email": "test@example.com",
            "full_name": "Test User",
            "avatar_url": "https://example.com/avatar.png",
            "login_provider": "google"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["firebase_uid"] == "mock_firebase_uid_123"
    assert data["id"] == "mock_firestore_id_123"

def test_sync_user_invalid_provider(mock_auth_service):
    response = client.post(
        "/auth/sync-user",
        json={
            "email": "test@example.com",
            "full_name": "Test User",
            "login_provider": "invalid_provider"
        }
    )
    assert response.status_code == 422 # Pydantic validation error

def test_sync_user_missing_token():
    # Remove the override for this specific test
    app.dependency_overrides.pop(get_current_user_uid, None)
    
    response = client.post(
        "/auth/sync-user",
        json={
            "email": "test@example.com",
            "full_name": "Test User",
            "login_provider": "google"
        }
    )
    assert response.status_code == 403 # Missing credentials (HTTPBearer)
    
    # Restore the override for other tests
    app.dependency_overrides[get_current_user_uid] = override_get_current_user_uid
