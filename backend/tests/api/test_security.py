import pytest
import uuid
import json
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException, status
from app.core.security import get_current_workspace_id, require_roles
from app.models.workspace import WorkspaceMemberStatus, WorkspaceRole

@pytest.mark.asyncio
async def test_get_current_workspace_id_from_path_cache_hit():
    workspace_uuid = uuid.uuid4()
    cache_data = {
        "workspaces": [
            {
                "workspace_id": str(workspace_uuid),
                "role": "admin",
                "status": "active"
            }
        ]
    }
    
    with patch("app.core.security.redis_client.get", AsyncMock(return_value=json.dumps(cache_data))):
        db = AsyncMock()
        res = await get_current_workspace_id(
            workspace_id=workspace_uuid,
            x_workspace_id=None,
            user_uid="test_user",
            db=db
        )
        assert res == workspace_uuid
        db.execute.assert_not_called()

@pytest.mark.asyncio
async def test_get_current_workspace_id_from_header_cache_hit():
    workspace_uuid = uuid.uuid4()
    cache_data = {
        "workspaces": [
            {
                "workspace_id": str(workspace_uuid),
                "role": "member",
                "status": "active"
            }
        ]
    }
    
    with patch("app.core.security.redis_client.get", AsyncMock(return_value=json.dumps(cache_data))):
        db = AsyncMock()
        res = await get_current_workspace_id(
            workspace_id=None,
            x_workspace_id=str(workspace_uuid),
            user_uid="test_user",
            db=db
        )
        assert res == workspace_uuid
        db.execute.assert_not_called()

@pytest.mark.asyncio
async def test_get_current_workspace_id_prioritize_path_over_header():
    path_workspace_uuid = uuid.uuid4()
    header_workspace_uuid = uuid.uuid4()
    
    # User chỉ active ở path_workspace_uuid
    cache_data = {
        "workspaces": [
            {
                "workspace_id": str(path_workspace_uuid),
                "role": "admin",
                "status": "active"
            },
            {
                "workspace_id": str(header_workspace_uuid),
                "role": "member",
                "status": "active"
            }
        ]
    }
    
    with patch("app.core.security.redis_client.get", AsyncMock(return_value=json.dumps(cache_data))):
        db = AsyncMock()
        res = await get_current_workspace_id(
            workspace_id=path_workspace_uuid,
            x_workspace_id=str(header_workspace_uuid),
            user_uid="test_user",
            db=db
        )
        # Phải trả về path parameter workspace_uuid
        assert res == path_workspace_uuid

@pytest.mark.asyncio
async def test_get_current_workspace_id_missing_both():
    db = AsyncMock()
    with pytest.raises(HTTPException) as exc_info:
        await get_current_workspace_id(
            workspace_id=None,
            x_workspace_id=None,
            user_uid="test_user",
            db=db
        )
    assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
    assert "Workspace ID is missing" in exc_info.value.detail

@pytest.mark.asyncio
async def test_get_current_workspace_id_invalid_header_uuid():
    db = AsyncMock()
    with pytest.raises(HTTPException) as exc_info:
        await get_current_workspace_id(
            workspace_id=None,
            x_workspace_id="invalid-uuid-string",
            user_uid="test_user",
            db=db
        )
    assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
    assert "Invalid workspace ID format in header" in exc_info.value.detail

@pytest.mark.asyncio
async def test_get_current_workspace_id_db_fallback_success():
    workspace_uuid = uuid.uuid4()
    db = AsyncMock()
    
    # Mock DB response
    mock_member = MagicMock()
    mock_member.workspace_id = workspace_uuid
    mock_member.role = WorkspaceRole.admin
    mock_member.status = WorkspaceMemberStatus.active
    
    db_result = MagicMock()
    db_result.scalars.return_value.all.return_value = [mock_member]
    db.execute = AsyncMock(return_value=db_result)
    
    with patch("app.core.security.redis_client.get", AsyncMock(return_value=None)), \
         patch("app.core.security.redis_client.setex", AsyncMock()) as mock_setex:
         
        res = await get_current_workspace_id(
            workspace_id=workspace_uuid,
            x_workspace_id=None,
            user_uid="test_user",
            db=db
        )
        assert res == workspace_uuid
        db.execute.assert_called_once()
        mock_setex.assert_called_once()

@pytest.mark.asyncio
async def test_get_current_workspace_id_no_access():
    workspace_uuid = uuid.uuid4()
    db = AsyncMock()
    
    # Mock DB response - Trả về danh sách rỗng (User không thuộc workspace nào)
    db_result = MagicMock()
    db_result.scalars.return_value.all.return_value = []
    db.execute = AsyncMock(return_value=db_result)
    
    with patch("app.core.security.redis_client.get", AsyncMock(return_value=None)), \
         patch("app.core.security.redis_client.setex", AsyncMock()):
         
        with pytest.raises(HTTPException) as exc_info:
            await get_current_workspace_id(
                workspace_id=workspace_uuid,
                x_workspace_id=None,
                user_uid="test_user",
                db=db
            )
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert "You do not have access to this workspace" in exc_info.value.detail

