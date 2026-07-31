from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ApplicationError
from app.models.workspace import WorkspaceMemberStatus, WorkspaceRole
from app.schemas.sche_workspace import (
    WorkspaceInvitationRequest,
    WorkspaceManualCreateRequest,
)
from app.services.workspace_member_srv import WorkspaceMemberService
from app.services.workspace_srv import WorkspaceService, _encrypt_token


def scalar_result(value: object) -> MagicMock:
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    result.scalar_one.return_value = value
    return result


def db_with_results(*values: object) -> AsyncMock:
    db = AsyncMock(spec=AsyncSession)
    db.execute.side_effect = [scalar_result(value) for value in values]
    return db


def member(uid: str, role: WorkspaceRole) -> SimpleNamespace:
    return SimpleNamespace(
        role=role,
        status=WorkspaceMemberStatus.active,
        user_uid=uid,
        workspace_id=uuid4(),
    )


@pytest.mark.asyncio
async def test_update_current_workspace_validates_membership_and_updates_user() -> None:
    with pytest.raises(ApplicationError) as invalid:
        await WorkspaceService.update_current_workspace(
            AsyncMock(spec=AsyncSession), "user-1", "not-a-uuid"
        )
    assert invalid.value.status_code == 400

    workspace_id = uuid4()
    denied_db = db_with_results(None)
    with pytest.raises(ApplicationError) as denied:
        await WorkspaceService.update_current_workspace(
            denied_db, "user-1", str(workspace_id)
        )
    assert denied.value.status_code == 403

    user = SimpleNamespace(current_workspace_id=None)
    db = db_with_results(member("user-1", WorkspaceRole.member), user)
    returned = await WorkspaceService.update_current_workspace(
        db, "user-1", str(workspace_id)
    )
    assert returned is user
    assert user.current_workspace_id == str(workspace_id)
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(user)


@pytest.mark.asyncio
async def test_create_manual_workspace_persists_owner_and_invalidates_cache() -> None:
    db = AsyncMock(spec=AsyncSession)
    workspace = SimpleNamespace(id=uuid4(), name="Platform", owner_uid="user-1")
    with (
        patch("app.services.workspace_srv.Workspace", return_value=workspace),
        patch("app.services.workspace_srv.WorkspaceMember"),
        patch.object(
            WorkspaceService, "update_current_workspace", new=AsyncMock()
        ) as update_current,
        patch("app.services.workspace_srv.redis_client.delete", new=AsyncMock()) as delete,
    ):
        result = await WorkspaceService.create_manual_workspace(
            db, WorkspaceManualCreateRequest(name="Platform"), "user-1"
        )

    assert result is workspace
    assert db.add.call_count == 2
    update_current.assert_awaited_once_with(db, "user-1", str(workspace.id))
    delete.assert_awaited_once_with("user:membership:user-1")


@pytest.mark.asyncio
async def test_default_workspace_handles_missing_and_existing_users() -> None:
    with pytest.raises(ApplicationError) as missing:
        await WorkspaceService.create_default_workspace(
            db_with_results(None), "missing-user"
        )
    assert missing.value.status_code == 404

    user = SimpleNamespace(full_name="Linh", current_workspace_id=None)
    workspace = SimpleNamespace(id=uuid4(), name="Linh's Workspace")
    db = db_with_results(user)
    with (
        patch("app.services.workspace_srv.Workspace", return_value=workspace),
        patch("app.services.workspace_srv.WorkspaceMember"),
        patch(
            "app.services.workspace_srv.redis_client.delete",
            new=AsyncMock(side_effect=RuntimeError("redis unavailable")),
        ),
    ):
        result = await WorkspaceService.create_default_workspace(db, "user-1")
    assert result is workspace
    assert user.current_workspace_id == str(workspace.id)
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_user_workspaces_returns_existing_or_creates_default() -> None:
    existing = SimpleNamespace(id=uuid4())
    result = MagicMock()
    result.scalars.return_value.all.return_value = [existing]
    db = AsyncMock(spec=AsyncSession)
    db.execute.return_value = result
    assert await WorkspaceService.get_user_workspaces(db, "user-1") == [existing]

    result.scalars.return_value.all.return_value = []
    created = SimpleNamespace(id=uuid4())
    with patch.object(
        WorkspaceService, "create_default_workspace", new=AsyncMock(return_value=created)
    ) as create:
        assert await WorkspaceService.get_user_workspaces(db, "user-1") == [created]
    create.assert_awaited_once_with(db, "user-1")


