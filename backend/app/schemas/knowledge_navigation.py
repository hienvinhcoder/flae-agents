"""Pydantic schemas for domain/topic navigation API."""

from typing import Optional

from pydantic import BaseModel, ConfigDict


class DomainItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    domain_id: str
    name: str
    slug: str
    description: Optional[str] = None
    topic_count: int = 0
    confidence: float = 0.0


class DomainDetail(DomainItem):
    topics: list["TopicItem"] = []


class TopicItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    topic_id: str
    name: str
    summary: Optional[str] = None
    domain_id: Optional[str] = None
    chunk_count: int = 0
    confidence: float = 0.0


class DomainPage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[DomainItem] = []
    next_cursor: Optional[str] = None


class TopicPage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[TopicItem] = []
    next_cursor: Optional[str] = None
