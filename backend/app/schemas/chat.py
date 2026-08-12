import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ── Chat Session Schemas ───────────────────────────────────────────

class ChatSessionCreate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)


class ChatSessionResponse(BaseModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    agent_id: uuid.UUID
    title: str
    created_by: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Chat Message Schemas ───────────────────────────────────────────

class ChatMessageCreate(BaseModel):
    content: str = Field(..., min_length=1)


class CitationDetail(BaseModel):
    source_document: str
    content: str
    score: Optional[float] = None


class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    role: str  # user hoặc assistant
    content: str
    citations: Optional[List[CitationDetail]] = None
    created_by: str
    created_at: datetime

    model_config = {"from_attributes": True}
