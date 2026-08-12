import pytest
import uuid
import json
from unittest.mock import AsyncMock, patch, MagicMock
import numpy as np

from app.core.config import settings
from app.db.rag_db import rag_db_manager
from app.services.knowledge.ingestion.cleanup import cleanup_rag_data as _cleanup_rag_data


def _insert_revisioned_chunk(
    cur,
    *,
    schema: str,
    workspace_id: str,
    chunk_id: str,
    text: str,
    document_id: str,
    entity_ids: list[str] | None = None,
    relation_ids: list[str] | None = None,
) -> None:
    revision_id = str(uuid.uuid4())
    source_id = str(uuid.uuid4())
    cur.execute(
        f"""
        INSERT INTO {schema}.document_revisions (
            workspace_id, revision_id, source_id, document_id,
            source_external_id, source_version_key, content_checksum,
            acl_checksum, state, base_readiness, graph_readiness,
            discovery_readiness, acl_scope, acl_principal_ids
        ) VALUES (%s, %s, %s, %s, %s, 'cleanup-test-v1', %s, %s,
                  'searchable', 'ready', 'pending', 'pending',
                  'workspace', '[]'::jsonb)
        """,
        (
            workspace_id,
            revision_id,
            source_id,
            document_id,
            document_id,
            "sha256:" + uuid.uuid4().hex * 2,
            "sha256:" + uuid.uuid4().hex * 2,
        ),
    )
    cur.execute(
        f"""
        INSERT INTO {schema}.chunks (
            workspace_id, chunk_id, text, source_document_id,
            entity_ids, relation_ids, revision_id, source_id, document_id,
            heading_path, location_kind, location_data, content_hash,
            parser_version, chunker_version, pipeline_version, source_name,
            source_type, source_modified_at, ingested_at, acl_scope,
            acl_principal_ids
        ) VALUES (%s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, %s, %s,
                  '[]'::jsonb, 'section',
                  '{{"heading_path":["Cleanup test"]}}'::jsonb, %s,
                  'test-parser', 'test-chunker', 'test-pipeline',
                  'Cleanup test', 'test', now(), now(), 'workspace', '[]'::jsonb)
        """,
        (
            workspace_id,
            chunk_id,
            text,
            document_id,
            json.dumps(entity_ids or []),
            json.dumps(relation_ids or []),
            revision_id,
            source_id,
            document_id,
            "sha256:" + uuid.uuid4().hex * 2,
        ),
    )

