import pytest
from unittest.mock import MagicMock, patch




def test_parse_extraction_output():
    from app.services.knowalge_base.ingestion_helpers import parse_extraction_output
    
    # Chuỗi giả định kết quả trả về từ LLM
    raw_output = (
        "entity<|#|>Apple<|#|>organization<|#|>A technology company\n"
        "relation<|#|>Apple<|#|>iPhone<|#|>creates, develops<|#|>Apple manufactures iPhone\n"
        "<|COMPLETE|>"
    )
    
    entities, relations = parse_extraction_output(raw_output, "chunk_1")
    
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
        
        entities, relations, tokens = await IngestionService.extract_entities_from_chunks([{"text": "Hello", "chunk_id": "1"}], "test-workspace-id")
        assert entities == []
        assert relations == []
        assert tokens == 0


@pytest.mark.asyncio
async def test_extract_entities_from_chunks_passes_glean_max():
    from app.services.knowalge_base.ingestion_service import IngestionService
    
    with patch("app.services.knowalge_base.ingestion_service.settings") as mock_settings, \
         patch("app.agents.extractor.graph.run_extraction_agent") as mock_run_agent:
         
        mock_settings.GEMINI_API_KEY = "fake-key"
        mock_settings.GEMINI_LLM_MODEL = "gemini-2.5-flash"
        mock_settings.RAG_GLEAN_MAX = 2
        
        mock_run_agent.return_value = ({"entities": [], "relations": []}, 100)
        
        chunks = [{"chunk_id": "chunk_1", "text": "This is chunk 1"}]
        await IngestionService.extract_entities_from_chunks(chunks, "test-workspace-id")
        
        # Verify run_extraction_agent was called with glean_max = 2
        mock_run_agent.assert_called_once()
        kwargs = mock_run_agent.call_args[1]
        assert kwargs["glean_max"] == 2


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
                ([[0.2] * 768, [0.2] * 768], 0), # entity embeddings (cho cả Apple và iPhone placeholder)
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
            assert res["entity_count"] == 2
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


def test_save_df_sql_generation_with_overwrite():
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
        # 1. Test cho bảng entities với overwrite=True
        entities_df = pd.DataFrame([
            {"entity_id": "ent_1", "entity_name": "Apple", "description": "Tech company", "source_chunk_ids": ["chunk_1"], "frequency": 1}
        ])
        
        db_manager.save_df(entities_df, "entities", pk_col="entity_id", workspace_id="test_ws", overwrite=True)
        
        # Lấy câu lệnh SQL đã gọi
        args, kwargs = mock_execute_values.call_args
        sql_query = args[1]
        
        # Verify SQL query chứa các biểu thức ghi đè trực tiếp (EXCLUDED.col)
        assert "ON CONFLICT (workspace_id, entity_id) DO UPDATE" in sql_query
        assert "description = EXCLUDED.description" in sql_query
        assert "source_chunk_ids = EXCLUDED.source_chunk_ids" in sql_query
        assert "frequency = EXCLUDED.frequency" in sql_query


