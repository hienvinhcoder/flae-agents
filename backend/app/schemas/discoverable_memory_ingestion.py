"""Contract for ingestion through current discovery publication."""

from pydantic import BaseModel, ConfigDict

from app.schemas.company_memory_ingestion import (
    CompanyMemoryIngestionWorkflowInput,
    CompanyMemoryIngestionWorkflowResult,
)
from app.schemas.discovery_workflow import DiscoveryWorkflowResult


class DiscoverableMemoryIngestionModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class DiscoverableMemoryIngestionWorkflowInput(DiscoverableMemoryIngestionModel):
    memory: CompanyMemoryIngestionWorkflowInput


class DiscoverableMemoryIngestionWorkflowResult(DiscoverableMemoryIngestionModel):
    memory: CompanyMemoryIngestionWorkflowResult
    discovery: DiscoveryWorkflowResult