@pytest.mark.asyncio
async def test_cleanup_rag_data_recalculate():
    workspace_id = str(uuid.uuid4())
    doc_to_delete = str(uuid.uuid4())
    doc_to_keep = str(uuid.uuid4())

    chunk_delete_1 = f"chunk_del_1"
    chunk_keep_1 = f"chunk_keep_1"

    # Giả lập database manager và connection
    rag_db_manager.initialize()
    conn = rag_db_manager.get_conn()
    conn.autocommit = True
    cur = conn.cursor()
    schema = rag_db_manager.schema

    # 1. Insert Chunks
    _insert_revisioned_chunk(
        cur,
        schema=schema,
        workspace_id=workspace_id,
        chunk_id=chunk_delete_1,
        text="Text delete",
        document_id=doc_to_delete,
    )
    _insert_revisioned_chunk(
        cur,
        schema=schema,
        workspace_id=workspace_id,
        chunk_id=chunk_keep_1,
        text="Text keep",
        document_id=doc_to_keep,
    )

    # 2. Insert Entity liên kết cả 2 chunks
    entity_id = "ent-le-thi-mai"
    chunk_descs = {
        chunk_delete_1: "Cựu CEO của Flash AI, cố vấn chiến lược.",
        chunk_keep_1: "Giám đốc Điều hành của Flash AI."
    }
    emb_dim = settings.EMBEDDING_DIMENSIONS or 768
    initial_emb = [0.1] * emb_dim

    cur.execute(
        f"INSERT INTO {schema}.entities (workspace_id, entity_id, entity_name, entity_type, description, source_chunk_ids, chunk_descriptions, frequency, embedding) "
        f"VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, %s::vector)",
        (workspace_id, entity_id, "Lê Thị Mai", "person",
         "Giám đốc và cố vấn chiến lược của Flash AI.",
         json.dumps([chunk_delete_1, chunk_keep_1]),
         json.dumps(chunk_descs),
         2,
         initial_emb)
    )

    # 3. Insert Relationship liên kết cả 2 chunks
    rel_id = "rel-le-thi-mai-flash-ai"
    chunk_meta = {
        chunk_delete_1: {
            "description": "Lê Thị Mai rời vị trí CEO tại Flash AI.",
            "keywords": "cựu CEO, rời vị trí"
        },
        chunk_keep_1: {
            "description": "Lê Thị Mai làm việc tại Flash AI.",
            "keywords": "có vai trò, làm việc tại"
        }
    }
    cur.execute(
        f"INSERT INTO {schema}.relationships (workspace_id, relation_id, source_id, source_name, target_id, target_name, keywords, description, source_chunk_ids, chunk_meta, frequency, embedding) "
        f"VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, %s::vector)",
        (workspace_id, rel_id, entity_id, "Lê Thị Mai", "ent-flash-ai", "Flash AI",
         "cựu CEO, rời vị trí, có vai trò, làm việc tại",
         "Lê Thị Mai cựu CEO và cố vấn của Flash AI.",
         json.dumps([chunk_delete_1, chunk_keep_1]),
         json.dumps(chunk_meta),
         2,
         initial_emb)
    )

    # Mock IngestionService.generate_embeddings để trả về vector giả lập mới
    new_emb = [0.9] * emb_dim

    with patch("app.services.knowledge.ingestion.service.IngestionService.generate_embeddings") as mock_gen_emb:
        mock_gen_emb.return_value = ([new_emb], 100)

        # Chạy dọn dẹp
        await _cleanup_rag_data(workspace_id, doc_to_delete)

        # Kiểm tra xem generate_embeddings có được gọi 2 lần (cho entity và relationship)
        assert mock_gen_emb.call_count == 2

    # Lấy lại Entity từ DB
    cur.execute(
        f"SELECT description, source_chunk_ids, chunk_descriptions, frequency, embedding FROM {schema}.entities "
        f"WHERE workspace_id = %s AND entity_id = %s",
        (workspace_id, entity_id)
    )
    ent_row = cur.fetchone()
    assert ent_row is not None
    desc, src_chunks_raw, chunk_descs_raw, freq, emb = ent_row

    assert desc.strip() == "Giám đốc Điều hành của Flash AI."
    assert src_chunks_raw == [chunk_keep_1]
    assert chunk_descs_raw == {chunk_keep_1: "Giám đốc Điều hành của Flash AI."}
    assert freq == 1
    assert emb is not None

    # Lấy lại Relationship từ DB
    cur.execute(
        f"SELECT description, keywords, source_chunk_ids, chunk_meta, frequency, embedding FROM {schema}.relationships "
        f"WHERE workspace_id = %s AND relation_id = %s",
        (workspace_id, rel_id)
    )
    rel_row = cur.fetchone()
    assert rel_row is not None
    r_desc, r_kws, r_chunks_raw, r_meta_raw, r_freq, r_emb = rel_row

    assert r_desc.strip() == "Lê Thị Mai làm việc tại Flash AI."
    assert "có vai trò" in r_kws
    assert "làm việc tại" in r_kws
    assert "cựu CEO" not in r_kws
    assert r_chunks_raw == [chunk_keep_1]
    assert r_meta_raw == {chunk_keep_1: {"description": "Lê Thị Mai làm việc tại Flash AI.", "keywords": "có vai trò, làm việc tại"}}
    assert r_freq == 1

    # Dọn dẹp sạch dữ liệu test
    cur.execute(f"DELETE FROM {schema}.chunks WHERE workspace_id = %s", (workspace_id,))
    cur.execute(f"DELETE FROM {schema}.entities WHERE workspace_id = %s", (workspace_id,))
    cur.execute(f"DELETE FROM {schema}.relationships WHERE workspace_id = %s", (workspace_id,))
    cur.close()
    conn.close()


