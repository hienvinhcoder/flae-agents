import pytest
import uuid
from unittest.mock import patch, AsyncMock, MagicMock

# Định nghĩa mock require_roles
def mock_require_roles(roles):
    async def dummy_dep(*args, **kwargs):
        return "admin"
    return dummy_dep

# Sử dụng fixture scope module để giữ mock require_roles hoạt động
@pytest.fixture(scope="module", autouse=True)
def setup_mocks():
    patcher = patch("app.core.security.require_roles", mock_require_roles)
    patcher.start()
    yield
    patcher.stop()

from main import app
from fastapi.testclient import TestClient
from app.core.security import get_current_user, get_current_workspace_id, verify_token

# Mocks are set up in setup_dependency_overrides fixture below

client = TestClient(app)

def override_get_current_user():
    mock_user = MagicMock()
    mock_user.firebase_uid = "mock_firebase_uid_123"
    mock_user.email = "test@example.com"
    return mock_user

def override_get_current_workspace_id():
    return uuid.UUID("11111111-2222-3333-4444-555555555555")

@pytest.fixture(scope="module", autouse=True)
def setup_dependency_overrides():
    old_verify_token = app.dependency_overrides.get(verify_token)
    old_get_current_user = app.dependency_overrides.get(get_current_user)
    old_get_current_workspace_id = app.dependency_overrides.get(get_current_workspace_id)

    app.dependency_overrides[verify_token] = lambda: {"uid": "mock_firebase_uid_123"}
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_current_workspace_id] = override_get_current_workspace_id

    yield

    if old_verify_token is not None:
        app.dependency_overrides[verify_token] = old_verify_token
    else:
        app.dependency_overrides.pop(verify_token, None)

    if old_get_current_user is not None:
        app.dependency_overrides[get_current_user] = old_get_current_user
    else:
        app.dependency_overrides.pop(get_current_user, None)

    if old_get_current_workspace_id is not None:
        app.dependency_overrides[get_current_workspace_id] = old_get_current_workspace_id
    else:
        app.dependency_overrides.pop(get_current_workspace_id, None)


def test_get_topics():
    workspace_id = "11111111-2222-3333-4444-555555555555"
    mock_topics = [
        {
            "workspace_id": workspace_id,
            "topic_id": "topic-1",
            "name": "Machine Learning",
            "slug": "machine-learning",
            "type": "topic",
            "summary": "AI summary",
            "current_state": "Active development",
            "status": "active",
            "confidence": 0.9,
            "evidence_count": 5,
            "created_at": "2026-06-30T12:00:00Z",
            "updated_at": "2026-06-30T12:00:00Z"
        }
    ]

    with patch("app.services.knowledge.discovery.topics.TopicService.get_topics", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_topics

        response = client.get(f"/api/v1/workspaces/{workspace_id}/topics")

        assert response.status_code == 200, response.text
        res_data = response.json()
        assert res_data["code"] == "200"
        assert len(res_data["data"]) == 1
        assert res_data["data"][0]["name"] == "Machine Learning"


def test_get_topic_detail():
    workspace_id = "11111111-2222-3333-4444-555555555555"
    topic_id = "topic-1"
    mock_detail = {
        "workspace_id": workspace_id,
        "topic_id": topic_id,
        "name": "Machine Learning",
        "slug": "machine-learning",
        "type": "topic",
        "summary": "AI summary",
        "current_state": "Active development",
        "status": "active",
        "confidence": 0.9,
        "created_at": "2026-06-30T12:00:00Z",
        "updated_at": "2026-06-30T12:00:00Z",
        "members": [
            {
                "member_type": "chunk",
                "member_id": "chunk-1",
                "relevance_score": 0.85,
                "evidence_count": 1,
                "created_at": "2026-06-30T12:00:00Z",
                "metadata": {"text": "Learn about ML"}
            }
        ]
    }

    with patch("app.services.knowledge.discovery.topics.TopicService.get_topic_detail", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_detail

        response = client.get(f"/api/v1/workspaces/{workspace_id}/topics/{topic_id}")

        assert response.status_code == 200, response.text
        res_data = response.json()
        assert res_data["code"] == "200"
        assert res_data["data"]["topic_id"] == topic_id
        assert len(res_data["data"]["members"]) == 1


def test_update_topic():
    workspace_id = "11111111-2222-3333-4444-555555555555"
    topic_id = "topic-1"
    payload = {
        "name": "Updated ML",
        "status": "archived"
    }

    with patch("app.services.knowledge.discovery.topics.TopicService.update_topic", new_callable=AsyncMock) as mock_update:
        mock_update.return_value = {
            "workspace_id": workspace_id,
            "topic_id": topic_id,
            "name": "Updated ML",
            "slug": "updated-ml",
            "status": "archived"
        }

        response = client.put(f"/api/v1/workspaces/{workspace_id}/topics/{topic_id}", json=payload)

        assert response.status_code == 200, response.text
        res_data = response.json()
        assert res_data["code"] == "200"
        assert res_data["data"]["status"] == "archived"


def test_merge_topics():
    workspace_id = "11111111-2222-3333-4444-555555555555"
    payload = {
        "target_topic_id": "topic-target",
        "source_topic_ids": ["topic-src1"]
    }

    with patch("app.services.knowledge.discovery.topics.TopicService.merge_topics", new_callable=AsyncMock) as mock_merge:
        mock_merge.return_value = True

        response = client.post(f"/api/v1/workspaces/{workspace_id}/topics/merge", json=payload)

        assert response.status_code == 200, response.text
        res_data = response.json()
        assert res_data["code"] == "200"
        assert res_data["data"] is True


def test_re_summarize_topic():
    workspace_id = "11111111-2222-3333-4444-555555555555"
    topic_id = "topic-1"

    with patch("app.services.knowledge.discovery.topics.TopicService.request_re_summarize", new_callable=AsyncMock) as mock_request:
        response = client.post(f"/api/v1/workspaces/{workspace_id}/topics/{topic_id}/re-summarize")

        assert response.status_code == 200, response.text
        res_data = response.json()
        assert res_data["code"] == "200"
        assert res_data["data"] is True
        mock_request.assert_called_once_with(workspace_id, topic_id)
