from enum import Enum
from typing import Optional, Dict, Any
from app.models.base import BaseModel

class PlatformEnum(str, Enum):
    manual = "manual"
    haravan = "haravan"
    kiotviet = "kiotviet"

class WorkspaceRole(str, Enum):
    owner = "owner"
    admin = "admin"
    member = "member"

class Workspace(BaseModel):
    __collection__ = "workspaces"

    name: str
    industry: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    platform: PlatformEnum = PlatformEnum.manual
    platform_store_id: Optional[str] = None
    owner_uid: str

class IntegrationConfig(BaseModel):
    __collection__ = "integration_configs"

    workspace_id: str
    platform: PlatformEnum
    access_token: str
    refresh_token: Optional[str] = None
    expires_at: Optional[str] = None 
    meta_data: Dict[str, Any] = {}

class UserWorkspace(BaseModel):
    __collection__ = "user_workspaces"

    user_uid: str
    workspace_id: str
    role: WorkspaceRole = WorkspaceRole.member

class BriefingItem(BaseModel):
    __collection__ = "briefing_items"

    workspace_id: str
    title: str
    content: str
    type: str = "welcome"
    is_read: bool = False

