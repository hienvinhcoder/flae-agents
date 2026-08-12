import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.security import get_current_user, require_roles
from app.schemas.common import DataResponse
from app.schemas.workspaces import (
    WorkspaceItemResponse,
    WorkspaceManualCreateRequest,
    WorkspaceInvitationRequest,
    WorkspaceInvitationResponse,
    WorkspaceMemberResponse,
    WorkspaceMemberUpdateRequest,
    InvitationAcceptRequest
)
from app.services.workspaces.members import WorkspaceMemberService
from app.services.workspaces.service import WorkspaceService
from app.models.workspace import WorkspaceRole

router = APIRouter()

@router.post("/manual", response_model=DataResponse[WorkspaceItemResponse])
async def create_manual_workspace(
    request: WorkspaceManualCreateRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Tạo workspace thủ công và sinh data mặc định.
    """
    workspace = await WorkspaceService.create_manual_workspace(db, request, current_user.firebase_uid)
    return DataResponse[WorkspaceItemResponse].success_response(
        data=WorkspaceItemResponse(
            id=str(workspace.id) if workspace.id else "",
            name=workspace.name,
            owner_uid=workspace.owner_uid,
            created_at=workspace.created_at
        )
    )

@router.get("", response_model=DataResponse[list[WorkspaceItemResponse]])
async def get_user_workspaces(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lấy danh sách Workspace của User hiện tại.
    """
    workspaces = await WorkspaceService.get_user_workspaces(db, current_user.firebase_uid)
    data = [
        WorkspaceItemResponse(
            id=str(ws.id) if ws.id else "",
            name=ws.name,
            owner_uid=ws.owner_uid,
            created_at=ws.created_at
        )
        for ws in workspaces
    ]
    return DataResponse[list[WorkspaceItemResponse]].success_response(data=data)

@router.get("/{workspace_id}/members", response_model=DataResponse[list[WorkspaceMemberResponse]])
async def get_workspace_members(
    workspace_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=Depends(require_roles([WorkspaceRole.owner, WorkspaceRole.admin, WorkspaceRole.member, WorkspaceRole.viewer]))
):
    """
    Lấy danh sách thành viên trong Workspace.
    """
    members = await WorkspaceMemberService.get_workspace_members_with_profiles(db, workspace_id)
    data = [WorkspaceMemberResponse(**m) for m in members]
    return DataResponse[list[WorkspaceMemberResponse]].success_response(data=data)

@router.post("/{workspace_id}/invitations", response_model=DataResponse[WorkspaceInvitationResponse])
async def invite_member(
    workspace_id: uuid.UUID,
    request: WorkspaceInvitationRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=Depends(require_roles([WorkspaceRole.owner, WorkspaceRole.admin]))
):
    """
    Mời một thành viên mới tham gia Workspace (chỉ dành cho owner, admin).
    """
    invitation = await WorkspaceService.invite_member(db, workspace_id, request, current_user.firebase_uid)
    return DataResponse[WorkspaceInvitationResponse].success_response(
        data=WorkspaceInvitationResponse(
            id=str(invitation.id) if invitation.id else "",
            workspace_id=str(invitation.workspace_id),
            email=invitation.email,
            role=invitation.role,
            token=invitation.token,
            invited_by=invitation.invited_by,
            status=invitation.status,
            expires_at=invitation.expires_at,
            created_at=invitation.created_at
        )
    )

@router.post("/invitations/accept", response_model=DataResponse[WorkspaceItemResponse])
async def accept_invitation(
    request: InvitationAcceptRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Chấp nhận lời mời tham gia workspace.
    """
    user = await WorkspaceService.accept_invitation(db, request.token, current_user.firebase_uid)
    workspace = await WorkspaceService.get_workspace(
        db, uuid.UUID(user.current_workspace_id)
    )
    
    return DataResponse[WorkspaceItemResponse].success_response(
        data=WorkspaceItemResponse(
            id=str(workspace.id) if workspace else "",
            name=workspace.name if workspace else "",
            owner_uid=workspace.owner_uid if workspace else "",
            created_at=workspace.created_at if workspace else None
        )
    )

@router.put("/{workspace_id}/members/{user_uid}", response_model=DataResponse[WorkspaceMemberResponse])
async def update_member_role(
    workspace_id: uuid.UUID,
    user_uid: str,
    request: WorkspaceMemberUpdateRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=Depends(require_roles([WorkspaceRole.owner, WorkspaceRole.admin]))
):
    """
    Cập nhật vai trò hoặc trạng thái thành viên (chỉ dành cho owner, admin).
    """
    member = await WorkspaceMemberService.update_member_role(
        db, workspace_id, user_uid, request.role, request.status, current_user.firebase_uid
    )
    # Lấy thêm thông tin User Profile
    user_res = await WorkspaceMemberService.get_workspace_members_with_profiles(db, workspace_id)
    # Tìm profile cụ thể
    member_profile = next((m for m in user_res if m["user_uid"] == user_uid), None)
    
    return DataResponse[WorkspaceMemberResponse].success_response(
        data=WorkspaceMemberResponse(
            workspace_id=str(member.workspace_id),
            user_uid=member.user_uid,
            role=member.role,
            status=member.status,
            email=member_profile["email"] if member_profile else None,
            full_name=member_profile["full_name"] if member_profile else None,
            avatar_url=member_profile["avatar_url"] if member_profile else None
        )
    )

@router.delete("/{workspace_id}/members/{user_uid}", response_model=DataResponse[bool])
async def remove_member(
    workspace_id: uuid.UUID,
    user_uid: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=Depends(require_roles([WorkspaceRole.owner, WorkspaceRole.admin]))
):
    """
    Xóa thành viên ra khỏi Workspace.
    """
    success = await WorkspaceMemberService.remove_member(db, workspace_id, user_uid, current_user.firebase_uid)
    return DataResponse[bool].success_response(data=success)


@router.put("/{workspace_id}", response_model=DataResponse[WorkspaceItemResponse])
async def update_workspace(
    workspace_id: uuid.UUID,
    request: WorkspaceManualCreateRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=Depends(require_roles([WorkspaceRole.owner, WorkspaceRole.admin]))
):
    """
    Cập nhật tên Workspace.
    """
    workspace = await WorkspaceService.update_workspace(db, workspace_id, request.name)
    return DataResponse[WorkspaceItemResponse].success_response(
        data=WorkspaceItemResponse(
            id=str(workspace.id) if workspace.id else "",
            name=workspace.name,
            owner_uid=workspace.owner_uid,
            created_at=workspace.created_at
        )
    )


@router.get("/{workspace_id}/invitations", response_model=DataResponse[list[WorkspaceInvitationResponse]])
async def get_pending_invitations(
    workspace_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _role=Depends(require_roles([WorkspaceRole.owner, WorkspaceRole.admin]))
):
    """
    Lấy danh sách lời mời đang chờ xử lý (chỉ dành cho owner, admin).
    """
    invitations = await WorkspaceService.get_pending_invitations(db, workspace_id)
    data = [
        WorkspaceInvitationResponse(
            id=str(inv.id) if inv.id else "",
            workspace_id=str(inv.workspace_id),
            email=inv.email,
            role=inv.role,
            token=inv.token,
            invited_by=inv.invited_by,
            status=inv.status,
            expires_at=inv.expires_at,
            created_at=inv.created_at
        )
        for inv in invitations
    ]
    return DataResponse[list[WorkspaceInvitationResponse]].success_response(data=data)
