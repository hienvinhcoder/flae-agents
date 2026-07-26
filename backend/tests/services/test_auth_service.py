import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.auth_service import AuthService
from app.schemas.auth import UserSyncRequest
from app.models.user import User


@pytest.mark.asyncio
async def test_sync_firebase_user_new_user_success():
    """Test đồng bộ user mới thành công, tạo default workspace."""
    db = AsyncMock(spec=AsyncSession)

    # 1. Giả lập db.execute raise NoResultFound khi truy vấn user chưa tồn tại
    mock_execute_result = MagicMock()
    mock_execute_result.scalar_one.side_effect = NoResultFound()
    db.execute = AsyncMock(return_value=mock_execute_result)

    # Mock WorkspaceService.create_default_workspace
    with patch("app.services.workspace_srv.WorkspaceService.create_default_workspace", new_callable=AsyncMock) as mock_create_ws:
        sync_data = UserSyncRequest(
            email="new_user@example.com",
            full_name="New User",
            avatar_url="https://example.com/avatar.png",
            login_provider="google"
        )

        # Chạy thử nghiệm
        user = await AuthService.sync_firebase_user(
            db=db,
            firebase_uid="new_firebase_uid_123",
            sync_data=sync_data
        )

        # 2. Kiểm tra kết quả
        assert user is not None
        assert user.firebase_uid == "new_firebase_uid_123"
        assert user.email == "new_user@example.com"
        assert user.full_name == "New User"
        assert user.avatar_url == "https://example.com/avatar.png"
        assert user.login_providers == ["google"]
        assert user.is_active is True

        # Kiểm tra db interactions
        db.add.assert_called_once()
        assert db.commit.call_count >= 1
        assert db.refresh.call_count >= 1

        # Đảm bảo tạo default workspace được gọi cho user mới
        mock_create_ws.assert_called_once_with(db, "new_firebase_uid_123")


@pytest.mark.asyncio
async def test_sync_firebase_user_existing_user_no_update():
    """Test đồng bộ user đã tồn tại và không có thay đổi gì (không lưu lại db)."""
    db = AsyncMock(spec=AsyncSession)

    # Giả lập user đã tồn tại
    existing_user = User(
        firebase_uid="existing_uid_123",
        email="existing@example.com",
        full_name="Existing User",
        avatar_url="https://example.com/existing.png",
        login_providers=["google"],
        is_active=True,
    )
    existing_user.current_workspace_id = "some-workspace-uuid"

    mock_execute_result = MagicMock()
    mock_execute_result.scalar_one.return_value = existing_user
    db.execute = AsyncMock(return_value=mock_execute_result)

    with patch("app.services.workspace_srv.WorkspaceService.create_default_workspace", new_callable=AsyncMock) as mock_create_ws:
        sync_data = UserSyncRequest(
            email="existing@example.com",
            full_name="Existing User",
            avatar_url="https://example.com/existing.png",
            login_provider="google"
        )

        user = await AuthService.sync_firebase_user(
            db=db,
            firebase_uid="existing_uid_123",
            sync_data=sync_data
        )

        assert user == existing_user
        # Do không có thay đổi gì, db.commit/refresh không được gọi cho quá trình update
        db.commit.assert_not_called()
        db.refresh.assert_not_called()
        mock_create_ws.assert_not_called()


@pytest.mark.asyncio
async def test_sync_firebase_user_existing_user_needs_update():
    """Test đồng bộ user đã tồn tại nhưng cần cập nhật thông tin (tên, avatar, provider mới)."""
    db = AsyncMock(spec=AsyncSession)

    existing_user = User(
        firebase_uid="existing_uid_123",
        email="existing@example.com",
        full_name="Old Name",
        avatar_url="https://example.com/old.png",
        login_providers=["google"],
        is_active=True,
    )
    existing_user.current_workspace_id = "some-workspace-uuid"

    mock_execute_result = MagicMock()
    mock_execute_result.scalar_one.return_value = existing_user
    db.execute = AsyncMock(return_value=mock_execute_result)

    with patch("app.services.workspace_srv.WorkspaceService.create_default_workspace", new_callable=AsyncMock) as mock_create_ws:
        sync_data = UserSyncRequest(
            email="existing@example.com",
            full_name="Updated Name",
            avatar_url="https://example.com/new-avatar.png",
            login_provider="facebook"
        )

        user = await AuthService.sync_firebase_user(
            db=db,
            firebase_uid="existing_uid_123",
            sync_data=sync_data
        )

        assert user.full_name == "Updated Name"
        assert user.avatar_url == "https://example.com/new-avatar.png"
        assert "facebook" in user.login_providers
        assert "google" in user.login_providers

        # Đảm bảo đã commit thay đổi
        db.commit.assert_called_once()
        db.refresh.assert_called_once_with(existing_user)
        mock_create_ws.assert_not_called()


@pytest.mark.asyncio
async def test_sync_firebase_user_existing_user_no_workspace():
    """Test đồng bộ user đã tồn tại nhưng chưa có workspace (phải tạo workspace mặc định)."""
    db = AsyncMock(spec=AsyncSession)

    existing_user = User(
        firebase_uid="existing_uid_123",
        email="existing@example.com",
        full_name="Existing User",
        avatar_url="https://example.com/existing.png",
        login_providers=["google"],
        is_active=True,
    )
    existing_user.current_workspace_id = None # Chưa có workspace

    mock_execute_result = MagicMock()
    mock_execute_result.scalar_one.return_value = existing_user
    db.execute = AsyncMock(return_value=mock_execute_result)

    with patch("app.services.workspace_srv.WorkspaceService.create_default_workspace", new_callable=AsyncMock) as mock_create_ws:
        sync_data = UserSyncRequest(
            email="existing@example.com",
            full_name="Existing User",
            avatar_url="https://example.com/existing.png",
            login_provider="google"
        )

        user = await AuthService.sync_firebase_user(
            db=db,
            firebase_uid="existing_uid_123",
            sync_data=sync_data
        )

        assert user == existing_user
        # Tự động tạo mặc định
        mock_create_ws.assert_called_once_with(db, "existing_uid_123")


@pytest.mark.asyncio
async def test_sync_firebase_user_create_workspace_exception_logged():
    """Test trường hợp việc tạo default workspace bị lỗi nhưng không làm crash luồng sync chính."""
    db = AsyncMock(spec=AsyncSession)

    # Giả lập user mới
    mock_execute_result = MagicMock()
    mock_execute_result.scalar_one.side_effect = NoResultFound()
    db.execute = AsyncMock(return_value=mock_execute_result)

    # Giả lập workspace creation throw exception
    with patch("app.services.workspace_srv.WorkspaceService.create_default_workspace", new_callable=AsyncMock) as mock_create_ws:
        mock_create_ws.side_effect = Exception("Database error creating workspace")

        sync_data = UserSyncRequest(
            email="new_user@example.com",
            full_name="New User",
            avatar_url="https://example.com/avatar.png",
            login_provider="google"
        )

        # Vẫn chạy thành công và trả về User
        user = await AuthService.sync_firebase_user(
            db=db,
            firebase_uid="new_firebase_uid_123",
            sync_data=sync_data
        )

        assert user is not None
        assert user.firebase_uid == "new_firebase_uid_123"
        # Đảm bảo đã được thêm vào db
        db.add.assert_called_once()
        # Vẫn gọi create_default_workspace
        mock_create_ws.assert_called_once_with(db, "new_firebase_uid_123")
