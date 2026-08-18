from datetime import datetime
from typing import Optional
from pydantic import EmailStr
from app.schemas.common import ResponseSchemaBase
from app.models.workspace import WorkspaceRole, WorkspaceMemberStatus, InvitationStatus

class WorkspaceItemResponse(ResponseSchemaBase):
    id: str = ""
    name: str = ""
    owner_uid: str = ""
    created_at: Optional[datetime] = None
    
    model_config = {"from_attributes": True}

class WorkspaceManualCreateRequest(ResponseSchemaBase):
    name: str

class WorkspaceInvitationRequest(ResponseSchemaBase):
    email: EmailStr
    role: WorkspaceRole = WorkspaceRole.member

class WorkspaceInvitationResponse(ResponseSchemaBase):
    id: str
    workspace_id: str
    email: str
    role: WorkspaceRole
    token: str
    invited_by: str
    status: InvitationStatus
    expires_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}

class WorkspaceMemberResponse(ResponseSchemaBase):
    workspace_id: str
    user_uid: str
    role: WorkspaceRole
    status: WorkspaceMemberStatus
    email: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}

class WorkspaceMemberUpdateRequest(ResponseSchemaBase):
    role: WorkspaceRole
    status: WorkspaceMemberStatus

class InvitationAcceptRequest(ResponseSchemaBase):
    token: str