@pytest.mark.asyncio
async def test_invite_member_rejects_invalid_roles_and_existing_members() -> None:
    owner_request = WorkspaceInvitationRequest(
        email="owner@example.com", role=WorkspaceRole.owner
    )
    with pytest.raises(ApplicationError) as owner:
        await WorkspaceService.invite_member(
            AsyncMock(spec=AsyncSession), uuid4(), owner_request, "admin-1"
        )
    assert owner.value.status_code == 400

    request = WorkspaceInvitationRequest(
        email="member@example.com", role=WorkspaceRole.member
    )
    user = SimpleNamespace(firebase_uid="member-1")
    with pytest.raises(ApplicationError) as duplicate:
        await WorkspaceService.invite_member(
            db_with_results(user, member("member-1", WorkspaceRole.member)),
            uuid4(),
            request,
            "admin-1",
        )
    assert duplicate.value.status_code == 400


@pytest.mark.asyncio
async def test_invite_member_persists_and_tolerates_temporal_failure() -> None:
    invitation = SimpleNamespace(id=uuid4())
    db = db_with_results(None)
    with (
        patch("app.services.workspace_srv.WorkspaceInvitation", return_value=invitation),
        patch(
            "app.core.temporal.get_temporal_client",
            new=AsyncMock(side_effect=RuntimeError("temporal unavailable")),
        ),
    ):
        result = await WorkspaceService.invite_member(
            db,
            uuid4(),
            WorkspaceInvitationRequest(
                email="new@example.com", role=WorkspaceRole.member
            ),
            "admin-1",
        )
    assert result is invitation
    db.add.assert_called_once_with(invitation)
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_accept_invitation_validates_token_expiry_and_email() -> None:
    with pytest.raises(ApplicationError) as missing:
        await WorkspaceService.accept_invitation(db_with_results(None), "bad", "u1")
    assert missing.value.status_code == 404

    expired = SimpleNamespace(
        expires_at=datetime.now(timezone.utc) - timedelta(days=1),
        status="pending",
    )
    expired_db = db_with_results(expired)
    with pytest.raises(ApplicationError) as expiry:
        await WorkspaceService.accept_invitation(expired_db, "old", "u1")
    assert expiry.value.status_code == 400
    expired_db.commit.assert_awaited_once()

    invitation = SimpleNamespace(
        email="invited@example.com",
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
    )
    wrong_user = SimpleNamespace(email="other@example.com")
    with pytest.raises(ApplicationError) as wrong_email:
        await WorkspaceService.accept_invitation(
            db_with_results(invitation, wrong_user), "valid", "u1"
        )
    assert wrong_email.value.status_code == 403


@pytest.mark.asyncio
async def test_accept_invitation_activates_existing_member() -> None:
    workspace_id = uuid4()
    invitation = SimpleNamespace(
        email="user@example.com",
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        role=WorkspaceRole.admin,
        status="pending",
        workspace_id=workspace_id,
    )
    user = SimpleNamespace(email="USER@example.com", current_workspace_id=None)
    existing = member("user-1", WorkspaceRole.member)
    db = db_with_results(invitation, user, existing)
    with patch(
        "app.services.workspace_srv.redis_client.delete", new=AsyncMock()
    ) as delete:
        result = await WorkspaceService.accept_invitation(db, "valid", "user-1")
    assert result is user
    assert existing.role == WorkspaceRole.admin
    assert invitation.status.value == "accepted"
    assert user.current_workspace_id == str(workspace_id)
    delete.assert_awaited_once()


