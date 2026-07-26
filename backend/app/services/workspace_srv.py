import uuid
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.exc import NoResultFound
from cryptography.fernet import Fernet

from app.core.config import settings
from app.core.logger import get_logger
from app.db.database import redis_client
from app.db.rag_db import rag_db_manager
from app.models.workspace import (
    Workspace,
    WorkspaceMember,
    WorkspaceInvitation,
    WorkspaceRole,
    WorkspaceMemberStatus,
    InvitationStatus
)
from app.models.user import User
from app.schemas.sche_workspace import (
    WorkspaceManualCreateRequest,
    WorkspaceInvitationRequest
)

logger = get_logger(__name__)

def _get_cipher():
    key = settings.ENCRYPTION_KEY
    if not key:
        key = Fernet.generate_key().decode("utf-8")
    return Fernet(key.encode("utf-8"))


def _encrypt_token(token: str | None) -> str | None:
    if not token:
        return token
    cipher = _get_cipher()
    return cipher.encrypt(token.encode("utf-8")).decode("utf-8")


class WorkspaceService:

    @staticmethod
    async def update_current_workspace(db: AsyncSession, user_uid: str, workspace_id: str) -> User:
        """Cập nhật current_workspace_id cho User sau khi xác thực membership."""
        from sqlalchemy import and_
        # 1. Kiểm tra xem user có phải là thành viên active của workspace này không
        try:
            workspace_uuid = uuid.UUID(workspace_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid workspace ID format"
            )

        result = await db.execute(
            select(WorkspaceMember).where(
                and_(
                    WorkspaceMember.workspace_id == workspace_uuid,
                    WorkspaceMember.user_uid == user_uid,
                    WorkspaceMember.status == WorkspaceMemberStatus.active
                )
            )
        )
        membership = result.scalar_one_or_none()
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this workspace"
            )

        # 2. Thực hiện cập nhật
        user_result = await db.execute(select(User).where(User.firebase_uid == user_uid))
        user = user_result.scalar_one()
        user.current_workspace_id = workspace_id
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def create_manual_workspace(db: AsyncSession, request: WorkspaceManualCreateRequest, user_uid: str) -> Workspace:
        """Tạo workspace thủ công và thiết lập user làm owner."""
        # 1. Tạo Workspace
        workspace = Workspace(
            name=request.name,
            owner_uid=user_uid
        )
        db.add(workspace)
        await db.flush()  # flush để lấy id

        # 2. Tạo WorkspaceMember (owner)
        member = WorkspaceMember(
            workspace_id=workspace.id,
            user_uid=user_uid,
            role=WorkspaceRole.owner,
            status=WorkspaceMemberStatus.active
        )
        db.add(member)
        await db.commit()
        await db.refresh(workspace)

        workspace_id_str = str(workspace.id)

        # 3. Cập nhật current_workspace_id của user
        await WorkspaceService.update_current_workspace(db, user_uid, workspace_id_str)

        # Xóa cache Redis membership của user
        await redis_client.delete(f"user:membership:{user_uid}")

        # 4. Kích hoạt tạo phân vùng RAG
        try:
            await rag_db_manager.create_workspace_partition(workspace_id_str)
            logger.info(f"RAG partitions initialized for manual workspace {workspace_id_str}")
        except Exception as e:
            logger.error(f"Failed to create RAG partition for manual workspace {workspace_id_str}: {e}")

        logger.info(f"Manual workspace {workspace_id_str} created by user {user_uid}")
        return workspace

    @staticmethod
    async def create_default_workspace(db: AsyncSession, user_uid: str) -> Workspace:
        """Tạo workspace mặc định cho user."""
        result = await db.execute(select(User).where(User.firebase_uid == user_uid))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # 1. Tạo mới Workspace
        new_ws = Workspace(
            name=f"{user.full_name or 'User'}'s Workspace",
            owner_uid=user_uid
        )
        db.add(new_ws)
        await db.flush()  # flush để lấy id

        # 2. Tạo WorkspaceMember (owner)
        member = WorkspaceMember(
            workspace_id=new_ws.id,
            user_uid=user_uid,
            role=WorkspaceRole.owner,
            status=WorkspaceMemberStatus.active
        )
        db.add(member)

        # 3. Cập nhật current_workspace_id của user
        user.current_workspace_id = str(new_ws.id)

        # 4. Commit User + Workspace + Member TRƯỚC khi tạo RAG partition.
        # Đảm bảo dữ liệu quan trọng (user, workspace) luôn được lưu,
        # không bị rollback bởi lỗi RAG partition phụ trợ.
        await db.commit()
        await db.refresh(user)
        await db.refresh(new_ws)

        # Xóa cache Redis membership
        try:
            await redis_client.delete(f"user:membership:{user_uid}")
        except Exception as ex:
            logger.warning(f"Failed to invalidate Redis membership cache for {user_uid}: {ex}")

        # 5. Kích hoạt tạo phân vùng RAG (non-blocking)
        # RAG partition sẽ được tạo lazy khi cần nếu thất bại ở đây
        try:
            await rag_db_manager.create_workspace_partition(str(new_ws.id))
            logger.info(f"RAG partitions initialized for default workspace {new_ws.id}")
        except Exception as ex:
            logger.error(f"Failed to create RAG partition for default workspace {new_ws.id}: {ex}")
            # Không raise exception — workspace vẫn hoạt động bình thường,
            # RAG partition sẽ được tạo khi user lần đầu sử dụng Knowledge Base

        return new_ws

    @staticmethod
    async def get_user_workspaces(db: AsyncSession, user_uid: str) -> list[Workspace]:
        """Lấy danh sách Workspace mà user là thành viên active."""
        result = await db.execute(
            select(Workspace)
            .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
            .where(
                and_(
                    WorkspaceMember.user_uid == user_uid,
                    WorkspaceMember.status == WorkspaceMemberStatus.active
                )
            )
        )
        workspaces = list(result.scalars().all())
        if not workspaces:
            # Tự động tạo default workspace cho user nếu danh sách trống
            logger.info(f"User {user_uid} has no workspaces. Automatically creating one.")
            new_ws = await WorkspaceService.create_default_workspace(db, user_uid)
            workspaces = [new_ws]
        return workspaces




    @staticmethod
    async def invite_member(db: AsyncSession, workspace_id: uuid.UUID, request: WorkspaceInvitationRequest, invited_by_uid: str) -> WorkspaceInvitation:
        """Tạo lời mời tham gia workspace và kích hoạt Temporal workflow."""
        if request.role == WorkspaceRole.owner:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot invite a member with the owner role"
            )

        # 1. Kiểm tra xem user đã là thành viên chưa
        user_result = await db.execute(select(User).where(User.email == request.email))
        user = user_result.scalar_one_or_none()
        if user:
            member_result = await db.execute(
                select(WorkspaceMember).where(
                    and_(
                        WorkspaceMember.workspace_id == workspace_id,
                        WorkspaceMember.user_uid == user.firebase_uid
                    )
                )
            )
            if member_result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User is already a member of this workspace"
                )

        # 2. Tạo token ngẫu nhiên và lưu invitation
        token = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)

        invitation = WorkspaceInvitation(
            workspace_id=workspace_id,
            email=request.email,
            role=request.role,
            token=token,
            invited_by=invited_by_uid,
            status=InvitationStatus.pending,
            expires_at=expires_at
        )
        db.add(invitation)
        await db.commit()
        await db.refresh(invitation)

        # 3. Kích hoạt Temporal Workflow gửi email lời mời
        try:
            from app.core.temporal import get_temporal_client
            temporal_client = await get_temporal_client()
            # Kích hoạt Workflow bất đồng bộ
            await temporal_client.start_workflow(
                "WorkspaceInvitationWorkflow",
                str(invitation.id),
                id=f"invitation-{invitation.id}",
                task_queue="flae-default-queue"
            )
            logger.info(f"Temporal Workflow triggered for invitation: {invitation.id}")
        except Exception as e:
            logger.error(f"Failed to trigger Temporal Workflow for invitation {invitation.id}: {e}")

        return invitation

    @staticmethod
    async def accept_invitation(db: AsyncSession, token: str, user_uid: str) -> User:
        """Chấp nhận lời mời tham gia workspace."""
        # 1. Tìm invitation hợp lệ
        result = await db.execute(
            select(WorkspaceInvitation).where(
                and_(
                    WorkspaceInvitation.token == token,
                    WorkspaceInvitation.status == InvitationStatus.pending
                )
            )
        )
        invitation = result.scalar_one_or_none()
        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invitation not found or already accepted/expired"
            )

        if invitation.expires_at < datetime.now(timezone.utc):
            invitation.status = InvitationStatus.expired
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invitation token has expired"
            )

        # 2. Lấy thông tin user hiện tại
        user_result = await db.execute(select(User).where(User.firebase_uid == user_uid))
        user = user_result.scalar_one()

        if user.email.lower() != invitation.email.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This invitation was sent to a different email address"
            )

        # 3. Tạo WorkspaceMember
        member_result = await db.execute(
            select(WorkspaceMember).where(
                and_(
                    WorkspaceMember.workspace_id == invitation.workspace_id,
                    WorkspaceMember.user_uid == user_uid
                )
            )
        )
        member = member_result.scalar_one_or_none()
        if member:
            member.role = invitation.role
            member.status = WorkspaceMemberStatus.active
        else:
            member = WorkspaceMember(
                workspace_id=invitation.workspace_id,
                user_uid=user_uid,
                role=invitation.role,
                status=WorkspaceMemberStatus.active
            )
            db.add(member)

        # 4. Cập nhật trạng thái invitation và current_workspace_id của user
        invitation.status = InvitationStatus.accepted
        user.current_workspace_id = str(invitation.workspace_id)

        await db.commit()
        await db.refresh(user)

        # 5. Xóa Redis membership cache
        await redis_client.delete(f"user:membership:{user_uid}")

        logger.info(f"User {user_uid} accepted invitation to workspace {invitation.workspace_id}")
        return user



    @staticmethod
    async def update_workspace(db: AsyncSession, workspace_id: uuid.UUID, name: str) -> Workspace:
        """Cập nhật tên Workspace."""
        result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
        workspace = result.scalar_one_or_none()
        if not workspace:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
        workspace.name = name
        await db.commit()
        await db.refresh(workspace)
        return workspace

    @staticmethod
    async def get_pending_invitations(db: AsyncSession, workspace_id: uuid.UUID) -> list[WorkspaceInvitation]:
        """Lấy danh sách lời mời đang chờ xử lý của Workspace."""
        from sqlalchemy import and_
        result = await db.execute(
            select(WorkspaceInvitation).where(
                and_(
                    WorkspaceInvitation.workspace_id == workspace_id,
                    WorkspaceInvitation.status == InvitationStatus.pending
                )
            )
        )
        return list(result.scalars().all())

    @staticmethod
    async def is_active_member(db: AsyncSession, workspace_id: uuid.UUID, user_uid: str) -> bool:
        """Kiểm tra xem user có phải là thành viên active của workspace không."""
        from sqlalchemy import and_
        result = await db.execute(
            select(WorkspaceMember).where(
                and_(
                    WorkspaceMember.workspace_id == workspace_id,
                    WorkspaceMember.user_uid == user_uid,
                    WorkspaceMember.status == WorkspaceMemberStatus.active
                )
            )
        )
        return result.scalar_one_or_none() is not None
