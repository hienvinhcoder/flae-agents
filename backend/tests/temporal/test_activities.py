import pytest
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch, MagicMock
from app.temporal.activities.invitation import send_invitation_email
from app.models.workspace import WorkspaceRole

@pytest.mark.asyncio
async def test_send_invitation_email_success():
    invitation_id = str(uuid.uuid4())
    
    # Tạo các mock object cho DB model
    mock_invitation = MagicMock()
    mock_invitation.workspace_id = uuid.uuid4()
    mock_invitation.invited_by = "mock_inviter_uid"
    mock_invitation.role = WorkspaceRole.member
    mock_invitation.token = "secure_token_123"
    mock_invitation.expires_at = datetime.now(timezone.utc)
    mock_invitation.email = "invited_user@example.com"
    
    mock_workspace = MagicMock()
    mock_workspace.name = "Test Workspace Name"
    
    mock_invited_by_user = MagicMock()
    mock_invited_by_user.full_name = "Inviter Fullname"
    mock_invited_by_user.email = "inviter@example.com"
    
    mock_db = AsyncMock()
    
    mock_inv_result = MagicMock()
    mock_inv_result.scalar_one_or_none.return_value = mock_invitation
    
    mock_ws_result = MagicMock()
    mock_ws_result.scalar_one_or_none.return_value = mock_workspace
    
    mock_user_result = MagicMock()
    mock_user_result.scalar_one_or_none.return_value = mock_invited_by_user
    
    mock_db.execute.side_effect = [mock_inv_result, mock_ws_result, mock_user_result]
    
    # Mock AsyncSessionLocal context manager
    mock_session_cm = AsyncMock()
    mock_session_cm.__aenter__.return_value = mock_db
    mock_session_cm.__aexit__.return_value = False
    
    with patch("app.temporal.activities.invitation.AsyncSessionLocal", return_value=mock_session_cm):
        with patch("app.temporal.activities.invitation.logger") as mock_logger:
            result = await send_invitation_email(invitation_id)
            
            assert result is True
            # Kiểm tra xem logger.info có được gọi để ghi nhận log an toàn không
            mock_logger.info.assert_any_call(f"Starting send_invitation_email activity for invitation_id={invitation_id}")
            mock_logger.info.assert_any_call(f"Email invitation sent successfully (invitation_id={invitation_id})")
            
            # Kiểm tra xem không có log nào chứa email hoặc token được ghi ra
            for call in mock_logger.info.call_args_list:
                log_msg = call[0][0]
                assert "secure_token_123" not in log_msg
                assert "invited_user@example.com" not in log_msg
                assert "inviter@example.com" not in log_msg

@pytest.mark.asyncio
async def test_send_invitation_email_invalid_id():
    result = await send_invitation_email("invalid-uuid-format")
    assert result is False

@pytest.mark.asyncio
async def test_send_invitation_email_not_found():
    invitation_id = str(uuid.uuid4())
    
    mock_inv_result = MagicMock()
    mock_inv_result.scalar_one_or_none.return_value = None
    
    mock_db = AsyncMock()
    mock_db.execute.return_value = mock_inv_result
    
    mock_session_cm = AsyncMock()
    mock_session_cm.__aenter__.return_value = mock_db
    mock_session_cm.__aexit__.return_value = False
    
    with patch("app.temporal.activities.invitation.AsyncSessionLocal", return_value=mock_session_cm):
        result = await send_invitation_email(invitation_id)
        assert result is False
