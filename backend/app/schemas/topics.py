from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, JsonValue


class TopicBase(BaseModel):
    name: str
    type: str = Field(description="'domain' | 'topic' | 'subtopic'")
    status: str = Field(default="active", description="'active' | 'archived' | 'needs_review'")
    parent_topic_id: Optional[str] = None
    summary: Optional[str] = None
    current_state: Optional[str] = None
    confidence: float = 1.0


class TopicCreate(TopicBase):
    pass


class TopicUpdate(BaseModel):
    name: Optional[str] = None
    parent_topic_id: Optional[str] = None
    summary: Optional[str] = None
    current_state: Optional[str] = None
    status: Optional[str] = None
    confidence: Optional[float] = None


class TopicListItem(BaseModel):
    workspace_id: str
    topic_id: str
    parent_topic_id: Optional[str] = None
    name: str
    slug: str
    type: str
    summary: Optional[str] = None
    status: str
    confidence: float
    evidence_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MemberDetail(BaseModel):
    member_type: str
    member_id: str
    relevance_score: float
    evidence_count: int
    created_at: datetime
    metadata: Dict[str, JsonValue] = Field(default_factory=dict)


class TopicUpdateResponse(BaseModel):
    workspace_id: str
    topic_id: str
    name: str
    slug: str
    status: str


class TopicDetailResponse(BaseModel):
    workspace_id: str
    topic_id: str
    parent_topic_id: Optional[str] = None
    name: str
    slug: str
    type: str
    summary: Optional[str] = None
    current_state: Optional[str] = None
    status: str
    confidence: float
    created_at: datetime
    updated_at: datetime
    members: List[MemberDetail] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class TopicMergeRequest(BaseModel):
    target_topic_id: str
    source_topic_ids: List[str]
