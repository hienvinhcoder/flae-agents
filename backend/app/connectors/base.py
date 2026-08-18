"""Transport-independent delta-sync contracts shared by source connectors."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ConnectorModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class ConnectorChangeAction(StrEnum):
    upsert = "upsert"
    tombstone = "tombstone"


class ConnectorChange(ConnectorModel):
    workspace_id: UUID
    connector_id: str = Field(
        min_length=1,
        max_length=200,
        pattern=r"^[A-Za-z0-9._:-]+$",
    )
    source_external_id: str = Field(min_length=1, max_length=1_000)
    source_version_key: str = Field(min_length=1, max_length=500)
    source_name: str = Field(min_length=1, max_length=500)
    source_type: Literal["google_drive"] = "google_drive"
    source_modified_at: datetime | None = None
    action: ConnectorChangeAction
    output_mime_type: str | None = Field(default=None, max_length=200)
    content: bytes | None = Field(default=None, max_length=50 * 1024 * 1024)
    content_checksum: str | None = Field(
        default=None, pattern=r"^sha256:[0-9a-f]{64}$"
    )
    acl_scope: Literal["restricted"] = "restricted"
    acl_principal_ids: tuple[str, ...] = Field(default=(), max_length=10_000)
    acl_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")

    @model_validator(mode="after")
    def validate_action_payload(self) -> ConnectorChange:
        content_fields = (
            self.content,
            self.content_checksum,
            self.output_mime_type,
            self.source_modified_at,
        )
        if self.action is ConnectorChangeAction.upsert:
            if any(value is None for value in content_fields):
                raise ValueError("connector upserts require content metadata")
            if not self.acl_principal_ids:
                raise ValueError("connector upserts require authorized principals")
        elif any(value is not None for value in content_fields):
            raise ValueError("connector tombstones cannot carry source content")
        return self


class ConnectorBatch(ConnectorModel):
    events: tuple[ConnectorChange, ...] = Field(max_length=1_000)
    next_cursor: str = Field(min_length=1, max_length=8_000)
    has_more: bool


class ConnectorSourceState(ConnectorModel):
    workspace_id: UUID
    connector_id: str = Field(
        min_length=1,
        max_length=200,
        pattern=r"^[A-Za-z0-9._:-]+$",
    )
    source_external_id: str = Field(min_length=1, max_length=1_000)
    source_id: UUID
    document_id: UUID
    revision_id: UUID
    source_version_key: str = Field(min_length=1, max_length=500)
    content_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    acl_checksum: str = Field(pattern=r"^sha256:[0-9a-f]{64}$")
    gcs_path: str = Field(min_length=1, max_length=2_000)
    tombstoned: bool = False