@pytest.mark.asyncio
async def test_workspace_lookup_update_and_membership_helpers() -> None:
    workspace_id = uuid4()
    workspace = SimpleNamespace(name="Before")
    assert await WorkspaceService.get_workspace(
        db_with_results(workspace), workspace_id
    ) is workspace

    with pytest.raises(ApplicationError) as missing:
        await WorkspaceService.update_workspace(
            db_with_results(None), workspace_id, "After"
        )
    assert missing.value.status_code == 404

    db = db_with_results(workspace)
    assert await WorkspaceService.update_workspace(db, workspace_id, "After") is workspace
    assert workspace.name == "After"

    invitations_result = MagicMock()
    invitations_result.scalars.return_value.all.return_value = ["invite"]
    invitations_db = AsyncMock(spec=AsyncSession)
    invitations_db.execute.return_value = invitations_result
    assert await WorkspaceService.get_pending_invitations(
        invitations_db, workspace_id
    ) == ["invite"]
    assert await WorkspaceService.is_active_member(
        db_with_results(member("u1", WorkspaceRole.member)), workspace_id, "u1"
    )
    assert _encrypt_token(None) is None
    assert _encrypt_token("secret") != "secret"


@pytest.mark.asyncio
async def test_workspace_member_listing_and_owner_transfer() -> None:
    workspace_id = uuid4()
    listed_member = member("member-1", WorkspaceRole.member)
    user = SimpleNamespace(email="u@example.com", full_name="User", avatar_url=None)
    list_result = MagicMock()
    list_result.all.return_value = [(listed_member, user)]
    list_db = AsyncMock(spec=AsyncSession)
    list_db.execute.return_value = list_result
    profiles = await WorkspaceMemberService.get_workspace_members_with_profiles(
        list_db, workspace_id
    )
    assert profiles[0]["email"] == "u@example.com"

    owner = member("owner-1", WorkspaceRole.owner)
    target = member("member-1", WorkspaceRole.member)
    workspace = SimpleNamespace(owner_uid="owner-1")
    db = db_with_results(owner, target, workspace)
    with patch(
        "app.services.workspace_member_srv.redis_client.delete", new=AsyncMock()
    ):
        returned = await WorkspaceMemberService.update_member_role(
            db,
            workspace_id,
            "member-1",
            WorkspaceRole.owner,
            WorkspaceMemberStatus.active,
            "owner-1",
        )
    assert returned is target
    assert owner.role == WorkspaceRole.admin
    assert target.role == WorkspaceRole.owner
    assert workspace.owner_uid == "member-1"


@pytest.mark.asyncio
async def test_workspace_member_role_guards() -> None:
    workspace_id = uuid4()
    cases = [
        ((None,), 403, "member-1", WorkspaceRole.member),
        ((member("owner", WorkspaceRole.owner), None), 404, "member-1", WorkspaceRole.member),
        ((member("self", WorkspaceRole.owner), member("self", WorkspaceRole.member)), 400, "self", WorkspaceRole.member),
        ((member("admin", WorkspaceRole.admin), member("owner", WorkspaceRole.owner)), 403, "owner", WorkspaceRole.member),
        ((member("viewer", WorkspaceRole.viewer), member("member", WorkspaceRole.member)), 403, "member", WorkspaceRole.member),
    ]
    for values, status_code, target_uid, new_role in cases:
        actor_uid = values[0].user_uid if values[0] is not None else "actor"
        with pytest.raises(ApplicationError) as error:
            await WorkspaceMemberService.update_member_role(
                db_with_results(*values),
                workspace_id,
                target_uid,
                new_role,
                WorkspaceMemberStatus.active,
                actor_uid,
            )
        assert error.value.status_code == status_code


@pytest.mark.asyncio
async def test_remove_member_updates_current_workspace_fallback() -> None:
    workspace_id = uuid4()
    owner = member("owner", WorkspaceRole.owner)
    target = member("target", WorkspaceRole.member)
    user = SimpleNamespace(current_workspace_id=str(workspace_id))
    fallback = member("target", WorkspaceRole.member)
    db = db_with_results(owner, target, user, fallback)
    with patch(
        "app.services.workspace_member_srv.redis_client.delete", new=AsyncMock()
    ) as delete:
        removed = await WorkspaceMemberService.remove_member(
            db, workspace_id, "target", "owner"
        )
    assert removed
    assert user.current_workspace_id == str(fallback.workspace_id)
    db.delete.assert_awaited_once_with(target)
    delete.assert_awaited_once_with("user:membership:target")
