import json
import numpy as np
import pytest
import pandas as pd
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.knowalge_base.retriever_service import RetrieverService


@pytest.mark.asyncio
async def test_get_embedding():
    mock_client = MagicMock()
    mock_response = MagicMock()
    
    # Giả lập trả về embedding từ SDK google-genai
    mock_values = [0.1, 0.2, 0.3]
    mock_emb = MagicMock()
    mock_emb.values = mock_values
    mock_response.embeddings = [mock_emb]
    
    # Mock aio.models.embed_content
    mock_client.aio.models.embed_content = AsyncMock(return_value=mock_response)
    
    with patch("app.services.knowalge_base.retriever_service.genai.Client", return_value=mock_client):
        with patch("app.services.knowalge_base.retriever_service.settings") as mock_settings:
            mock_settings.GEMINI_API_KEY = "test_key"
            mock_settings.GEMINI_EMBEDDING_MODEL = "test_model"
            mock_settings.EMBEDDING_DIMENSIONS = 3
            
            emb = await RetrieverService.get_embedding("Hello test")
            assert isinstance(emb, np.ndarray)
            assert np.array_equal(emb, np.array(mock_values, dtype="float32"))
            mock_client.aio.models.embed_content.assert_called_once()


@pytest.mark.asyncio
async def test_extract_entities_from_query():
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.text = '["Apple", "Steve Jobs"]'
    mock_response.usage_metadata.total_token_count = 45
    
    mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response)
    
    with patch("app.services.knowalge_base.retriever_service.genai.Client", return_value=mock_client):
        with patch("app.services.knowalge_base.retriever_service.settings") as mock_settings:
            mock_settings.GEMINI_API_KEY = "test_key"
            mock_settings.GEMINI_LLM_MODEL = "test_llm"
            
            entities, diag = await RetrieverService._extract_entities_from_query("Ai đã thành lập Apple?")
            assert entities == ["Apple", "Steve Jobs"]
            assert diag["total_tokens"] == 45
            mock_client.aio.models.generate_content.assert_called_once()


@pytest.mark.asyncio
async def test_vector_search_sql():
    mock_session = AsyncMock()
    mock_row = MagicMock()
    
    # Giả lập trả về các row từ database
    mock_row._asdict.return_value = {
        "entity_id": "ent-1",
        "entity_name": "Apple",
        "embedding": "[0.1, 0.2, 0.3]",
        "source_chunk_ids": '["chunk-1"]'
    }
    mock_session.execute = AsyncMock(return_value=[mock_row])
    
    query_emb = np.array([0.1, 0.2, 0.3], dtype="float32")
    
    with patch("app.services.knowalge_base.retriever_service.settings") as mock_settings:
        mock_settings.EMBEDDING_DIMENSIONS = 3
        df = await RetrieverService._vector_search_sql(
            "test_ws", mock_session, "entities", query_emb, limit=5
        )
        assert not df.empty
        assert df.iloc[0]["entity_id"] == "ent-1"
        assert isinstance(df.iloc[0]["embedding"], np.ndarray)
        assert df.iloc[0]["source_chunk_ids"] == ["chunk-1"]
        mock_session.execute.assert_called_once()


