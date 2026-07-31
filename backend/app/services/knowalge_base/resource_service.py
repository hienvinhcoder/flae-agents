"""Canonical resource identity helpers independent from transport and storage."""

from __future__ import annotations

from hashlib import sha256
import json
import re
import unicodedata
from urllib.parse import unquote, urlsplit
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.exceptions import InvalidArgumentError, ResourceNotFoundError
from app.db.rag_repository import RagRepository
from app.schemas.agent_memory import ResourceKind, SourceLocation


_CHUNK_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]+$")


class ResourceIdentityModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class ChunkIdentity(ResourceIdentityModel):
    revision_id: UUID
    section_structural_key: str = Field(min_length=1, max_length=2_000)
    location: SourceLocation
    normalized_text: str = Field(min_length=1, max_length=2_000_000)
    chunker_version: str = Field(min_length=1, max_length=200)


class CanonicalResource(ResourceIdentityModel):
    workspace_id: UUID
    kind: ResourceKind
    document_id: UUID | None = None
    revision_id: UUID | None = None
    chunk_id: str | None = None
    resource_id: UUID | None = None

    @model_validator(mode="after")
    def validate_identity_shape(self) -> CanonicalResource:
        if self.kind is ResourceKind.revision:
            if self.document_id is None or self.revision_id is None:
                raise ValueError("revision resources require document and revision IDs")
        elif self.kind is ResourceKind.chunk:
            if (
                self.document_id is None
                or self.revision_id is None
                or self.chunk_id is None
            ):
                raise ValueError("chunk resources require document, revision, and chunk IDs")
        elif self.resource_id is None:
            raise ValueError("canonical resources require a resource ID")
        return self


class ResourceSpan(ResourceIdentityModel):
    start_offset: int = Field(ge=0)
    end_offset: int = Field(gt=0)

    @model_validator(mode="after")
    def validate_span(self) -> ResourceSpan:
        if self.end_offset <= self.start_offset:
            raise ValueError("resource span must be ordered")
        if self.end_offset - self.start_offset > 100_000:
            raise ValueError("resource span exceeds the read limit")
        return self


class AuthorizedResourceSpan(ResourceIdentityModel):
    resource_uri: str
    chunk_id: str
    text: str
    start_offset: int
    end_offset: int
    content_hash: str
    source_name: str
    source_type: str
    location_kind: str
    location_data: dict[str, object]


class MemoryResourceService:
    """Reads current evidence only after repository-enforced authorization."""

    def __init__(self, repository: RagRepository) -> None:
        self._repository = repository

    async def read_chunk(
        self, uri: str, span: ResourceSpan
    ) -> AuthorizedResourceSpan:
        resource = parse_canonical_resource_uri(uri)
        if (
            resource.kind is not ResourceKind.chunk
            or resource.document_id is None
            or resource.revision_id is None
            or resource.chunk_id is None
        ):
            raise InvalidArgumentError("A canonical chunk resource URI is required.")
        chunk = await self._repository.get_current_chunk(
            workspace_id=resource.workspace_id,
            document_id=resource.document_id,
            revision_id=resource.revision_id,
            chunk_id=resource.chunk_id,
        )
        if chunk.text is None:
            raise ResourceNotFoundError("Memory resource has no readable text.")
        if span.end_offset > len(chunk.text):
            raise InvalidArgumentError("Resource span exceeds chunk text bounds.")
        return AuthorizedResourceSpan(
            resource_uri=uri,
            chunk_id=chunk.chunk_id,
            text=chunk.text[span.start_offset : span.end_offset],
            start_offset=span.start_offset,
            end_offset=span.end_offset,
            content_hash=chunk.content_hash,
            source_name=chunk.source_name,
            source_type=chunk.source_type,
            location_kind=chunk.location_kind,
            location_data=chunk.location_data,
        )


def build_stable_chunk_id(identity: ChunkIdentity) -> str:
    payload = identity.model_dump(mode="json")
    payload["normalized_text"] = unicodedata.normalize(
        "NFKC", " ".join(identity.normalized_text.split())
    )
    canonical = json.dumps(
        payload, ensure_ascii=False, separators=(",", ":"), sort_keys=True
    )
    return f"chk_{sha256(canonical.encode('utf-8')).hexdigest()[:40]}"


def parse_canonical_resource_uri(uri: str) -> CanonicalResource:
    parsed = urlsplit(uri)
    if (
        parsed.scheme != "flae"
        or parsed.netloc != "workspace"
        or parsed.query
        or parsed.fragment
        or parsed.username
        or parsed.password
    ):
        raise ValueError("invalid canonical resource URI")

    segments = [unquote(segment) for segment in parsed.path.split("/") if segment]
    if not segments:
        raise ValueError("canonical resource URI is missing workspace identity")
    try:
        workspace_id = UUID(segments[0])
    except ValueError as error:
        raise ValueError("canonical resource URI has an invalid workspace ID") from error

    tail = segments[1:]
    if len(tail) == 4 and tail[0] == "documents" and tail[2] == "revisions":
        return CanonicalResource(
            workspace_id=workspace_id,
            kind=ResourceKind.revision,
            document_id=_parse_uuid(tail[1], "document"),
            revision_id=_parse_uuid(tail[3], "revision"),
        )
    if (
        len(tail) == 6
        and tail[0] == "documents"
        and tail[2] == "revisions"
        and tail[4] == "chunks"
        and _CHUNK_ID_PATTERN.fullmatch(tail[5])
    ):
        return CanonicalResource(
            workspace_id=workspace_id,
            kind=ResourceKind.chunk,
            document_id=_parse_uuid(tail[1], "document"),
            revision_id=_parse_uuid(tail[3], "revision"),
            chunk_id=tail[5],
        )

    singular_resources = {
        "assertions": ResourceKind.assertion,
        "entities": ResourceKind.entity,
        "topics": ResourceKind.topic,
        "contexts": ResourceKind.context,
    }
    if len(tail) == 2 and tail[0] in singular_resources:
        return CanonicalResource(
            workspace_id=workspace_id,
            kind=singular_resources[tail[0]],
            resource_id=_parse_uuid(tail[1], tail[0][:-1]),
        )
    raise ValueError("unsupported canonical resource URI shape")


def _parse_uuid(value: str, label: str) -> UUID:
    try:
        return UUID(value)
    except ValueError as error:
        raise ValueError(f"canonical resource URI has an invalid {label} ID") from error
