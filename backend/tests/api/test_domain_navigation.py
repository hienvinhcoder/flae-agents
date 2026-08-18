"""Tests for domain navigation API endpoints."""

import pytest
import uuid
from unittest.mock import patch, AsyncMock, MagicMock


def mock_require_roles(roles):
    async def dummy_dep(*args, **kwargs):
        return "admin"
    return dummy_dep


@pytest.fixture(scope="module", autouse=True)
def setup_mocks():
    patcher = patch("app.core.security.require_roles", mock_require_roles)
    patcher.start()
    yield
    patcher.stop()


from main import app
from fastapi.testclient import TestClient
from app.core.security import get_current_user_uid, get_current_workspace_id, verify_token

client = TestClient(app)

WS_ID = uuid.UUID("11111111-2222-3333-4444-555555555555")


def override_get_current_user_uid():
    return "test-uid"


def override_get_current_workspace_id():
    return WS_ID


@pytest.fixture(scope="module", autouse=True)
def setup_dependency_overrides():
    old_verify_token = app.dependency_overrides.get(verify_token)
    old_get_current_user_uid = app.dependency_overrides.get(get_current_user_uid)
    old_get_current_workspace_id = app.dependency_overrides.get(get_current_workspace_id)

    app.dependency_overrides[verify_token] = lambda: {"uid": "test-uid"}
    app.dependency_overrides[get_current_user_uid] = override_get_current_user_uid
    app.dependency_overrides[get_current_workspace_id] = override_get_current_workspace_id

    yield

    if old_verify_token is not None:
        app.dependency_overrides[verify_token] = old_verify_token
    else:
        app.dependency_overrides.pop(verify_token, None)

    if old_get_current_user_uid is not None:
        app.dependency_overrides[get_current_user_uid] = old_get_current_user_uid
    else:
        app.dependency_overrides.pop(get_current_user_uid, None)

    if old_get_current_workspace_id is not None:
        app.dependency_overrides[get_current_workspace_id] = old_get_current_workspace_id
    else:
        app.dependency_overrides.pop(get_current_workspace_id, None)


@patch(
    "app.api.v1.routes.knowledge.DomainService.list_domains",
    new_callable=AsyncMock,
)
def test_list_domains(mock_list):
    mock_list.return_value = {
        "items": [
            {
                "domain_id": "dom-abc",
                "name": "Tech",
                "slug": "tech",
                "description": None,
                "topic_count": 2,
                "confidence": 0.9,
            }
        ],
        "next_cursor": None,
    }
    resp = client.get("/api/v1/knowledge-base/domains")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["data"]["items"]) == 1
    assert data["data"]["items"][0]["domain_id"] == "dom-abc"


@patch(
    "app.api.v1.routes.knowledge.DomainService.get_domain",
    new_callable=AsyncMock,
)
def test_get_domain(mock_get):
    mock_get.return_value = {
        "domain_id": "dom-abc",
        "name": "Tech",
        "slug": "tech",
        "description": "Tech industry",
        "confidence": 0.9,
        "topics": [
            {
                "topic_id": "topic-1",
                "name": "AI",
                "domain_id": "dom-abc",
                "chunk_count": 3,
                "confidence": 0.85,
                "summary": "AI topic",
            }
        ],
    }
    resp = client.get("/api/v1/knowledge-base/domains/dom-abc")
    assert resp.status_code == 200
    assert resp.json()["data"]["domain_id"] == "dom-abc"
    assert len(resp.json()["data"]["topics"]) == 1
