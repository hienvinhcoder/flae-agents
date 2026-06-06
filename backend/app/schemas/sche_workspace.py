from typing import Optional
from pydantic import BaseModel

from app.models.workspace import PlatformEnum
from app.schemas.sche_base import ResponseSchemaBase


class WorkspaceItemResponse(ResponseSchemaBase):
    id: str = ""
    name: str = ""
    platform: PlatformEnum = PlatformEnum.manual
    
    model_config = {"from_attributes": True}


class WorkspaceManualCreateRequest(ResponseSchemaBase):
    name: str
    industry: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None



