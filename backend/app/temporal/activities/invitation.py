from temporalio import activity
from app.db.database import AsyncSessionLocal
from app.models.workspace import Workspace, WorkspaceInvitation
from app.models.user import User
from app.core.logger import get_logger
from sqlalchemy import select
import uuid

logger = get_logger(__name__)


@activity.defn
async def send_invitation_email(invitation_id: str) -> bool:
    logger.info(f"Starting send_invitation_email activity for invitation_id={invitation_id}")
    
    async with AsyncSessionLocal() as db:
        try:
            inv_uuid = uuid.UUID(invitation_id)
        except ValueError:
            logger.error(f"Invalid invitation_id format: {invitation_id}")
            return False
            
        # 1. Truy vấn thông tin invitation
        inv_result = await db.execute(select(WorkspaceInvitation).where(WorkspaceInvitation.id == inv_uuid))
        invitation = inv_result.scalar_one_or_none()
        if not invitation:
            logger.error(f"Invitation {invitation_id} not found in database")
            return False
            
        # 2. Truy vấn thông tin workspace
        ws_result = await db.execute(select(Workspace).where(Workspace.id == invitation.workspace_id))
        workspace = ws_result.scalar_one_or_none()
        ws_name = workspace.name if workspace else "Unknown Workspace"
        
        # 3. Truy vấn thông tin người mời
        user_result = await db.execute(select(User).where(User.firebase_uid == invitation.invited_by))
        invited_by_user = user_result.scalar_one_or_none()
        invited_by_name = invited_by_user.full_name if invited_by_user else "Someone"
        
        # 4. Giả lập gửi email bằng tiếng Việt
        email_content = f"""
        Xin chào!
        
        Bạn đã được mời tham gia không gian làm việc "{ws_name}" trên FLAE Agents
        bởi {invited_by_name} ({invited_by_user.email if invited_by_user else invitation.invited_by})
        với vai trò: {invitation.role.value}.
        
        Nhấn vào đường link sau để chấp nhận lời mời:
        http://localhost:4200/invite?token={invitation.token}
        
        Lời mời này sẽ hết hạn vào lúc {invitation.expires_at}.
        
        Trân trọng,
        Đội ngũ FLAE Agents
        """
        logger.info(f"Email invitation sent successfully (invitation_id={invitation_id})")
        
        return True
