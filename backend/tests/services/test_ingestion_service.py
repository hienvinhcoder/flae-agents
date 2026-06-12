import pytest
from unittest.mock import MagicMock, patch




def test_parse_extraction_output():
    from app.services.knowalge_base.ingestion_service import _parse_extraction_output
    
    # Chuỗi giả định kết quả trả về từ LLM
    raw_output = (
        "entity<|#|>Apple<|#|>organization<|#|>A technology company\n"
        "relation<|#|>Apple<|#|>iPhone<|#|>creates, develops<|#|>Apple manufactures iPhone\n"
        "<|COMPLETE|>"
    )
    
    entities, relations = _parse_extraction_output(raw_output, "chunk_1")
    
    assert len(entities) == 1
    assert entities[0]["entity_name"] == "Apple"
    assert entities[0]["entity_type"] == "organization"
    assert entities[0]["description"] == "A technology company"
    assert entities[0]["source_chunk_id"] == "chunk_1"
    
    assert len(relations) == 1
    # Do sort trong hàm, source/target sẽ được sắp xếp alphabet: Apple và iPhone -> Apple, iPhone
    assert relations[0]["source"] == "Apple"
    assert relations[0]["target"] == "iPhone"
    assert relations[0]["keywords"] == "creates, develops"
    assert relations[0]["description"] == "Apple manufactures iPhone"
    assert relations[0]["source_chunk_id"] == "chunk_1"


async def test_extract_entities_from_chunks_no_api_key():
    from app.services.knowalge_base.ingestion_service import IngestionService
    
    # Kiểm tra trường hợp GEMINI_API_KEY không có
    with patch("app.services.knowalge_base.ingestion_service.settings") as mock_settings:
        mock_settings.GEMINI_API_KEY = None
        
        entities, relations, tokens = await IngestionService.extract_entities_from_chunks([{"text": "Hello", "chunk_id": "1"}])
        assert entities == []
        assert relations == []
        assert tokens == 0


def test_fuse_and_save_success():
    from app.services.knowalge_base.ingestion_service import IngestionService
    from unittest.mock import patch

    workspace_id = "test-workspace-id"
    chunks = [
        {"chunk_id": "chunk_1", "text": "This is chunk 1", "embedding": [0.1] * 768},
    ]
    entities = [
        {"entity_id": "ent_1", "entity_name": "Apple", "description": "Tech company", "source_chunk_ids": ["chunk_1"]},
    ]
    relations = [
        {"relation_id": "rel_1", "source": "Apple", "target": "iPhone", "keywords": "creates", "description": "creates phone", "source_chunk_ids": ["chunk_1"]},
    ]
    source_doc_id = "test-doc-id"

    with patch("app.db.rag_db.rag_db_manager") as mock_db_manager:
        with patch("app.services.knowalge_base.ingestion_service.IngestionService.generate_embeddings") as mock_gen_embeddings:
            mock_gen_embeddings.side_effect = [
                ([[0.2] * 768], 0), # entity embeddings
                ([[0.3] * 768], 0), # relation embeddings
            ]
            
            res = IngestionService.fuse_and_save(
                workspace_id=workspace_id,
                chunks=chunks,
                entities=entities,
                relations=relations,
                source_doc_id=source_doc_id,
            )
            
            assert res["chunk_count"] == 1
            assert res["entity_count"] == 1
            assert res["relation_count"] == 1
            
            mock_db_manager.initialize.assert_called_once()
            assert mock_db_manager.save_df.call_count == 3


def test_save_df_sql_generation():
    import pandas as pd
    from app.db.rag_db import DBManager
    
    # Tạo mock connection và cursor
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_conn.cursor.return_value = mock_cur
    
    # Khởi tạo DBManager và patch get_conn
    db_manager = DBManager(db_url="postgresql+asyncpg://user:pass@host:5432/db", schema="public")
    db_manager.get_conn = MagicMock(return_value=mock_conn)
    db_manager.initialize = MagicMock()
    db_manager._ensure_partition = MagicMock()
    
    # Mock execute_values
    with patch("psycopg2.extras.execute_values") as mock_execute_values:
        # 1. Test cho bảng entities
        entities_df = pd.DataFrame([
            {"entity_id": "ent_1", "entity_name": "Apple", "description": "Tech company", "source_chunk_ids": ["chunk_1"], "frequency": 1}
        ])
        
        db_manager.save_df(entities_df, "entities", pk_col="entity_id", workspace_id="test_ws")
        
        # Lấy câu lệnh SQL đã gọi
        args, kwargs = mock_execute_values.call_args
        sql_query = args[1]
        
        # Verify SQL query chứa các biểu thức gộp dữ liệu
        assert "ON CONFLICT (workspace_id, entity_id) DO UPDATE" in sql_query
        assert "description = CASE WHEN length(COALESCE(EXCLUDED.description, '')) > length(COALESCE(entities.description, ''))" in sql_query
        assert "source_chunk_ids = (SELECT COALESCE(jsonb_agg(DISTINCT elem)" in sql_query
        assert "frequency = COALESCE(entities.frequency, 0) + COALESCE(EXCLUDED.frequency, 0)" in sql_query
        
        mock_execute_values.reset_mock()
        
        # 2. Test cho bảng relationships
        rels_df = pd.DataFrame([
            {"relation_id": "rel_1", "source_id": "ent_1", "target_id": "ent_2", "keywords": "creates", "description": "creates phone", "source_chunk_ids": ["chunk_1"], "frequency": 1}
        ])
        
        db_manager.save_df(rels_df, "relationships", pk_col="relation_id", workspace_id="test_ws")
        
        args, kwargs = mock_execute_values.call_args
        sql_query = args[1]
        
        # Verify SQL query chứa các biểu thức gộp dữ liệu
        assert "ON CONFLICT (workspace_id, relation_id) DO UPDATE" in sql_query
        assert "description = CASE WHEN COALESCE(relationships.description, '') = '' THEN EXCLUDED.description" in sql_query
        assert "keywords = CASE WHEN COALESCE(relationships.keywords, '') = '' THEN EXCLUDED.keywords" in sql_query
        assert "source_chunk_ids = (SELECT COALESCE(jsonb_agg(DISTINCT elem)" in sql_query
        assert "frequency = COALESCE(relationships.frequency, 0) + COALESCE(EXCLUDED.frequency, 0)" in sql_query


def test_save_df_sql_parsing_real_execute_values():
    import pandas as pd
    from app.db.rag_db import DBManager
    
    mock_conn = MagicMock()
    mock_conn.encoding = "UTF8"
    mock_cur = MagicMock()
    mock_cur.connection = mock_conn
    mock_cur.mogrify = lambda template, args: b"(mocked_values)"
    mock_conn.cursor.return_value = mock_cur
    
    db_manager = DBManager(db_url="postgresql+asyncpg://user:pass@host:5432/db", schema="public")
    db_manager.get_conn = MagicMock(return_value=mock_conn)
    db_manager.initialize = MagicMock()
    db_manager._ensure_partition = MagicMock()
    
    rels_df = pd.DataFrame([
        {"relation_id": "rel_1", "source_id": "ent_1", "target_id": "ent_2", "keywords": "creates", "description": "creates phone", "source_chunk_ids": ["chunk_1"], "frequency": 1}
    ])
    
    db_manager.save_df(rels_df, "relationships", pk_col="relation_id", workspace_id="test_ws")
    
    assert mock_cur.execute.called or mock_cur.executemany.called




