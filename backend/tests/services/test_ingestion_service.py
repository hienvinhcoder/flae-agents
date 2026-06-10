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


def test_extract_entities_from_chunks_no_api_key():
    from app.services.knowalge_base.ingestion_service import IngestionService
    
    # Kiểm tra trường hợp GEMINI_API_KEY không có
    with patch("app.services.knowalge_base.ingestion_service.settings") as mock_settings:
        mock_settings.GEMINI_API_KEY = None
        
        entities, relations, tokens = IngestionService.extract_entities_from_chunks([{"text": "Hello", "chunk_id": "1"}])
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
    source_doc_name = "test_doc"

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
                source_doc_name=source_doc_name,
            )
            
            assert res["chunk_count"] == 1
            assert res["entity_count"] == 1
            assert res["relation_count"] == 1
            
            mock_db_manager.initialize.assert_called_once()
            assert mock_db_manager.save_df.call_count == 3


