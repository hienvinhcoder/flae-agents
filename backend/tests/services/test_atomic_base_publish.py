from datetime import UTC, datetime
from uuid import UUID, uuid4

import psycopg2
import pytest
from sqlalchemy.engine import make_url

from app.core.config import settings
from app.core.exceptions import InvalidArgumentError
from app.db.rag_db import DBManager
from app.schemas.agent_memory import SectionLocation
from app.schemas.ingestion import (
    ManifestExpectation,
    ParsedBaseChunk,
    PrepareBaseStageInput,
    PublishBaseInput,
    SourceRevisionReference,
    StageEmbeddingInput,
)
from app.services.knowalge_base.publish_service import BasePublishService
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


def _arrange_revisions() -> tuple[SourceRevisionReference, UUID]:
    workspace_id = uuid4()
    source_id = uuid4()
    document_id = uuid4()
    old_revision_id = uuid4()
    new_revision_id = uuid4()
    run_id = uuid4()
    with _connect_to_rag_test_database() as connection, connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO document_revisions (
              workspace_id, revision_id, source_id, document_id,
              source_external_id, source_version_key, content_checksum,
              acl_checksum, state, base_readiness, graph_readiness,
              discovery_readiness, acl_scope, acl_principal_ids
            ) VALUES
              (%s, %s, %s, %s, 'doc-publish', 'v1', %s, %s,
               'searchable', 'ready', 'pending', 'pending',
               'restricted', '["old-reader"]'::jsonb),
              (%s, %s, %s, %s, 'doc-publish', 'v2', %s, %s,
               'staging', 'pending', 'pending', 'pending',
               'restricted', '["new-reader"]'::jsonb)
            """,
            (
                str(workspace_id),
                str(old_revision_id),
                str(source_id),
                str(document_id),
                "sha256:" + "1" * 64,
                "sha256:" + "2" * 64,
                str(workspace_id),
                str(new_revision_id),
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
                str(new_revision_id),
                "sha256:" + "c" * 64,
            ),
        )
    source = SourceRevisionReference(
        workspace_id=workspace_id,
        source_id=source_id,
        document_id=document_id,
        revision_id=new_revision_id,
        ingestion_run_id=run_id,
        source_uri=f"gcs://{settings.GCS_BUCKET_NAME}/doc-publish.md",
        source_name="Publish test",
        source_type="gcs",
        source_modified_at=datetime(2026, 7, 29, tzinfo=UTC),
        content_checksum="sha256:" + "a" * 64,
        acl_checksum="sha256:" + "b" * 64,
        acl_scope="restricted",
        acl_principal_ids=("new-reader",),
        parser_version="markdown-v1",
        chunker_version="structure-v1",
        pipeline_version="v1",
        expected_previous_revision_id=old_revision_id,
    )
    return source, old_revision_id


async def _stage(
    manager: DBManager, source: SourceRevisionReference, *, embed: bool
) -> PublishBaseInput:
    staging = BaseStagingService(manager)
    chunks = (
        ParsedBaseChunk(
            section_structural_key="architecture/000000",
            heading_path=("Architecture",),
            location=SectionLocation(heading_path=("Architecture",)),
            text="New searchable evidence",
            token_count=3,
        ),
    )
    plan = await staging.stage_parsed_chunks(
        PrepareBaseStageInput(source=source, batch_size=20), chunks
    )
    manifests = [
        ManifestExpectation(
            stage_name="parse",
            batch_id=batch.batch_id,
            item_count=batch.item_count,
            output_checksum=batch.output_checksum,
        )
        for batch in plan.batches
    ]
    if embed:
        for batch in plan.batches:
            result = await staging.stage_embeddings(
                StageEmbeddingInput(batch=batch),
                (tuple([0.25] * 1024),),
            )
            manifests.append(
                ManifestExpectation(
                    stage_name="embed",
                    batch_id=result.batch_id,
                    item_count=result.item_count,
                    output_checksum=result.output_checksum,
                )
            )
    elif manifests:
        manifests.append(
            ManifestExpectation(
                stage_name="embed",
                batch_id=manifests[0].batch_id,
                item_count=manifests[0].item_count,
                output_checksum="sha256:" + "f" * 64,
            )
        )
    return PublishBaseInput(source=source, manifests=tuple(manifests))


@pytest.mark.asyncio
async def test_publish_is_atomic_and_retry_returns_same_result() -> None:
    source, old_revision_id = _arrange_revisions()
    manager = DBManager()
    try:
        command = await _stage(manager, source, embed=True)
        service = BasePublishService(manager)
        first = await service.publish(command)
        second = await service.publish(command)
    finally:
        await manager.close()

    assert first == second
    assert first.superseded_revision_id == old_revision_id
    assert first.chunk_count == 1
    with _connect_to_rag_test_database() as connection, connection.cursor() as cursor:
        cursor.execute(
            """SELECT revision_id, state FROM document_revisions
               WHERE workspace_id = %s ORDER BY source_version_key""",
            (str(source.workspace_id),),
        )
        assert cursor.fetchall() == [
            (str(old_revision_id), "superseded"),
            (str(source.revision_id), "searchable"),
        ]
        cursor.execute(
            "SELECT revision_id, text FROM current_chunks WHERE workspace_id = %s",
            (str(source.workspace_id),),
        )
        assert cursor.fetchone() == (
            str(source.revision_id),
            "New searchable evidence",
        )


@pytest.mark.asyncio
async def test_missing_or_mismatched_manifest_cannot_become_searchable() -> None:
    source, old_revision_id = _arrange_revisions()
    manager = DBManager()
    try:
        command = await _stage(manager, source, embed=False)
        with pytest.raises(InvalidArgumentError, match="manifest"):
            await BasePublishService(manager).publish(command)
    finally:
        await manager.close()

    with _connect_to_rag_test_database() as connection, connection.cursor() as cursor:
        cursor.execute(
            """SELECT revision_id FROM document_revisions
               WHERE workspace_id = %s AND state = 'searchable'""",
            (str(source.workspace_id),),
        )
        assert cursor.fetchone() == (str(old_revision_id),)


@pytest.mark.asyncio
async def test_failure_after_supersede_rolls_back_to_old_current(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    source, old_revision_id = _arrange_revisions()
    manager = DBManager()
    try:
        command = await _stage(manager, source, embed=True)
        service = BasePublishService(manager)

        def fail(boundary: str) -> None:
            if boundary == "old_revision_superseded":
                raise RuntimeError("injected publish failure")

        monkeypatch.setattr(service, "_after_write_boundary", fail)
        with pytest.raises(RuntimeError, match="injected publish failure"):
            await service.publish(command)
    finally:
        await manager.close()

    with _connect_to_rag_test_database() as connection, connection.cursor() as cursor:
        cursor.execute(
            """SELECT revision_id FROM document_revisions
               WHERE workspace_id = %s AND state = 'searchable'""",
            (str(source.workspace_id),),
        )
        assert cursor.fetchone() == (str(old_revision_id),)
        cursor.execute(
            """SELECT state FROM document_revisions
               WHERE workspace_id = %s AND revision_id = %s""",
            (str(source.workspace_id), str(source.revision_id)),
        )
        assert cursor.fetchone() == ("staging",)


@pytest.mark.asyncio
async def test_tombstone_removes_published_revision_visibility_immediately() -> None:
    source, _old_revision_id = _arrange_revisions()
    manager = DBManager()
    try:
        command = await _stage(manager, source, embed=True)
        service = BasePublishService(manager)
        await service.publish(command)
        assert await service.tombstone_revision(source, reason="acl_revoked")
    finally:
        await manager.close()

    with _connect_to_rag_test_database() as connection, connection.cursor() as cursor:
        cursor.execute(
            "SELECT count(*) FROM current_chunks WHERE workspace_id = %s",
            (str(source.workspace_id),),
        )
        assert cursor.fetchone() == (0,)