@pytest.mark.asyncio
async def test_cleanup_rag_data_with_topics():
    workspace_id = str(uuid.uuid4())
    doc_to_delete = str(uuid.uuid4())
    doc_to_keep = str(uuid.uuid4())

    chunk_delete_1 = "chunk_del_topic_1"
    chunk_keep_1 = "chunk_keep_topic_1"

    rag_db_manager.initialize()
    conn = rag_db_manager.get_conn()
    conn.autocommit = True
    cur = conn.cursor()
    schema = rag_db_manager.schema

    # 1. Insert Chunks
    _insert_revisioned_chunk(
        cur,
        schema=schema,
        workspace_id=workspace_id,
        chunk_id=chunk_delete_1,
        text="Text delete",
        document_id=doc_to_delete,
        entity_ids=["ent_delete_1"],
        relation_ids=["rel_delete_1"],
    )
    _insert_revisioned_chunk(
        cur,
        schema=schema,
        workspace_id=workspace_id,
        chunk_id=chunk_keep_1,
        text="Text keep",
        document_id=doc_to_keep,
    )

    # 1.1 Insert Entity và Relationship sẽ bị xóa hoàn toàn (chỉ thuộc về chunk_delete_1)
    emb_dim = settings.EMBEDDING_DIMENSIONS or 768
    initial_emb = [0.1] * emb_dim
    cur.execute(
        f"INSERT INTO {schema}.entities (workspace_id, entity_id, entity_name, entity_type, description, source_chunk_ids, chunk_descriptions, frequency, embedding) "
        f"VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, %s::vector)",
        (workspace_id, "ent_delete_1", "Thực thể xóa", "organization", "Mô tả thực thể xóa", json.dumps([chunk_delete_1]), json.dumps({chunk_delete_1: "Mô tả thực thể xóa"}), 1, initial_emb)
    )

    cur.execute(
        f"INSERT INTO {schema}.relationships (workspace_id, relation_id, source_id, source_name, target_id, target_name, keywords, description, source_chunk_ids, chunk_meta, frequency, embedding) "
        f"VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, %s::vector)",
        (workspace_id, "rel_delete_1", "ent_delete_1", "Thực thể xóa", "ent-target", "Target", "kws", "Mối quan hệ xóa", json.dumps([chunk_delete_1]), json.dumps({chunk_delete_1: {"description": "Mối quan hệ xóa", "keywords": "kws"}}), 1, initial_emb)
    )

    # 2. Insert Topics
    topic_empty_id = "topic-empty-id"
    topic_non_empty_id = "topic-non-empty-id"
    cur.execute(
        f"INSERT INTO {schema}.topics (workspace_id, topic_id, name, slug, type, status) "
        f"VALUES (%s, %s, %s, %s, %s, %s), (%s, %s, %s, %s, %s, %s)",
        (workspace_id, topic_empty_id, "Empty Topic", "empty-topic", "topic", "active",
         workspace_id, topic_non_empty_id, "Non Empty Topic", "non-empty-topic", "topic", "active")
    )

    # 3. Insert Topic Memberships
    m_empty_del = "m-empty-del"
    m_non_empty_del = "m-non-empty-del"
    m_non_empty_keep = "m-non-empty-keep"
    m_doc_del = "m-doc-del"
    m_ent_empty = "m-ent-empty"
    m_rel_empty = "m-rel-empty"
    m_ent_non_empty = "m-ent-non-empty"

    cur.execute(
        f"INSERT INTO {schema}.topic_memberships (workspace_id, membership_id, topic_id, member_type, member_id, status) "
        f"VALUES "
        f"(%s, %s, %s, %s, %s, %s), "
        f"(%s, %s, %s, %s, %s, %s), "
        f"(%s, %s, %s, %s, %s, %s), "
        f"(%s, %s, %s, %s, %s, %s), "
        f"(%s, %s, %s, %s, %s, %s), "
        f"(%s, %s, %s, %s, %s, %s), "
        f"(%s, %s, %s, %s, %s, %s)",
        (workspace_id, m_empty_del, topic_empty_id, "chunk", chunk_delete_1, "active",
         workspace_id, m_non_empty_del, topic_non_empty_id, "chunk", chunk_delete_1, "active",
         workspace_id, m_non_empty_keep, topic_non_empty_id, "chunk", chunk_keep_1, "active",
         workspace_id, m_doc_del, topic_non_empty_id, "document", doc_to_delete, "active",
         workspace_id, m_ent_empty, topic_empty_id, "entity", "ent_delete_1", "active",
         workspace_id, m_rel_empty, topic_empty_id, "relationship", "rel_delete_1", "active",
         workspace_id, m_ent_non_empty, topic_non_empty_id, "entity", "ent_delete_1", "active")
    )

    # Mock trigger workflow của TopicService
    with patch("app.services.knowledge.discovery.topics.TopicService.trigger_topic_updates_via_temporal", new_callable=AsyncMock) as mock_trigger:
        # Chạy dọn dẹp
        await _cleanup_rag_data(workspace_id, doc_to_delete)

        # Kiểm tra xem trigger có được gọi với topic_non_empty_id không
        mock_trigger.assert_called_once_with(workspace_id, [topic_non_empty_id])

    # 4. Kiểm tra các chunks trong DB
    cur.execute(
        f"SELECT chunk_id FROM {schema}.chunks WHERE workspace_id = %s",
        (workspace_id,)
    )
    remaining_chunks = [row[0] for row in cur.fetchall()]
    assert chunk_delete_1 not in remaining_chunks
    assert chunk_keep_1 in remaining_chunks

    # 4.1 Kiểm tra entities và relationships bị xóa
    cur.execute(
        f"SELECT entity_id FROM {schema}.entities WHERE workspace_id = %s",
        (workspace_id,)
    )
    remaining_entities = [row[0] for row in cur.fetchall()]
    assert "ent_delete_1" not in remaining_entities

    cur.execute(
        f"SELECT relation_id FROM {schema}.relationships WHERE workspace_id = %s",
        (workspace_id,)
    )
    remaining_rels = [row[0] for row in cur.fetchall()]
    assert "rel_delete_1" not in remaining_rels

    # 5. Kiểm tra topic_memberships
    cur.execute(
        f"SELECT membership_id FROM {schema}.topic_memberships WHERE workspace_id = %s",
        (workspace_id,)
    )
    remaining_m_ids = [row[0] for row in cur.fetchall()]
    assert m_empty_del not in remaining_m_ids
    assert m_non_empty_del not in remaining_m_ids
    assert m_doc_del not in remaining_m_ids
    assert m_ent_empty not in remaining_m_ids
    assert m_rel_empty not in remaining_m_ids
    assert m_ent_non_empty not in remaining_m_ids  # Thực thể bị xóa, nên membership của nó cũng phải bị xóa
    assert m_non_empty_keep in remaining_m_ids

    # 6. Kiểm tra topics
    cur.execute(
        f"SELECT topic_id FROM {schema}.topics WHERE workspace_id = %s",
        (workspace_id,)
    )
    remaining_topics = [row[0] for row in cur.fetchall()]
    assert topic_empty_id not in remaining_topics  # Topic trống phải bị xóa
    assert topic_non_empty_id in remaining_topics   # Topic không trống vẫn còn

    # Dọn dẹp sạch dữ liệu test
    cur.execute(f"DELETE FROM {schema}.chunks WHERE workspace_id = %s", (workspace_id,))
    cur.execute(f"DELETE FROM {schema}.entities WHERE workspace_id = %s", (workspace_id,))
    cur.execute(f"DELETE FROM {schema}.relationships WHERE workspace_id = %s", (workspace_id,))
    cur.execute(f"DELETE FROM {schema}.topics WHERE workspace_id = %s", (workspace_id,))
    cur.execute(f"DELETE FROM {schema}.topic_memberships WHERE workspace_id = %s", (workspace_id,))
    cur.close()
    conn.close()