def test_fuse_and_save_with_summarization():
    from app.services.knowalge_base.ingestion_service import IngestionService
    from unittest.mock import patch
    import pandas as pd
    import numpy as np

    workspace_id = "test-workspace-id"
    chunks = [
        {"chunk_id": "chunk_1", "text": "This is chunk 1", "embedding": [0.1] * 768},
    ]
    entities = [
        {"entity_id": "ent_1", "entity_name": "Apple", "description": "Tech company 1", "source_chunk_ids": ["chunk_1"]},
    ]
    relations = [
        {"relation_id": "rel_1", "source": "Apple", "target": "iPhone", "keywords": "creates", "description": "creates phone 1", "source_chunk_ids": ["chunk_1"]},
    ]
    source_doc_id = "test-doc-id"

    with patch("app.db.rag_db.rag_db_manager") as mock_db_manager:
        fused_entities = [
            {"entity_id": "ent_1", "entity_name": "Apple", "entity_type": "organization", "description": "Tech company consolidated summary", "source_chunk_ids": ["chunk_1"], "frequency": 2, "embedding": None, "degree": 0}
        ]
        fused_relations = [
            {"relation_id": "rel_1", "source_id": "ent_1", "source_name": "Apple", "target_id": "ent_2", "target_name": "iPhone", "keywords": "creates", "description": "creates phone consolidated summary", "source_chunk_ids": ["chunk_1"], "frequency": 2, "embedding": None, "degree": 0}
        ]
        
        with patch("app.services.knowalge_base.fusion_service.run_incremental_fusion", return_value=(fused_entities, fused_relations, 50, {"ent_1"})) as mock_fusion:
            with patch("app.services.knowalge_base.ingestion_service.IngestionService.generate_embeddings") as mock_gen_embeddings:
                mock_gen_embeddings.side_effect = [
                    ([[0.2] * 768], 0), # entity embeddings
                    ([[0.3] * 768], 0), # relation embeddings
                ]
                
                mock_conn = MagicMock()
                mock_cur = MagicMock()
                mock_conn.cursor.return_value = mock_cur
                mock_db_manager.get_conn.return_value = mock_conn
                
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
                
                mock_fusion.assert_called_once_with(
                    workspace_id=workspace_id,
                    new_entities=entities,
                    new_relations=relations,
                    db_manager=mock_db_manager
                )
                
                save_df_calls = mock_db_manager.save_df.call_args_list
                assert len(save_df_calls) == 3
                assert save_df_calls[0][1]["overwrite"] is True
                assert save_df_calls[1][1]["overwrite"] is True
                assert save_df_calls[2][1]["overwrite"] is True
                
                assert mock_cur.execute.call_count >= 3


def test_run_incremental_fusion_whitespace_and_meta_merge():
    from app.services.knowalge_base.fusion_service import run_incremental_fusion
    import pandas as pd
    from unittest.mock import MagicMock, patch

    workspace_id = "test-workspace-id"
    
    # 1. Dữ liệu mới trích xuất
    new_entities = [
        {"entity_id": "ent-apple", "entity_name": "Apple", "entity_type": "organization", "description": "New Apple desc", "source_chunk_ids": ["chunk_new"]}
    ]
    new_relations = [
        {
            "relation_id": "rel-apple-iphone",
            "source": "Apple",
            "target": "iPhone",
            "keywords": "creates",
            "description": "Apple creates iPhone",
            "source_chunk_ids": ["chunk_new"]
        }
    ]

    # 2. Dữ liệu cũ trong DB (có khoảng trắng thừa ở tên thực thể)
    old_entities_df = pd.DataFrame([
        {
            "workspace_id": workspace_id,
            "entity_id": "ent-apple",
            "entity_name": "Apple  ",  # có khoảng trắng thừa
            "entity_type": "organization",
            "description": "Old Apple desc",
            "source_chunk_ids": ["chunk_old"],
            "chunk_descriptions": {"chunk_old": "Old Apple desc"},
            "frequency": 1,
            "embedding": [0.1] * 768
        }
    ])

    old_relations_df = pd.DataFrame([
        {
            "workspace_id": workspace_id,
            "relation_id": "rel-apple-iphone",
            "source_name": "Apple  ",    # có khoảng trắng thừa
            "target_name": "  iPhone",   # có khoảng trắng thừa
            "keywords": "makes",
            "description": "Old Apple makes iPhone",
            "source_chunk_ids": ["chunk_old"],
            "chunk_meta": {"chunk_old": {"description": "Old Apple makes iPhone", "keywords": "makes"}},
            "frequency": 1,
            "embedding": [0.2] * 768
        }
    ])

    mock_db_manager = MagicMock()
    
    def mock_load_df(table_name, workspace_id):
        if table_name == "entities":
            return old_entities_df
        elif table_name == "relationships":
            return old_relations_df
        return pd.DataFrame()
        
    mock_db_manager.load_df.side_effect = mock_load_df

    # Mock Gemini summarization call để tránh gọi LLM thực tế
    with patch("app.services.knowalge_base.fusion_service._merge_and_summarize_group") as mock_summarize:
        mock_summarize.side_effect = [
            ("Consolidated Apple desc", 0),      # entity summary
            ("Consolidated relation desc", 0),  # relation summary
        ]
        
        final_entities, final_relations, total_tokens, touched_entity_ids = run_incremental_fusion(
            workspace_id=workspace_id,
            new_entities=new_entities,
            new_relations=new_relations,
            db_manager=mock_db_manager
        )
        
        # Kiểm tra gộp entities
        assert len(final_entities) == 2  # Gồm Apple (fused) và iPhone (placeholder mới sinh do relation cần)
        apple_ent = next(e for e in final_entities if e["entity_name"] == "Apple")
        assert apple_ent["entity_name"] == "Apple"  # Tên đã được strip sạch sẽ
        assert set(apple_ent["source_chunk_ids"]) == {"chunk_old", "chunk_new"}
        assert "chunk_old" in apple_ent["chunk_descriptions"]
        assert "chunk_new" in apple_ent["chunk_descriptions"]
        
        # Kiểm tra gộp relationships
        assert len(final_relations) == 1
        rel = final_relations[0]
        assert rel["source_name"] == "Apple"  # Tên đã được strip sạch sẽ
        assert rel["target_name"] == "iPhone"  # Tên đã được strip sạch sẽ
        assert set(rel["source_chunk_ids"]) == {"chunk_old", "chunk_new"}  # Đã gộp cả chunk cũ và mới
        assert "chunk_old" in rel["chunk_meta"]
        assert "chunk_new" in rel["chunk_meta"]