@pytest.mark.asyncio
async def test_get_current_workspace_id_inactive_status():
    workspace_uuid = uuid.uuid4()
    db = AsyncMock()
    
    # Mock DB response - User thuộc workspace nhưng status là pending/inactive
    mock_member = MagicMock()
    mock_member.workspace_id = workspace_uuid
    mock_member.role = WorkspaceRole.member
    mock_member.status = WorkspaceMemberStatus.suspended
    
    db_result = MagicMock()
    db_result.scalars.return_value.all.return_value = [mock_member]
    db.execute = AsyncMock(return_value=db_result)
    
    with patch("app.core.security.redis_client.get", AsyncMock(return_value=None)), \
         patch("app.core.security.redis_client.setex", AsyncMock()):
         
        with pytest.raises(HTTPException) as exc_info:
            await get_current_workspace_id(
                workspace_id=workspace_uuid,
                x_workspace_id=None,
                user_uid="test_user",
                db=db
            )
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert "You do not have access to this workspace" in exc_info.value.detail

@pytest.mark.asyncio
async def test_require_roles_cache_hit_allowed():
    workspace_uuid = uuid.uuid4()
    allowed_roles = [WorkspaceRole.admin, WorkspaceRole.owner]
    dependency = require_roles(allowed_roles)
    
    cache_data = {
        "workspaces": [
            {
                "workspace_id": str(workspace_uuid),
                "role": "admin",
                "status": "active"
            }
        ]
    }
    
    with patch("app.core.security.redis_client.get", AsyncMock(return_value=json.dumps(cache_data))):
        db = AsyncMock()
        res = await dependency(user_uid="test_user", workspace_id=workspace_uuid, db=db)
        assert res == "admin"
        db.execute.assert_not_called()

@pytest.mark.asyncio
async def test_require_roles_cache_hit_denied():
    workspace_uuid = uuid.uuid4()
    allowed_roles = [WorkspaceRole.admin, WorkspaceRole.owner]
    dependency = require_roles(allowed_roles)
    
    cache_data = {
        "workspaces": [
            {
                "workspace_id": str(workspace_uuid),
                "role": "member",
                "status": "active"
            }
        ]
    }
    
    with patch("app.core.security.redis_client.get", AsyncMock(return_value=json.dumps(cache_data))):
        db = AsyncMock()
        with pytest.raises(HTTPException) as exc_info:
            await dependency(user_uid="test_user", workspace_id=workspace_uuid, db=db)
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert "You do not have permission to perform this action" in exc_info.value.detail
        db.execute.assert_not_called()

@pytest.mark.asyncio
async def test_require_roles_redis_unavailable_db_allowed():
    workspace_uuid = uuid.uuid4()
    allowed_roles = [WorkspaceRole.admin, WorkspaceRole.owner]
    dependency = require_roles(allowed_roles)
    
    db = AsyncMock()
    mock_member = MagicMock()
    mock_member.workspace_id = workspace_uuid
    mock_member.role = WorkspaceRole.admin
    mock_member.status = WorkspaceMemberStatus.active
    
    db_result = MagicMock()
    db_result.scalar_one_or_none.return_value = mock_member
    db.execute = AsyncMock(return_value=db_result)
    
    with patch("app.core.security.redis_client.get", AsyncMock(side_effect=Exception("Redis connection error"))):
        res = await dependency(user_uid="test_user", workspace_id=workspace_uuid, db=db)
        assert res == WorkspaceRole.admin
        db.execute.assert_called_once()

@pytest.mark.asyncio
async def test_require_roles_redis_unavailable_db_denied():
    workspace_uuid = uuid.uuid4()
    allowed_roles = [WorkspaceRole.admin, WorkspaceRole.owner]
    dependency = require_roles(allowed_roles)
    
    db = AsyncMock()
    mock_member = MagicMock()
    mock_member.workspace_id = workspace_uuid
    mock_member.role = WorkspaceRole.member
    mock_member.status = WorkspaceMemberStatus.active
    
    db_result = MagicMock()
    db_result.scalar_one_or_none.return_value = mock_member
    db.execute = AsyncMock(return_value=db_result)
    
    with patch("app.core.security.redis_client.get", AsyncMock(side_effect=Exception("Redis offline"))):
        with pytest.raises(HTTPException) as exc_info:
            await dependency(user_uid="test_user", workspace_id=workspace_uuid, db=db)
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert "You do not have permission to perform this action" in exc_info.value.detail
        db.execute.assert_called_once()

@pytest.mark.asyncio
async def test_require_roles_cache_miss_db_allowed():
    workspace_uuid = uuid.uuid4()
    allowed_roles = [WorkspaceRole.admin, WorkspaceRole.owner]
    dependency = require_roles(allowed_roles)
    
    db = AsyncMock()
    mock_member = MagicMock()
    mock_member.workspace_id = workspace_uuid
    mock_member.role = WorkspaceRole.owner
    mock_member.status = WorkspaceMemberStatus.active
    
    db_result = MagicMock()
    db_result.scalar_one_or_none.return_value = mock_member
    db.execute = AsyncMock(return_value=db_result)
    
    with patch("app.core.security.redis_client.get", AsyncMock(return_value=None)):
        res = await dependency(user_uid="test_user", workspace_id=workspace_uuid, db=db)
        assert res == WorkspaceRole.owner
        db.execute.assert_called_once()

@pytest.mark.asyncio
async def test_require_roles_cache_miss_db_not_member():
    workspace_uuid = uuid.uuid4()
    allowed_roles = [WorkspaceRole.admin, WorkspaceRole.owner]
    dependency = require_roles(allowed_roles)
    
    db = AsyncMock()
    db_result = MagicMock()
    db_result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=db_result)
    
    with patch("app.core.security.redis_client.get", AsyncMock(return_value=None)):
        with pytest.raises(HTTPException) as exc_info:
            await dependency(user_uid="test_user", workspace_id=workspace_uuid, db=db)
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert "Permission denied" in exc_info.value.detail
        db.execute.assert_called_once()
