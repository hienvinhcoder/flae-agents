import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.logger import get_logger
from app.db.database import redis_client
from app.models.workspace import (
    Workspace,
    WorkspaceMember,
    WorkspaceRole,
    WorkspaceMemberStatus
)
from app.models.user import User

logger = get_logger(__name__)

class WorkspaceMemberService:
    @staticmethod
    async def get_workspace_members_with_profiles(db: AsyncSession, workspace_id: uuid.UUID) -> list[dict]:
        """Lấy danh sách thành viên kèm profile User."""
        result = await db.execute(
            select(WorkspaceMember, User)
            .join(User, WorkspaceMember.user_uid == User.firebase_uid)
            .where(WorkspaceMember.workspace_id == workspace_id)
        )
        members_list = []
        for member, user in result.all():
            members_list.append({
                "workspace_id": str(member.workspace_id),
                "user_uid": member.user_uid,
                "role": member.role,
                "status": member.status,
                "email": user.email,
                "full_name": user.full_name,
                "avatar_url": user.avatar_url
            })
        return members_list

    @staticmethod
    async def update_member_role(
        db: AsyncSession,
        workspace_id: uuid.UUID,
        member_uid: str,
        new_role: WorkspaceRole,
        new_status: WorkspaceMemberStatus,
        actor_uid: str
    ) -> WorkspaceMember:
        """Cập nhật vai trò/trạng thái của thành viên trong Workspace."""
        # 1. Lấy thông tin người thao tác (actor)
        actor_member_result = await db.execute(
            select(WorkspaceMember).where(
                and_(
                    WorkspaceMember.workspace_id == workspace_id,
                    WorkspaceMember.user_uid == actor_uid
                )
            )
        )
        actor_member = actor_member_result.scalar_one_or_none()
        if not actor_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Actor is not a member of this workspace"
            )
            
        # 2. Lấy thông tin thành viên bị tác động (target)
        target_member_result = await db.execute(
            select(WorkspaceMember).where(
                and_(
                    WorkspaceMember.workspace_id == workspace_id,
                    WorkspaceMember.user_uid == member_uid
                )
            )
        )
        target_member = target_member_result.scalar_one_or_none()
        if not target_member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Member not found in this workspace"
            )
            
        # 3. Phân quyền thao tác (RBAC Rules)
        # - Chỉ có owner mới được thay đổi quyền của một admin hoặc owner khác.
        # - Admin chỉ được thay đổi quyền của member hoặc viewer.
        # - Không được tự thay đổi quyền của chính mình.
        if actor_uid == member_uid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot modify your own role or status"
            )
            
        if actor_member.role == WorkspaceRole.owner:
            # Owner có toàn quyền, nhưng nếu set target thành owner, actor phải từ chức owner thành admin/member
            if new_role == WorkspaceRole.owner:
                # Đổi vai trò actor thành admin
                actor_member.role = WorkspaceRole.admin
                # Đổi vai trò target thành owner
                target_member.role = WorkspaceRole.owner
                # Cập nhật trường owner_uid trên Workspace
                ws_result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
                ws = ws_result.scalar_one()
                ws.owner_uid = member_uid
            else:
                target_member.role = new_role
                target_member.status = new_status
        elif actor_member.role == WorkspaceRole.admin:
            if target_member.role in [WorkspaceRole.owner, WorkspaceRole.admin]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admin cannot modify role/status of owners or other admins"
                )
            if new_role in [WorkspaceRole.owner, WorkspaceRole.admin]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admin cannot promote members to owner or admin"
                )
            target_member.role = new_role
            target_member.status = new_status
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only owners and admins can modify member roles"
            )
            
        await db.commit()
        await db.refresh(target_member)
        
        # 4. Xóa Redis membership cache của user bị tác động và actor
        await redis_client.delete(f"user:membership:{member_uid}")
        await redis_client.delete(f"user:membership:{actor_uid}")
        
        logger.info(f"Member {member_uid} updated by {actor_uid} in workspace {workspace_id}")
        return target_member

    @staticmethod
    async def remove_member(db: AsyncSession, workspace_id: uuid.UUID, member_uid: str, actor_uid: str) -> bool:
        """Xóa thành viên khỏi Workspace."""
        # 1. Lấy thông tin người thao tác (actor)
        actor_member_result = await db.execute(
            select(WorkspaceMember).where(
                and_(
                    WorkspaceMember.workspace_id == workspace_id,
                    WorkspaceMember.user_uid == actor_uid
                )
            )
        )
        actor_member = actor_member_result.scalar_one_or_none()
        if not actor_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Actor is not a member of this workspace"
            )
            
        # 2. Lấy thông tin thành viên bị xóa (target)
        target_member_result = await db.execute(
            select(WorkspaceMember).where(
                and_(
                    WorkspaceMember.workspace_id == workspace_id,
                    WorkspaceMember.user_uid == member_uid
                )
            )
        )
        target_member = target_member_result.scalar_one_or_none()
        if not target_member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Member not found in this workspace"
            )
            
        # 3. Phân quyền xóa
        # - Không được xóa owner.
        # - Admin chỉ được xóa member/viewer.
        # - Owner được xóa bất kỳ ai trừ chính mình (phải chuyển giao owner trước khi rời).
        if target_member.role == WorkspaceRole.owner:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the owner of the workspace"
            )
            
        if actor_uid == member_uid:
            # Tự rời workspace
            pass
        elif actor_member.role == WorkspaceRole.owner:
            pass
        elif actor_member.role == WorkspaceRole.admin:
            if target_member.role == WorkspaceRole.admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Admin cannot remove other admins"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only owners and admins can remove members"
            )
            
        # Thực hiện xóa
        await db.delete(target_member)
        
        # Nếu user bị xóa đang chọn workspace này làm current_workspace_id, cập nhật lại cho họ
        user_result = await db.execute(select(User).where(User.firebase_uid == member_uid))
        user = user_result.scalar_one_or_none()
        if user and user.current_workspace_id == str(workspace_id):
            # Tìm workspace thay thế
            other_member_result = await db.execute(
                select(WorkspaceMember).where(
                    and_(
                        WorkspaceMember.user_uid == member_uid,
                        WorkspaceMember.workspace_id != workspace_id,
                        WorkspaceMember.status == WorkspaceMemberStatus.active
                    )
                ).limit(1)
            )
            other_member = other_member_result.scalar_one_or_none()
            user.current_workspace_id = str(other_member.workspace_id) if other_member else None
            
        await db.commit()
        
        # 4. Xóa Redis membership cache
        await redis_client.delete(f"user:membership:{member_uid}")
        
        logger.info(f"Member {member_uid} removed by {actor_uid} from workspace {workspace_id}")
        return True
