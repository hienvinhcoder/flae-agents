from uuid import uuid4

import psycopg2
import pytest
from pydantic import ValidationError
from sqlalchemy.engine import make_url

from app.core.config import settings
from app.db.rag_db import rag_db_manager
from app.services.knowledge.repositories.tenant import (
    AuthorizationContext,
    CandidateBudget,
    RagRepository,
)


def _connect_to_rag_test_database():
    url = make_url(settings.RAG_DATABASE_URL.replace("+asyncpg", "+psycopg2"))
    return psycopg2.connect(
        dbname=url.database,
        user=url.username,
        password=url.password,
        host=url.host,
        port=url.port,
    )


def _insert_chunk(
    cursor, *, workspace_id: str, subject_id: str, chunk_id: str, text: str
) -> None:
    revision_id = str(uuid4())
    source_id = str(uuid4())
    document_id = str(uuid4())
    principals = f'["{subject_id}"]'
    cursor.execute(
        """
        INSERT INTO document_revisions (
            workspace_id, revision_id, source_id, document_id,
            source_external_id, source_version_key, content_checksum,
            acl_checksum, state, base_readiness, graph_readiness,
            discovery_readiness, acl_scope, acl_principal_ids
        ) VALUES (%s, %s, %s, %s, %s, 'v1', %s, %s,
                  'searchable', 'ready', 'pending', 'pending',
                  'restricted', %s::jsonb)
        """,
        (
            workspace_id,
            revision_id,
            source_id,
            document_id,
            document_id,
            "sha256:" + "a" * 64,
            "sha256:" + "b" * 64,
            principals,
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
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, '[]'::jsonb, 'section',
                  '{"heading_path":["Repository test"]}'::jsonb, %s,
                  'parser-v2', 'chunker-v2', 'pipeline-v2', 'Repository test',
                  'manual', now(), now(), 'restricted', %s::jsonb)
        """,
        (
            workspace_id,
            chunk_id,
            text,
            document_id,
            revision_id,
            source_id,
            document_id,
            "sha256:" + "c" * 64,
            principals,
        ),
    )


@pytest.mark.asyncio
async def test_repository_applies_typed_workspace_and_source_acl_context() -> None:
    workspace_id = uuid4()
    with _connect_to_rag_test_database() as owner, owner.cursor() as cursor:
        _insert_chunk(
            cursor,
            workspace_id=str(workspace_id),
            subject_id="user-a",
            chunk_id="repo-chunk-a",
            text="Aurora rollback evidence",
        )
        _insert_chunk(
            cursor,
            workspace_id=str(workspace_id),
            subject_id="user-b",
            chunk_id="repo-chunk-b",
            text="Private Helios evidence",
        )

    repository = RagRepository(
        rag_db_manager,
        AuthorizationContext(
            workspace_id=workspace_id,
            subject_id="user-a",
            authorization_version="acl-v1",
        ),
    )

    chunks = await repository.list_current_chunks(CandidateBudget(limit=10))

    assert [chunk.chunk_id for chunk in chunks] == ["repo-chunk-a"]


def test_repository_boundaries_reject_untyped_or_unbounded_input() -> None:
    with pytest.raises(ValidationError):
        AuthorizationContext.model_validate(
            {
                "workspace_id": str(uuid4()),
                "subject_id": "user-a",
                "authorization_version": "acl-v1",
                "admin": True,
            }
        )
    with pytest.raises(ValidationError):
        CandidateBudget(limit=10_000)
