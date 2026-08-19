"""Chunk identity and stable-ID helpers for the ingestion pipeline.

Extracted from the former retrieval.resources module so that base-staging
can compute deterministic chunk identifiers without pulling in the full
evidence-first retrieval stack.
"""

from __future__ import annotations

from hashlib import sha256
import json
import re
import unicodedata
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.agent_memory import SourceLocation

_CHUNK_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]+$")


class _IdentityModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class ChunkIdentity(_IdentityModel):
    revision_id: UUID
    section_structural_key: str = Field(min_length=1, max_length=2_000)
    location: SourceLocation
    normalized_text: str = Field(min_length=1, max_length=2_000_000)
    chunker_version: str = Field(min_length=1, max_length=200)


def build_stable_chunk_id(identity: ChunkIdentity) -> str:
    """Deterministic chunk ID derived from the canonical payload."""
    payload = identity.model_dump(mode="json")
    payload["normalized_text"] = unicodedata.normalize(
        "NFKC", " ".join(identity.normalized_text.split())
    )
    canonical = json.dumps(
        payload, ensure_ascii=False, separators=(",", ":"), sort_keys=True
    )
    return f"chk_{sha256(canonical.encode('utf-8')).hexdigest()[:40]}"
