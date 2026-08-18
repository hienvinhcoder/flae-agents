import pytest
import uuid
from unittest.mock import patch, AsyncMock, MagicMock

# Mock require_roles decorator dependency TRƯỚC KHI import main/app
def mock_require_roles(roles):
    async def dummy_dep():
        return "admin"
    return dummy_dep

patcher = patch("app.core.security.require_roles", mock_require_roles)
patcher.start()

from main import app
from fastapi.testclient import TestClient
from app.core.security import get_current_user_uid, get_current_workspace_id

# Khôi phục require_roles ngay lập tức để tránh làm hỏng các test case của file khác
patcher.stop()

client = TestClient(app)

# Override các dependencies xác thực của FastAPI
def override_get_current_user_uid():
    return "mock_firebase_uid_123"

def override_get_current_workspace_id():
    return uuid.UUID("11111111-2222-3333-4444-555555555555")

app.dependency_overrides[get_current_user_uid] = override_get_current_user_uid
app.dependency_overrides[get_current_workspace_id] = override_get_current_workspace_id


@pytest.fixture
def mock_agent_service():
    with patch("app.api.v1.routes.agents.AgentService") as mock_srv:
        yield mock_srv


def test_create_agent_success(mock_agent_service):
    # Mock kết quả trả về từ service
    mock_agent = MagicMock()
    mock_agent.id = uuid.UUID("22222222-3333-4444-5555-666666666666")
    from datetime import datetime, timezone
    mock_agent.workspace_id = uuid.UUID("11111111-2222-3333-4444-555555555555")
    mock_agent.name = "Gemini QA"
    mock_agent.avatar_color = "bg-green-500"
    mock_agent.avatar_icon = "bot"
    mock_agent.system_prompt = "You are a helpful assistant."
    mock_agent.model_name = "gemini-2.5-flash"
    mock_agent.temperature = 0.2
    mock_agent.created_by = "mock_firebase_uid_123"
    mock_agent.is_active = True
    mock_agent.created_at = datetime.now(timezone.utc)
    mock_agent.updated_at = datetime.now(timezone.utc)

    mock_agent_service.create_agent = AsyncMock(return_value=mock_agent)

    response = client.post(
        "/api/v1/workspaces/11111111-2222-3333-4444-555555555555/agents",
        json={
            "name": "Gemini QA",
            "avatar_color": "bg-green-500",
            "avatar_icon": "bot",
            "system_prompt": "You are a helpful assistant.",
            "model_name": "gemini-2.5-flash",
            "temperature": 0.2
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["code"] == "200"
    assert data["data"]["name"] == "Gemini QA"
    assert data["data"]["id"] == "22222222-3333-4444-5555-666666666666"


def test_list_agents_success(mock_agent_service):
    mock_agent = MagicMock()
    mock_agent.id = uuid.UUID("22222222-3333-4444-5555-666666666666")
    from datetime import datetime, timezone
    mock_agent.workspace_id = uuid.UUID("11111111-2222-3333-4444-555555555555")
    mock_agent.name = "Gemini QA"
    mock_agent.avatar_color = "bg-green-500"
    mock_agent.avatar_icon = "bot"
    mock_agent.system_prompt = "You are a helpful assistant."
    mock_agent.model_name = "gemini-2.5-flash"
    mock_agent.temperature = 0.2
    mock_agent.created_by = "mock_firebase_uid_123"
    mock_agent.is_active = True
    mock_agent.created_at = datetime.now(timezone.utc)
    mock_agent.updated_at = datetime.now(timezone.utc)

    mock_agent_service.list_agents = AsyncMock(return_value=[mock_agent])

    response = client.get("/api/v1/workspaces/11111111-2222-3333-4444-555555555555/agents")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) == 1
    assert data["data"][0]["name"] == "Gemini QA"


def test_get_default_agent_success(mock_agent_service):
    mock_agent = MagicMock()
    mock_agent.id = uuid.UUID("22222222-3333-4444-5555-666666666666")
    from datetime import datetime, timezone
    mock_agent.workspace_id = uuid.UUID("11111111-2222-3333-4444-555555555555")
    mock_agent.name = "QA Assistant"
    mock_agent.avatar_color = "bg-primary-soft text-primary"
    mock_agent.avatar_icon = "sparkles"
    mock_agent.system_prompt = "..."
    mock_agent.model_name = "gemini-2.5-flash"
    mock_agent.temperature = 0.2
    mock_agent.created_by = "mock_firebase_uid_123"
    mock_agent.is_default = True
    mock_agent.is_active = True
    mock_agent.created_at = datetime.now(timezone.utc)
    mock_agent.updated_at = datetime.now(timezone.utc)

    mock_agent_service.get_or_create_default_agent = AsyncMock(return_value=mock_agent)

    response = client.get("/api/v1/workspaces/11111111-2222-3333-4444-555555555555/agents/default")
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == "200"
    assert data["data"]["name"] == "QA Assistant"
    assert data["data"]["is_default"] is True
