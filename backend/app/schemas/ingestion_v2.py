"""Typed, references-only contracts for the V2 base-ingestion pipeline."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from urllib.parse import urlsplit
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.agent_memory import SourceLocation


Checksum = str


class IngestionV2Model(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class SourceRevisionReference(IngestionV2Model):
    workspace_id: UUID
    source_id: UUID
    document_id: UUID
    revision_id: UUID
    ingestion_run_id: UUID
    source_uri: str = Field(min_length=1, max_length=4_000)
    source_name: str = Field(min_length=1, max_length=500)
    source_type: str = Field(min_length=1, max_length=100)
    source_modified_at: datetime
    content_checksum: Checksum = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    acl_checksum: Checksum = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    acl_scope: Literal["workspace", "restricted"]
    acl_principal_ids: tuple[str, ...] = Field(default=(), max_length=10_000)
    parser_version: str = Field(min_length=1, max_length=200)
    chunker_version: str = Field(min_length=1, max_length=200)
    pipeline_version: str = Field(min_length=1, max_length=200)
    expected_previous_revision_id: UUID | None = None

    @field_validator("source_uri")
    @classmethod
    def validate_source_uri(cls, value: str) -> str:
        parsed = urlsplit(value)
        if parsed.scheme != "gcs" or not parsed.netloc or parsed.query or parsed.fragment:
            raise ValueError("V2 ingestion requires a secret-free gcs:// reference")
        return value

    @model_validator(mode="after")
    def validate_acl(self) -> SourceRevisionReference:
        if self.acl_scope == "restricted" and not self.acl_principal_ids:
            raise ValueError("restricted sources require at least one ACL principal")
        if any(not principal.strip() for principal in self.acl_principal_ids):
            raise ValueError("ACL principals must be non-empty")
        return self


class ParsedBaseChunk(IngestionV2Model):
    section_structural_key: str = Field(min_length=1, max_length=2_000)
    heading_path: tuple[str, ...] = Field(min_length=1, max_length=32)
    location: SourceLocation
    text: str = Field(min_length=1, max_length=2_000_000)
    token_count: int = Field(ge=1)


class PrepareBaseStageInput(IngestionV2Model):
    source: SourceRevisionReference
    batch_size: int = Field(default=20, ge=1, le=100)


class BaseBatchReference(IngestionV2Model):
    workspace_id: UUID
    ingestion_run_id: UUID
    revision_id: UUID
    batch_id: str = Field(pattern=r"^base-[0-9]{6}$")
    item_count: int = Field(ge=1, le=100)
    pipeline_version: str = Field(min_length=1, max_length=200)
    input_checksum: Checksum = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    output_checksum: Checksum = Field(pattern=r"^sha256:[0-9a-f]{64}$")


class BaseStagePlan(IngestionV2Model):
    revision_id: UUID
    ingestion_run_id: UUID
    chunk_count: int = Field(ge=1)
    batches: tuple[BaseBatchReference, ...] = Field(min_length=1)
    manifest_checksum: Checksum = Field(pattern=r"^sha256:[0-9a-f]{64}$")


class EmbeddingBatchItem(IngestionV2Model):
    chunk_id: str = Field(min_length=1, max_length=500)
    text: str = Field(min_length=1, max_length=2_000_000)


class StageEmbeddingInput(IngestionV2Model):
    batch: BaseBatchReference


class StageBatchResult(IngestionV2Model):
    batch_id: str
    stage_name: Literal["embed"] = "embed"
    item_count: int = Field(ge=1)
    input_checksum: Checksum = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    output_checksum: Checksum = Field(pattern=r"^sha256:[0-9a-f]{64}$")


class ManifestExpectation(IngestionV2Model):
    stage_name: Literal["parse", "embed"]
    batch_id: str = Field(pattern=r"^base-[0-9]{6}$")
    item_count: int = Field(ge=1)
    output_checksum: Checksum = Field(pattern=r"^sha256:[0-9a-f]{64}$")


class PublishBaseInput(IngestionV2Model):
    source: SourceRevisionReference
    manifests: tuple[ManifestExpectation, ...] = Field(min_length=2)


class PublishBaseResult(IngestionV2Model):
    revision_id: UUID
    superseded_revision_id: UUID | None = None
    chunk_count: int = Field(ge=1)
    published: bool


class IngestionWorkflowV2Input(IngestionV2Model):
    source: SourceRevisionReference
    batch_size: int = Field(default=20, ge=1, le=100)
    max_parallel_batches: int = Field(default=4, ge=1, le=16)


class IngestionV2BootstrapInput(IngestionV2Model):
    workspace_id: UUID
    document_id: UUID
    gcs_path: str = Field(min_length=1, max_length=1_000)
    source_name: str = Field(min_length=1, max_length=500)
    source_modified_at: datetime
    content_checksum: Checksum = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    pipeline_version: str = Field(default="pipeline-v2", min_length=1, max_length=200)
    parser_version: str = Field(default="markdown-v2", min_length=1, max_length=200)
    chunker_version: str = Field(default="structure-v2", min_length=1, max_length=200)


class IngestionWorkflowV2Output(IngestionV2Model):
    revision_id: UUID
    chunk_count: int = Field(ge=1)
    batch_count: int = Field(ge=1)
    manifest_checksum: Checksum = Field(pattern=r"^sha256:[0-9a-f]{64}$")


class V2DocumentStatusInput(IngestionV2Model):
    document_id: UUID
    status: Literal["processing", "completed", "failed"]
    chunk_count: int | None = Field(default=None, ge=0)
    error_code: str | None = Field(default=None, min_length=1, max_length=100)