def test_fuse_and_save_with_nan_and_zero_dim_embedding():
    from app.services.knowalge_base.ingestion_service import IngestionService
    from unittest.mock import patch, MagicMock
    import numpy as np

    workspace_id = "test-workspace-id"
    chunks = [
        {"chunk_id": "chunk_1", "text": "This is chunk 1", "embedding": [0.1] * 768},
    ]
    entities = [
        {"entity_id": "ent_1", "entity_name": "Apple", "description": "Tech company 1", "source_chunk_ids": ["chunk_1"]},
    ]
    relations = [
        {"relation_id": "rel_1", "source": "Apple", "target": "iPhone", "keywords": "creates", "description": "creates phone 1", "source_chunk_ids": ["chunk_1"]},
    ]
    source_doc_id = "test-doc-id"

    with patch("app.db.rag_db.rag_db_manager") as mock_db_manager:
        fused_entities = [
            {"entity_id": "ent_1", "entity_name": "Apple", "entity_type": "organization", "description": "Tech company", "source_chunk_ids": ["chunk_1"], "frequency": 2, "embedding": np.array(np.nan), "degree": 0}
        ]
        fused_relations = [
            {"relation_id": "rel_1", "source_id": "ent_1", "source_name": "Apple", "target_id": "ent_2", "target_name": "iPhone", "keywords": "creates", "description": "creates phone", "source_chunk_ids": ["chunk_1"], "frequency": 2, "embedding": np.array(None), "degree": 0}
        ]
        
        with patch("app.services.knowalge_base.fusion_service.run_incremental_fusion", return_value=(fused_entities, fused_relations, 50, {"ent_1"})) as mock_fusion:
            with patch("app.services.knowalge_base.ingestion_service.IngestionService.generate_embeddings") as mock_gen_embeddings:
                mock_gen_embeddings.side_effect = [
                    ([[0.2] * 768], 0), # entity embeddings
                    ([[0.3] * 768], 0), # relation embeddings
                ]
                
                mock_conn = MagicMock()
                mock_cur = MagicMock()
                mock_conn.cursor.return_value = mock_cur
                mock_db_manager.get_conn.return_value = mock_conn
                
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


