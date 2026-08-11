from datetime import UTC, datetime
from uuid import uuid4

import psycopg2
import pytest
from sqlalchemy.engine import make_url

from app.core.config import settings
from app.db.rag_db import DBManager
from app.schemas.agent_memory import SectionLocation
from app.schemas.ingestion import (
    ParsedBaseChunk,
    PrepareBaseStageInput,
    SourceRevisionReference,
    StageEmbeddingInput,
)
from app.services.knowalge_base.staging_service import BaseStagingService


def _connect_to_rag_test_database():
    url = make_url(settings.RAG_DATABASE_URL.replace("+asyncpg", "+psycopg2"))
    return psycopg2.connect(
        dbname=url.database,
        user=url.username,
        password=url.password,
        host=url.host,
        port=url.port,
    )


def _source_reference() -> SourceRevisionReference:
    workspace_id = uuid4()
    source_id = uuid4()
    document_id = uuid4()
    revision_id = uuid4()
    run_id = uuid4()
    with _connect_to_rag_test_database() as connection, connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO document_revisions (
                workspace_id, revision_id, source_id, document_id,
                source_external_id, source_version_key, content_checksum,
                acl_checksum, state, base_readiness, graph_readiness,
                discovery_readiness, acl_scope, acl_principal_ids
            ) VALUES (%s, %s, %s, %s, 'doc-stage', 'v1', %s, %s,
                      'staging', 'pending', 'pending', 'pending',
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
            INSERT INTO ingestion_runs (
                workspace_id, run_id, revision_id, pipeline_version,
                input_checksum, status
            ) VALUES (%s, %s, %s, 'v1', %s, 'running')
            """,
            (
                str(workspace_id),
                str(run_id),
                str(revision_id),
                "sha256:" + "c" * 64,
            ),
        )
    return SourceRevisionReference(
        workspace_id=workspace_id,
        source_id=source_id,
        document_id=document_id,
        revision_id=revision_id,
        ingestion_run_id=run_id,
        source_uri="gcs://flae-test/doc-stage.md",
        source_name="Architecture notes",
        source_type="gcs",
        source_modified_at=datetime(2026, 7, 29, tzinfo=UTC),
        content_checksum="sha256:" + "a" * 64,
        acl_checksum="sha256:" + "b" * 64,
        acl_scope="restricted",
        acl_principal_ids=("reader-1",),
        parser_version="markdown-v1",
        chunker_version="structure-v1",
        pipeline_version="v1",
    )


def _parsed_chunks() -> tuple[ParsedBaseChunk, ...]:
    return tuple(
        ParsedBaseChunk(
            section_structural_key=f"architecture/{index}",
            heading_path=("Architecture", f"Part {index}"),
            location=SectionLocation(
                heading_path=("Architecture", f"Part {index}")
            ),
            text=f"Deterministic evidence {index}",
            token_count=3,
        )
        for index in range(3)
    )


@pytest.mark.asyncio
async def test_each_base_batch_is_idempotent_by_rows_and_checksums() -> None:
    source = _source_reference()
    manager = DBManager()
    service = BaseStagingService(manager)
    command = PrepareBaseStageInput(source=source, batch_size=2)

    try:
        first_plan = await service.stage_parsed_chunks(command, _parsed_chunks())
        second_plan = await service.stage_parsed_chunks(command, _parsed_chunks())

        assert first_plan == second_plan
        assert first_plan.chunk_count == 3
        assert [batch.item_count for batch in first_plan.batches] == [2, 1]

        first_batch = first_plan.batches[0]
        items = await service.load_embedding_batch(first_batch)
        embeddings = tuple(tuple([0.125] * 1024) for _ in items)
        embed_command = StageEmbeddingInput(batch=first_batch)

        first_result = await service.stage_embeddings(embed_command, embeddings)
        second_result = await service.stage_embeddings(embed_command, embeddings)

        assert first_result == second_result
        assert first_result.item_count == 2
        assert first_result.output_checksum.startswith("sha256:")
    finally:
        await manager.close()

    with _connect_to_rag_test_database() as connection, connection.cursor() as cursor:
        cursor.execute(
            """SELECT count(*) FROM staged_base_chunks
               WHERE workspace_id = %s AND ingestion_run_id = %s""",
            (str(source.workspace_id), str(source.ingestion_run_id)),
        )
        assert cursor.fetchone() == (3,)
        cursor.execute(
            """SELECT stage_name, count(*) FROM stage_manifests
               WHERE workspace_id = %s AND ingestion_run_id = %s
               GROUP BY stage_name ORDER BY stage_name""",
            (str(source.workspace_id), str(source.ingestion_run_id)),
        )
        assert cursor.fetchall() == [("embed", 1), ("parse", 2)]


@pytest.mark.asyncio
async def test_failure_after_stage_writes_rolls_back_without_duplicates(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    source = _source_reference()
    manager = DBManager()
    service = BaseStagingService(manager)

    def fail_after_rows(boundary: str) -> None:
        if boundary == "parsed_rows_written":
            raise RuntimeError("injected staging failure")

    try:
        monkeypatch.setattr(service, "_after_write_boundary", fail_after_rows)
        with pytest.raises(RuntimeError, match="injected staging failure"):
            await service.stage_parsed_chunks(
                PrepareBaseStageInput(source=source, batch_size=2), _parsed_chunks()
            )

        monkeypatch.setattr(service, "_after_write_boundary", lambda _boundary: None)
        plan = await service.stage_parsed_chunks(
            PrepareBaseStageInput(source=source, batch_size=2), _parsed_chunks()
        )

        assert plan.chunk_count == 3
    finally:
        await manager.close()
    with _connect_to_rag_test_database() as connection, connection.cursor() as cursor:
        cursor.execute(
            """SELECT count(*) FROM staged_base_chunks
               WHERE workspace_id = %s AND ingestion_run_id = %s""",
            (str(source.workspace_id), str(source.ingestion_run_id)),
        )
        assert cursor.fetchone() == (3,)
