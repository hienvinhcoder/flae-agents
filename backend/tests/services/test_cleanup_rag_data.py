import pytest
import uuid
import json
from unittest.mock import AsyncMock, patch, MagicMock
import numpy as np

from app.core.config import settings
from app.db.rag_db import rag_db_manager
from app.services.knowledge_base_srv import _cleanup_rag_data

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

    # Đảm bảo partition cho workspace tồn tại
    rag_db_manager._ensure_partition(cur, workspace_id)

    # 1. Insert Chunks
    cur.execute(
        f"INSERT INTO {schema}.chunks (workspace_id, chunk_id, text, source_document_id) "
        f"VALUES (%s, %s, %s, %s), (%s, %s, %s, %s)",
        (workspace_id, chunk_delete_1, "Text delete", doc_to_delete,
         workspace_id, chunk_keep_1, "Text keep", doc_to_keep)
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
    
    with patch("app.services.knowalge_base.ingestion_service.IngestionService.generate_embeddings") as mock_gen_emb:
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
