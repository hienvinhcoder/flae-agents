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
from app.core.security import get_current_user, get_current_workspace_id

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
def mock_workspace_service():
    with patch("app.api.v1.routes.workspaces.WorkspaceService.create_manual_workspace", new_callable=AsyncMock) as mock_create:
        mock_workspace = MagicMock()
        mock_workspace.id = uuid.UUID("11111111-2222-3333-4444-555555555555")
        mock_workspace.name = "My Shop"
        mock_workspace.owner_uid = "mock_firebase_uid_123"
        mock_workspace.created_at = None
        mock_create.return_value = mock_workspace
        yield mock_create

@pytest.fixture
def mock_workspace_service_all():
    with patch("app.api.v1.routes.workspaces.WorkspaceService") as mock_srv:
        yield mock_srv

@pytest.fixture
def mock_workspace_member_service_all():
    with patch("app.api.v1.routes.workspaces.WorkspaceMemberService") as mock_srv:
        yield mock_srv

def test_create_manual_workspace_success(mock_workspace_service):
    response = client.post(
        "/api/v1/workspaces/manual",
        json={"name": "My Shop"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == "200"
    assert data["message"] == "Success"
    assert data["data"]["name"] == "My Shop"
    assert data["data"]["id"] == "11111111-2222-3333-4444-555555555555"

def test_get_user_workspaces(mock_workspace_service_all):
    mock_ws = MagicMock()
    mock_ws.id = uuid.UUID("11111111-2222-3333-4444-555555555555")
    mock_ws.name = "Test Work"
    mock_ws.owner_uid = "mock_owner"
    mock_ws.created_at = None
    mock_workspace_service_all.get_user_workspaces = AsyncMock(return_value=[mock_ws])
    
    response = client.get("/api/v1/workspaces")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) == 1
    assert data["data"][0]["name"] == "Test Work"
    assert data["data"][0]["id"] == "11111111-2222-3333-4444-555555555555"

def test_invite_member(mock_workspace_service_all):
    mock_inv = MagicMock()
    mock_inv.id = "inv_id"
    mock_inv.workspace_id = "11111111-2222-3333-4444-555555555555"
    mock_inv.email = "new@example.com"
    mock_inv.role = "member"
    mock_inv.token = "token_abc"
    mock_inv.invited_by = "mock_firebase_uid_123"
    from datetime import datetime, timezone
    mock_inv.status = "pending"
    mock_inv.expires_at = datetime.now(timezone.utc)
    mock_inv.created_at = datetime.now(timezone.utc)
    mock_workspace_service_all.invite_member = AsyncMock(return_value=mock_inv)
    
    response = client.post(
        "/api/v1/workspaces/11111111-2222-3333-4444-555555555555/invitations",
        json={"email": "new@example.com", "role": "member"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["email"] == "new@example.com"
    assert data["data"]["role"] == "member"

def test_update_member_role(mock_workspace_service_all, mock_workspace_member_service_all):
    mock_mem = MagicMock()
    mock_mem.workspace_id = "11111111-2222-3333-4444-555555555555"
    mock_mem.user_uid = "target_uid"
    mock_mem.role = "admin"
    mock_mem.status = "active"
    mock_workspace_member_service_all.update_member_role = AsyncMock(return_value=mock_mem)
    mock_workspace_member_service_all.get_workspace_members_with_profiles = AsyncMock(return_value=[
        {"user_uid": "target_uid", "email": "target@example.com", "full_name": "Target Name", "avatar_url": None}
    ])
    
    response = client.put(
        "/api/v1/workspaces/11111111-2222-3333-4444-555555555555/members/target_uid",
        json={"role": "admin", "status": "active"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["role"] == "admin"
    assert data["data"]["email"] == "target@example.com"


def test_update_workspace(mock_workspace_service_all):
    mock_ws = MagicMock()
    mock_ws.id = uuid.UUID("11111111-2222-3333-4444-555555555555")
    mock_ws.name = "Updated Name"
    mock_ws.owner_uid = "mock_owner"
    mock_ws.created_at = None
    mock_workspace_service_all.update_workspace = AsyncMock(return_value=mock_ws)
    
    response = client.put(
        "/api/v1/workspaces/11111111-2222-3333-4444-555555555555",
        json={"name": "Updated Name"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["name"] == "Updated Name"


def test_get_pending_invitations(mock_workspace_service_all):
    mock_inv = MagicMock()
    mock_inv.id = "inv_id"
    mock_inv.workspace_id = "11111111-2222-3333-4444-555555555555"
    mock_inv.email = "pending@example.com"
    mock_inv.role = "member"
    mock_inv.token = "token_abc"
    mock_inv.invited_by = "mock_owner"
    mock_inv.status = "pending"
    from datetime import datetime, timezone
    mock_inv.expires_at = datetime.now(timezone.utc)
    mock_inv.created_at = datetime.now(timezone.utc)
    mock_workspace_service_all.get_pending_invitations = AsyncMock(return_value=[mock_inv])
    
    response = client.get(
        "/api/v1/workspaces/11111111-2222-3333-4444-555555555555/invitations"
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) == 1
    assert data["data"][0]["email"] == "pending@example.com"


@pytest.mark.asyncio
async def test_invite_member_rejects_owner_role():
    from app.services.workspace_srv import WorkspaceService
    from app.schemas.workspaces import WorkspaceInvitationRequest
    from app.models.workspace import WorkspaceRole
    from app.core.exceptions import ApplicationError
    from sqlalchemy.ext.asyncio import AsyncSession

    mock_db = AsyncMock(spec=AsyncSession)
    workspace_id = uuid.uuid4()
    request = WorkspaceInvitationRequest(email="test@example.com", role=WorkspaceRole.owner)


    with pytest.raises(ApplicationError) as exc_info:
        await WorkspaceService.invite_member(
            db=mock_db,
            workspace_id=workspace_id,
            request=request,
            invited_by_uid="mock_admin_uid"
        )

    assert exc_info.value.status_code == 400
    assert "Cannot invite a member with the owner role" in exc_info.value.message
