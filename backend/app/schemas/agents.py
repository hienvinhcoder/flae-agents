import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ── Agent Schemas ──────────────────────────────────────────────────

class AgentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    avatar_color: str = Field(..., description="Lớp màu CSS cho avatar")
    avatar_icon: str = Field(..., description="Tên icon Lucide")
    system_prompt: str = Field(..., min_length=1)
    model_name: str = Field(default="gemini-2.5-flash")
    temperature: float = Field(default=0.2, ge=0.0, le=2.0)
    is_default: bool = Field(default=False)



class AgentCreate(AgentBase):
    pass


class AgentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    avatar_color: Optional[str] = None
    avatar_icon: Optional[str] = None
    system_prompt: Optional[str] = None
    model_name: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None


class AgentDetail(AgentBase):
    id: uuid.UUID
    workspace_id: uuid.UUID
    created_by: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
