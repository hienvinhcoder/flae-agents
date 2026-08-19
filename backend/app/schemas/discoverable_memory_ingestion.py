"""Minimal discoverable memory ingestion schemas retained for the workflow starter."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from app.schemas.company_memory_ingestion import (
    CompanyMemoryIngestionWorkflowInput,
)


class DiscoverableMemoryIngestionModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class DiscoverableMemoryIngestionWorkflowInput(DiscoverableMemoryIngestionModel):
    memory: CompanyMemoryIngestionWorkflowInput