@pytest.mark.asyncio
async def test_retrieve_pipeline_flow():
    """Mock toàn bộ quá trình retrieve để kiểm tra logic chấm điểm và liên kết đường dẫn."""
    workspace_id = "test-ws"
    query = "Kiểm tra retriever"
    
    # Mock embedding và entity extraction
    mock_query_emb = np.array([0.5, 0.5, 0.0], dtype="float32")
    
    # Data mock cho entities
    entities_df = pd.DataFrame([
        {
            "entity_id": "ent-apple",
            "entity_name": "Apple",
            "embedding": np.array([0.5, 0.5, 0.0], dtype="float32"),
            "source_chunk_ids": ["chunk-1"],
            "degree": 2,
            "similarity": 0.9
        },
        {
            "entity_id": "ent-iphone",
            "entity_name": "iPhone",
            "embedding": np.array([0.4, 0.6, 0.0], dtype="float32"),
            "source_chunk_ids": ["chunk-1", "chunk-2"],
            "degree": 1,
            "similarity": 0.8
        }
    ])
    
    # Data mock cho chunks
    chunks_df = pd.DataFrame([
        {
            "chunk_id": "chunk-1",
            "text": "Apple sản xuất iPhone.",
            "source_document_name": "apple_info.txt",
            "embedding": np.array([0.5, 0.4, 0.1], dtype="float32"),
            "entity_ids": ["ent-apple", "ent-iphone"],
            "similarity": 0.85
        }
    ])
    
    # Data mock cho relationships
    rels_list = [
        {
            "relation_id": "rel-1",
            "source_id": "ent-apple",
            "source_name": "Apple",
            "target_id": "ent-iphone",
            "target_name": "iPhone",
            "keywords": "manufacture",
            "description": "Apple manufactures iPhone.",
            "source_chunk_ids": ["chunk-1"],
            "frequency": 1,
            "degree": 3,
            "embedding": np.array([0.5, 0.5, 0.0], dtype="float32")
        }
    ]
    
    # Mock database session và execute
    mock_session = AsyncMock()
    
    # Mock helper functions thay vì mock database chi tiết phức tạp
    # để tránh test bị brittle với câu lệnh SQL cụ thể
    with patch.object(RetrieverService, "get_embedding", return_value=mock_query_emb):
        with patch.object(RetrieverService, "_extract_entities_from_query", return_value=(["Apple"], {})):
            with patch.object(RetrieverService, "_vector_search_sql") as mock_vector_search:
                # Trả về entities lúc đầu, sau đó chunks lúc sau
                mock_vector_search.side_effect = [entities_df, chunks_df]
                
                # Mock Beam Search
                mock_beam_paths = [["ent-apple", "ent-iphone"]]
                mock_visited_memory = {
                    "ent-apple": {"score": 0.9, "path": ["ent-apple"], "source_chunk_ids": ["chunk-1"]},
                    "ent-iphone": {"score": 0.8, "path": ["ent-apple", "ent-iphone"], "source_chunk_ids": ["chunk-1", "chunk-2"]}
                }
                
                with patch.object(RetrieverService, "_graph_pathfinding_beam_search", return_value=(mock_beam_paths, mock_visited_memory)):
                    # Mock data retrieval cho detail
                    local_entity_map = {
                        "ent-apple": {"entity_name": "Apple", "description": "Tech company", "degree": 2, "embedding": np.array([0.5, 0.5, 0.0], dtype="float32")},
                        "ent-iphone": {"entity_name": "iPhone", "description": "Smartphone", "degree": 1, "embedding": np.array([0.4, 0.6, 0.0], dtype="float32")}
                    }
                    local_edge_map = {
                        ("ent-apple", "ent-iphone"): {"relation_id": "rel-1", "keywords": "manufacture", "description": "manufacture detail", "degree": 3, "embedding": np.array([0.5, 0.5, 0.0], dtype="float32")}
                    }
                    
                    with patch.object(RetrieverService, "_fetch_local_graph_data", return_value=(local_entity_map, local_edge_map)):
                        # Mock async db manager session context
                        mock_context = AsyncMock()
                        mock_context.__aenter__.return_value = mock_session
                        
                        with patch("app.db.rag_db.rag_db_manager.get_async_session", return_value=mock_context):
                            with patch("app.services.knowalge_base.retriever_service.settings") as mock_settings:
                                mock_settings.EMBEDDING_DIMENSIONS = 3
                                mock_settings.RAG_SCORING_ENTITY_DEGREE_WEIGHT = 0.01
                                mock_settings.RAG_SCORING_RELATION_DEGREE_WEIGHT = 0.01
                                mock_settings.RAG_SCORING_SEED_DENSITY_BONUS = 0.4
                                mock_settings.RAG_SCORING_TEXT_CONFIRMATION_BONUS = 0.5
                                mock_settings.RAG_SCORING_CHUNK_ALPHA = 0.5
                                mock_settings.RAG_SCORING_STRONG_RECOMMENDATION_BONUS = 0.3
                                mock_settings.RAG_SCORING_WEAK_RECOMMENDATION_BONUS = 0.15
                                mock_settings.RAG_SCORING_TOP_REC_K = 4
                                mock_settings.RAG_RETRIEVAL_TOP_K_ORPHANS_TO_BRIDGE = 2
                                
                                results, diagnostics = await RetrieverService.retrieve(
                                    workspace_id=workspace_id,
                                    query=query,
                                    top_k_chunks=3,
                                    top_k_paths=3
                                )
                                
                                # Verify results
                                assert "top_paths" in results
                                assert "top_chunks" in results
                                assert len(results["top_paths"]) > 0
                                assert len(results["top_chunks"]) > 0
                                assert "total_time_seconds" in diagnostics
                                
                                # Check path format
                                path_0 = results["top_paths"][0]
                                assert "path_readable" in path_0
                                assert "segments" in path_0
                                assert "score" in path_0
                                assert path_0["entity_ids"] == ["ent-apple", "ent-iphone"]
                                
                                # Check chunk format
                                chunk_0 = results["top_chunks"][0]
                                assert chunk_0["id"] == "chunk-1"
                                assert chunk_0["type"] == "chunk"
                                assert chunk_0["source_document"] == "apple_info.txt"
                                assert "score" in chunk_0