def test_run_incremental_fusion_case_insensitivity_and_newline():
    from app.services.knowalge_base.fusion_service import run_incremental_fusion, clean_entity_name
    import pandas as pd
    from unittest.mock import MagicMock, patch

    workspace_id = "test-workspace-id"
    
    # 1. Dữ liệu mới trích xuất
    new_entities = [
        {"entity_id": "ent-somehash1", "entity_name": "Điện toán đám mây\n", "entity_type": "concept", "description": "New cloud desc", "source_chunk_ids": ["chunk_new"]}
    ]
    new_relations = [
        {
            "relation_id": "rel-somehash",
            "source": "Điện toán đám mây\n",
            "target": "Doanh nghiệp",
            "keywords": "supports",
            "description": "Cloud supports enterprise",
            "source_chunk_ids": ["chunk_new"]
        }
    ]

    # 2. Dữ liệu cũ trong DB (có chữ viết hoa khác và không có newline)
    old_entities_df = pd.DataFrame([
        {
            "workspace_id": workspace_id,
            "entity_id": "ent-somehash2",
            "entity_name": "Điện Toán Đám Mây",
            "entity_type": "concept",
            "description": "Old cloud desc",
            "source_chunk_ids": ["chunk_old"],
            "chunk_descriptions": {"chunk_old": "Old cloud desc"},
            "frequency": 1,
            "embedding": [0.1] * 768
        }
    ])

    old_relations_df = pd.DataFrame([
        {
            "workspace_id": workspace_id,
            "relation_id": "rel-somehash",
            "source_name": "Điện Toán Đám Mây",
            "target_name": "Doanh nghiệp",
            "keywords": "helps",
            "description": "Cloud helps enterprise",
            "source_chunk_ids": ["chunk_old"],
            "chunk_meta": {"chunk_old": {"description": "Cloud helps enterprise", "keywords": "helps"}},
            "frequency": 1,
            "embedding": [0.2] * 768
        }
    ])

    mock_db_manager = MagicMock()
    
    def mock_load_df(table_name, workspace_id):
        if table_name == "entities":
            return old_entities_df
        elif table_name == "relationships":
            return old_relations_df
        return pd.DataFrame()
        
    mock_db_manager.load_df.side_effect = mock_load_df

    # Mock Gemini summarization call
    with patch("app.services.knowalge_base.fusion_service._merge_and_summarize_group") as mock_summarize:
        mock_summarize.side_effect = [
            ("Consolidated cloud desc", 0),      # entity summary
            ("Consolidated relation desc", 0),  # relation summary
        ]
        
        final_entities, final_relations, total_tokens, touched_entity_ids = run_incremental_fusion(
            workspace_id=workspace_id,
            new_entities=new_entities,
            new_relations=new_relations,
            db_manager=mock_db_manager
        )
        
        # Chỉ có Điện toán đám mây và Doanh nghiệp (placeholder mới sinh)
        assert len(final_entities) == 2
        cloud_ent = next(e for e in final_entities if clean_entity_name(e["entity_name"]).lower() == "điện toán đám mây")
        assert cloud_ent["entity_name"] == "Điện Toán Đám Mây"  # Giữ nguyên tên cũ trong DB
        assert set(cloud_ent["source_chunk_ids"]) == {"chunk_old", "chunk_new"}
        assert "chunk_old" in cloud_ent["chunk_descriptions"]
        assert "chunk_new" in cloud_ent["chunk_descriptions"]
        
        # ID của Điện toán đám mây mới và cũ khớp nhau vì dùng lower & clean name để hash
        import hashlib
        expected_eid = f"ent-{hashlib.md5('điện toán đám mây'.encode()).hexdigest()}"
        
        # Cả hai đều thuộc cùng group và sinh ra duy nhất một entity có ID nhất quán
        assert cloud_ent["entity_id"] == expected_eid or cloud_ent["entity_id"] == "ent-somehash2"
        
        # Kiểm tra gộp relationships
        assert len(final_relations) == 1
        rel = final_relations[0]
        assert clean_entity_name(rel["source_name"]).lower() == "điện toán đám mây"
        assert rel["target_name"] == "Doanh nghiệp"
        assert set(rel["source_chunk_ids"]) == {"chunk_old", "chunk_new"}


