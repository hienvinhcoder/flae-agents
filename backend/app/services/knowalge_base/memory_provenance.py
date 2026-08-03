"""Build canonical evidence provenance from authorized current chunk rows."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, TypeAdapter
from sqlalchemy.engine import RowMapping

from app.schemas.agent_memory import EvidenceProvenance, SourceLocation


_SOURCE_LOCATION = TypeAdapter(SourceLocation)


class _ChunkProvenanceRow(BaseModel):
    model_config = ConfigDict(extra="ignore", frozen=True)

    source_id: UUID
    document_id: UUID
    revision_id: UUID
    chunk_id: str
    source_name: str
    source_type: str
    location_kind: str
    location_data: dict[str, object]
    source_modified_at: datetime
    ingested_at: datetime
    content_hash: str


def build_evidence_provenance(
    workspace_id: str, row: RowMapping
) -> EvidenceProvenance:
    value = _ChunkProvenanceRow.model_validate(dict(row))
    location = _SOURCE_LOCATION.validate_python(
        {"kind": value.location_kind, **value.location_data}
    )
    return EvidenceProvenance(
        workspace_id=UUID(workspace_id),
        source_id=value.source_id,
        document_id=value.document_id,
        revision_id=value.revision_id,
        chunk_id=value.chunk_id,
        source_name=value.source_name,
        source_type=value.source_type,
        location=location,
        source_modified_at=value.source_modified_at,
        ingested_at=value.ingested_at,
        content_hash=value.content_hash,
    )
