from datetime import UTC, datetime
from uuid import uuid4

import psycopg2
import pytest
from sqlalchemy.engine import make_url

from app.core.config import settings
from app.core.exceptions import ResourceNotFoundError
from app.db.rag_db import DBManager
from app.db.rag_repository import AuthorizationContext, RagRepository
from app.schemas.agent_memory import (
    CodeLocation,
    EvidenceProvenance,
    MessageLocation,
    PageLocation,
    ResourceKind,
    SectionLocation,
    SourceLocation,
)
from app.services.knowledge.retrieval.resources import (
    ChunkIdentity,
    MemoryResourceService,
    ResourceSpan,
    build_stable_chunk_id,
    parse_canonical_resource_uri,
)


@pytest.mark.parametrize(
    "location",
    [
        PageLocation(page_number=3, start_offset=10, end_offset=40),
        CodeLocation(path="src/payments.py", start_line=12, end_line=18),
        MessageLocation(
            channel_external_id="engineering",
            message_external_id="msg-42",
            message_timestamp=datetime(2026, 7, 29, tzinfo=UTC),
        ),
        SectionLocation(heading_path=("Architecture", "Rollback")),
    ],
)
def test_chunk_identity_is_stable_for_typed_structural_locations(
    location: SourceLocation,
) -> None:
    identity = ChunkIdentity(
        revision_id=uuid4(),
        section_structural_key="architecture/rollback",
        location=location,
        normalized_text="Rollback requires two approvals.",
        chunker_version="structure-v2",
    )

    assert build_stable_chunk_id(identity) == build_stable_chunk_id(identity)
    assert build_stable_chunk_id(identity).startswith("chk_")


def test_chunk_identity_changes_when_evidence_content_changes() -> None:
    identity = ChunkIdentity(
        revision_id=uuid4(),
        section_structural_key="adr/7",
        location=CodeLocation(path="docs/adr-007.md", start_line=1, end_line=8),
        normalized_text="Vendor Nova is approved.",
        chunker_version="structure-v2",
    )

    changed = identity.model_copy(
        update={"normalized_text": "Vendor Nova is not approved."}
    )

    assert build_stable_chunk_id(identity) != build_stable_chunk_id(changed)


def test_canonical_chunk_uri_round_trips_without_becoming_an_authorization_grant() -> None:
    workspace_id = uuid4()
    document_id = uuid4()
    revision_id = uuid4()
    provenance = EvidenceProvenance(
        workspace_id=workspace_id,
        source_id=uuid4(),
        document_id=document_id,
        revision_id=revision_id,
        chunk_id="chunk:adr-7",
        source_name="Architecture repository",
        source_type="github",
        location=CodeLocation(path="docs/adr-007.md", start_line=12, end_line=18),
        source_modified_at=datetime(2026, 7, 29, tzinfo=UTC),
        ingested_at=datetime(2026, 7, 29, tzinfo=UTC),
        content_hash="sha256:" + "a" * 64,
    )

    resource = parse_canonical_resource_uri(provenance.resource_uri or "")

    assert resource.workspace_id == workspace_id
    assert resource.kind is ResourceKind.chunk
    assert resource.document_id == document_id
    assert resource.revision_id == revision_id
    assert resource.chunk_id == "chunk:adr-7"


@pytest.mark.parametrize(
    "uri",
    [
        "https://example.com/workspace/secret",
        "flae://workspace/not-a-uuid/entities/entity-id",
        "flae://workspace/00000000-0000-0000-0000-000000000000/chunks/missing-revision",
        "flae://workspace/00000000-0000-0000-0000-000000000000/entities/id?token=secret",
    ],
)
def test_canonical_resource_parser_rejects_malformed_or_secret_bearing_uris(
    uri: str,
) -> None:
    with pytest.raises(ValueError):
        parse_canonical_resource_uri(uri)


def _connect_to_rag_test_database():
    url = make_url(settings.RAG_DATABASE_URL.replace("+asyncpg", "+psycopg2"))
    return psycopg2.connect(
        dbname=url.database,
        user=url.username,
        password=url.password,
        host=url.host,
        port=url.port,
    )


@pytest.mark.asyncio
async def test_authorized_resource_span_round_trips_and_acl_denies_other_subjects() -> None:
    workspace_id = uuid4()
    source_id = uuid4()
    document_id = uuid4()
    revision_id = uuid4()
    chunk_id = "chunk-resource-read"
    text = "The rollback plan requires two approvals."
    with _connect_to_rag_test_database() as connection, connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO document_revisions (
              workspace_id, revision_id, source_id, document_id,
              source_external_id, source_version_key, content_checksum,
              acl_checksum, state, base_readiness, graph_readiness,
              discovery_readiness, acl_scope, acl_principal_ids
            ) VALUES (%s, %s, %s, %s, 'resource-doc', 'v1', %s, %s,
                      'searchable', 'ready', 'pending', 'pending',
                      'restricted', '["reader-1"]'::jsonb)
            """,
            (
                str(workspace_id),
                str(revision_id),
                str(source_id),
                str(document_id),
                "sha256:" + "a" * 64,
                "sha256:" + "b" * 64,
            ),
        )
        cursor.execute(
            """
            INSERT INTO chunks (
              workspace_id, chunk_id, text, source_document_id,
              revision_id, source_id, document_id, heading_path, location_kind,
              location_data, content_hash, parser_version, chunker_version,
              pipeline_version, source_name, source_type, source_modified_at,
              ingested_at, acl_scope, acl_principal_ids
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, '["Architecture"]'::jsonb,
                      'section', '{"heading_path":["Architecture"]}'::jsonb,
                      %s, 'markdown-v2', 'structure-v2', 'pipeline-v2',
                      'Architecture notes', 'gcs', now(), now(),
                      'restricted', '["reader-1"]'::jsonb)
            """,
            (
                str(workspace_id),
                chunk_id,
                text,
                str(document_id),
                str(revision_id),
                str(source_id),
                str(document_id),
                "sha256:" + "c" * 64,
            ),
        )
    uri = (
        f"flae://workspace/{workspace_id}/documents/{document_id}"
        f"/revisions/{revision_id}/chunks/{chunk_id}"
    )
    manager = DBManager()
    try:
        allowed = MemoryResourceService(
            RagRepository(
                manager,
                AuthorizationContext(
                    workspace_id=workspace_id,
                    subject_id="reader-1",
                    authorization_version="acl-v1",
                ),
            )
        )
        result = await allowed.read_chunk(uri, ResourceSpan(start_offset=4, end_offset=17))
        assert result.text == text[4:17]
        assert result.resource_uri == uri

        denied = MemoryResourceService(
            RagRepository(
                manager,
                AuthorizationContext(
                    workspace_id=workspace_id,
                    subject_id="reader-2",
                    authorization_version="acl-v1",
                ),
            )
        )
        with pytest.raises(ResourceNotFoundError):
            await denied.read_chunk(uri, ResourceSpan(start_offset=0, end_offset=3))
    finally:
        await manager.close()
