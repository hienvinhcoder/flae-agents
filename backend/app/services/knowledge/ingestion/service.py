"""
Ingestion pipeline cho Knowledge Base.
Port từ demo-app/examples-app (TGS-RAG) sang FLAE backend, hỗ trợ multi-tenant.
Pipeline: PDF→Markdown → Chunking → Embedding → Entity Extraction → Fusion → Save
Tất cả các hàm trong module này là sync (sử dụng trong Temporal activities).
"""
import re
import numpy as np
from typing import Dict, List, Optional, Tuple, Any

from app.core.config import settings
from app.core.logger import get_logger
from app.core.exceptions import ExternalServiceError
from app.services.knowledge.ingestion.parser import ParserService
from app.services.knowledge.extraction.utils import update_graph_degrees
from app.services.knowledge.ingestion.helpers import (
    parse_extraction_output,
    merge_entities,
    merge_relations,
)

logger = get_logger(__name__)


# ── Ingestion Service Class ────────────────────────────────────────


class IngestionService:
    @staticmethod
    async def load_published_chunks(workspace_id: str, document_id: str) -> list[dict]:
        """Tải các chunks đã được publish để phục vụ trích xuất entity/relation."""
        import json
        from sqlalchemy import text as sql_text
        from app.db.rag_db import rag_db_manager

        rag_db_manager.initialize()
        schema = rag_db_manager.schema
        chunks = []
        async with rag_db_manager.get_async_session(workspace_id) as session:
            result = await session.execute(
                sql_text(
                    f"SELECT chunk_id, text, embedding FROM {schema}.current_chunks "
                    "WHERE workspace_id = :workspace_id AND document_id = :document_id"
                ),
                {"workspace_id": workspace_id, "document_id": document_id},
            )
            rows = result.fetchall()
            for row in rows:
                embedding = None
                if row.embedding is not None:
                    if isinstance(row.embedding, str):
                        embedding = json.loads(row.embedding)
                    else:
                        embedding = list(row.embedding)
                chunks.append({
                    "chunk_id": row.chunk_id,
                    "text": row.text,
                    "embedding": embedding,
                })
        return chunks

    @staticmethod
    def fuse_and_save(
        workspace_id: str,
        chunks: List[Dict],
        entities: List[Dict],
        relations: List[Dict],
        source_doc_id: str,
        domains: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        """
        Fusion & lưu chunks/entities/relations vào RAG database.
        Áp dụng Incremental Knowledge Fusion & LLM Summarization ở Python level.
        """
        import pandas as pd
        from app.db.rag_db import rag_db_manager
        from app.services.knowledge.extraction.fusion import run_incremental_fusion
        from typing import Any, cast
        from sqlalchemy import text

        rag_db_manager.initialize()

        # 1. Chạy Incremental Fusion để gộp & tóm tắt mô tả qua LLM
        final_entities, final_relations, summarization_tokens, touched_entity_ids = run_incremental_fusion(
            workspace_id=workspace_id,
            new_entities=entities,
            new_relations=relations,
            db_manager=rag_db_manager
        )

        # 2. Gán source_document_id cho chunks
        for chunk in chunks:
            chunk["source_document_id"] = source_doc_id

        # Lưu chunks
        chunks_df = pd.DataFrame(chunks)
        if "embedding" in chunks_df.columns:
            valid_chunks = chunks_df[
                chunks_df["embedding"].apply(lambda x: x is not None)
            ]
        else:
            valid_chunks = chunks_df

        chunk_count = 0
        if not valid_chunks.empty:
            chunk_entity_map = {cid: [] for cid in valid_chunks["chunk_id"]}
            chunk_relation_map = {cid: [] for cid in valid_chunks["chunk_id"]}

            for ent in final_entities:
                for cid in ent.get("source_chunk_ids", []) or []:
                    if cid in chunk_entity_map:
                        chunk_entity_map[cid].append(ent["entity_id"])

            for rel in final_relations:
                for cid in rel.get("source_chunk_ids", []) or []:
                    if cid in chunk_relation_map:
                        chunk_relation_map[cid].append(rel["relation_id"])

            chunk_updates = [
                {
                    "chunk_id": cid,
                    "entity_ids": list(set(chunk_entity_map[cid])),
                    "relation_ids": list(set(chunk_relation_map[cid])),
                }
                for cid in valid_chunks["chunk_id"]
            ]

            rag_db_manager.update_chunks_graph_references(
                workspace_id=workspace_id,
                chunk_updates=chunk_updates,
            )
            chunk_count = len(valid_chunks)

        # Lấy danh sách chunk_id hợp lệ từ DB và batch hiện tại để thỏa mãn RLS policy
        valid_chunk_ids = {c["chunk_id"] for c in chunks if isinstance(c.get("chunk_id"), str) and c["chunk_id"].strip()}
        try:
            with rag_db_manager.get_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        f"SELECT chunk_id FROM {rag_db_manager.schema}.chunks WHERE workspace_id = %s",
                        (workspace_id,)
                    )
                    valid_chunk_ids.update(row[0] for row in cur.fetchall())
        except Exception as e:
            logger.warning(f"Không thể query valid_chunk_ids: {e}")

        fallback_chunk = next(iter(valid_chunk_ids), None)

        # 3. Tạo vector embeddings gia tăng cho entities có embedding = None
        entity_count = 0
        sanitized_entities = []
        for e in final_entities:
            cids = [cid for cid in e.get("source_chunk_ids", []) if isinstance(cid, str) and cid in valid_chunk_ids]
            if not cids and fallback_chunk:
                cids = [fallback_chunk]
            if cids:
                e["source_chunk_ids"] = list(dict.fromkeys(cids))
                if isinstance(e.get("chunk_descriptions"), dict):
                    e["chunk_descriptions"] = {k: v for k, v in e["chunk_descriptions"].items() if k in cids}
                sanitized_entities.append(e)
        final_entities = sanitized_entities

        if final_entities:
            final_entities_df = pd.DataFrame(final_entities)

            # Chỉ tạo embeddings cho các entities mới hoặc đổi mô tả (embedding là None)
            mask = final_entities_df["embedding"].isna() | final_entities_df["embedding"].apply(lambda x: x is None or (isinstance(x, list) and len(x) == 0) or (isinstance(x, np.ndarray) and x.size == 0))
            entities_to_embed = final_entities_df[mask]

            if not entities_to_embed.empty:
                logger.info(f"Generating embeddings for {len(entities_to_embed)} new/updated entities...")
                texts = [
                    f"{e['entity_name']}\n{e['description']}"
                    for e in entities_to_embed.to_dict("records")
                ]
                embs, _ = IngestionService.generate_embeddings(texts, "entities")

                # Cập nhật embeddings
                temp_embs = dict(zip(entities_to_embed["entity_id"], embs))
                embs_list = []
                for _, row in final_entities_df.iterrows():
                    embs_list.append(temp_embs.get(row["entity_id"], row["embedding"]))
                final_entities_df["embedding"] = pd.Series(embs_list, dtype=object)

            rag_db_manager.save_df(
                final_entities_df, "entities", pk_col="entity_id",
                workspace_id=workspace_id, overwrite=True
            )
            entity_count = len(final_entities_df)

        # 4. Tạo vector embeddings gia tăng cho relationships có embedding = None
        relation_count = 0
        sanitized_relations = []
        for r in final_relations:
            cids = [cid for cid in r.get("source_chunk_ids", []) if isinstance(cid, str) and cid in valid_chunk_ids]
            if not cids and fallback_chunk:
                cids = [fallback_chunk]
            if cids:
                r["source_chunk_ids"] = list(dict.fromkeys(cids))
                if isinstance(r.get("chunk_meta"), dict):
                    r["chunk_meta"] = {k: v for k, v in r["chunk_meta"].items() if k in cids}
                sanitized_relations.append(r)
        final_relations = sanitized_relations
        if final_relations:
            rels_df = pd.DataFrame(final_relations)

            # Đảm bảo các cột đúng định dạng
            rel_cols = [
                "relation_id", "source_id", "source_name",
                "target_id", "target_name", "keywords",
                "description", "source_chunk_ids", "chunk_meta", "frequency",
                "degree", "embedding",
            ]
            for col in rel_cols:
                if col not in rels_df.columns:
                    rels_df[col] = None
            rels_df = rels_df[rel_cols]

            # Chỉ tạo embeddings cho các relationships mới/đổi mô tả
            mask = rels_df["embedding"].isna() | rels_df["embedding"].apply(lambda x: x is None or (isinstance(x, list) and len(x) == 0) or (isinstance(x, np.ndarray) and x.size == 0))
            rels_to_embed = rels_df[mask]

            if not rels_to_embed.empty:
                logger.info(f"Generating embeddings for {len(rels_to_embed)} new/updated relationships...")
                texts = [
                    f"{r.get('keywords', '')}\t{r.get('source_name', '')}\n"
                    f"{r.get('target_name', '')}\n{r.get('description', '')}"
                    for r in rels_to_embed.to_dict("records")
                ]
                embs, _ = IngestionService.generate_embeddings(texts, "relationships")

                temp_embs = dict(zip(rels_to_embed["relation_id"], embs))
                embs_list = []
                for _, row in rels_df.iterrows():
                    embs_list.append(temp_embs.get(row["relation_id"], row["embedding"]))
                rels_df["embedding"] = pd.Series(embs_list, dtype=object)

            rag_db_manager.save_df(
                rels_df, "relationships", pk_col="relation_id",
                workspace_id=workspace_id, overwrite=True
            )
            relation_count = len(rels_df)

        # 4b. Save knowledge_domains
        domain_count = 0
        if domains:
            domain_df = pd.DataFrame(domains)
            if not domain_df.empty:
                for col in ["embedding", "source_chunk_ids"]:
                    if col not in domain_df.columns:
                        domain_df[col] = None
                rag_db_manager.save_df(
                    domain_df, "knowledge_domains", pk_col="domain_id",
                    workspace_id=workspace_id, overwrite=True
                )
                domain_count = len(domain_df)

        # 5. Cập nhật Degree cho Entities và Relationships bị ảnh hưởng trong DB bằng SQL
        if touched_entity_ids:
            update_graph_degrees(rag_db_manager, workspace_id, touched_entity_ids)

        # 6. Gán và đề xuất Topics từ các chunks
        affected_topics = []
        from app.services.knowledge.discovery.topics import TopicService
        for chunk in chunks:
            cands = chunk.get("topic_candidates", [])
            assigns = chunk.get("topic_assignments", [])
            if cands or assigns:
                try:
                    topics = TopicService.resolve_topic_assignments(
                        workspace_id=workspace_id,
                        chunk_id=chunk["chunk_id"],
                        chunk_embedding=chunk.get("embedding") or [],
                        llm_assignments=assigns,
                        llm_candidates=cands,
                        doc_id=source_doc_id
                    )
                    affected_topics.extend(topics)
                except Exception as ex:
                    logger.error(f"Lỗi khi xử lý topic cho chunk {chunk.get('chunk_id')}: {ex}")

        return {
            "chunk_count": chunk_count,
            "entity_count": entity_count,
            "relation_count": relation_count,
            "domain_count": domain_count,
            "affected_topic_ids": list(set(affected_topics))
        }

    @staticmethod
    def generate_embeddings(
        texts: List[str],
        item_type: str = "chunks",
        max_retries: int = 3,
    ) -> Tuple[List[list | None], int]:
        """Tạo vector embeddings qua Google Gemini API."""
        from google import genai
        from google.genai import types
        import time

        api_key = settings.GEMINI_API_KEY
        model_name = settings.GEMINI_EMBEDDING_MODEL
        dimensions = settings.EMBEDDING_DIMENSIONS

        if not api_key:
            logger.warning("GEMINI_API_KEY not set. Skipping embeddings.")
            return [None] * len(texts), 0

        client = genai.Client(api_key=api_key)
        total_tokens = 0
        max_batch = 25
        retry_delay = 2

        cleaned_texts: list[str] = []
        original_indices: list[int] = []
        for i, t in enumerate(texts):
            if t and not t.isspace():
                cleaned_texts.append(t)
                original_indices.append(i)

        if not cleaned_texts:
            return [None] * len(texts), 0

        all_embeddings: list[list | None] = []

        for i in range(0, len(cleaned_texts), max_batch):
            batch = cleaned_texts[i : i + max_batch]

            for attempt in range(max_retries + 1):
                try:
                    config = types.EmbedContentConfig(output_dimensionality=dimensions) if dimensions else None
                    response = client.models.embed_content(model=model_name, contents=batch, config=config)

                    if not response.embeddings:
                        raise ExternalServiceError("Không thể tạo embedding cho tài liệu.")

                    batch_embs = [emb.values for emb in response.embeddings]
                    all_embeddings.extend(batch_embs)

                    # Gọi API count_tokens để lấy số lượng token thực tế và cộng dồn vào total_tokens
                    try:
                        token_count_resp = client.models.count_tokens(model=model_name, contents=batch)
                        if token_count_resp.total_tokens is not None:
                            total_tokens += token_count_resp.total_tokens
                    except Exception as token_err:
                        logger.warning(f"Không thể đếm số lượng token: {token_err}")

                    time.sleep(0.1)
                    break
                except Exception as e:
                    if attempt < max_retries:
                        logger.warning(f"Embedding batch {i // max_batch + 1} attempt {attempt + 1} failed: {e}")
                        time.sleep(retry_delay)
                    else:
                        logger.error(f"Embedding batch failed after retries: {e}")
                        raise ExternalServiceError(
                            "Không thể tạo embedding sau số lần thử cho phép."
                        ) from e

        final: list[list | None] = [None] * len(texts)
        for idx, emb in enumerate(all_embeddings):
            if idx < len(original_indices):
                final[original_indices[idx]] = emb

        return final, total_tokens

    @staticmethod
    def generate_chunk_embeddings(
        chunks: List[Dict],
    ) -> Tuple[List[Dict], int]:
        """Tạo embeddings cho chunks, gắn vào dict."""
        texts = [c["text"] for c in chunks]
        embeddings, tokens = IngestionService.generate_embeddings(texts, "chunks")
        for chunk, emb in zip(chunks, embeddings):
            chunk["embedding"] = emb
        return chunks, tokens

    @staticmethod
    async def extract_entities_from_chunks(
        chunks: List[Dict],
        workspace_id: str,
        entity_types: list[str] | None = None,
    ) -> Tuple[List[Dict], List[Dict], List[Dict], int]:
        """Trích xuất entities, relations & domains từ chunks qua LangGraph agent."""
        import asyncio
        from app.services.knowledge.extraction.agent.graph import run_extraction_agent
        from app.services.knowledge.discovery.topics import TopicService

        api_key = settings.GEMINI_API_KEY
        model_name = settings.GEMINI_LLM_MODEL

        if not api_key:
            logger.warning("GEMINI_API_KEY not set. Skipping extraction.")
            return [], [], [], 0

        if entity_types is None:
            entity_types = settings.RAG_ENTITY_TYPES

        semaphore = asyncio.Semaphore(4)
        total_tokens = 0
        all_entities: list[dict] = []
        all_relations: list[dict] = []
        all_domains: list[dict] = []

        async def process_chunk(chunk: dict) -> dict:
            nonlocal total_tokens
            async with semaphore:
                # Pre-filter topics cho chunk dựa trên vector similarity
                candidates = []
                try:
                    candidates = await TopicService.pre_filter_topics(
                        workspace_id=workspace_id,
                        chunk_embedding=chunk.get("embedding") or [],
                        text_content=chunk.get("text") or "",
                        entity_names=[]
                    )
                except Exception as ex:
                    logger.warning(f"Lỗi khi pre-filter topics cho chunk {chunk.get('chunk_id')}: {ex}")

                res, tokens = await run_extraction_agent(
                    chunk=chunk,
                    model_name=model_name,
                    api_key=api_key,
                    entity_types=entity_types,
                    candidate_topics=candidates,
                    glean_max=settings.RAG_GLEAN_MAX,
                    language="auto"
                )

                # Gắn kết quả topic assignments/candidates vào chunk để dùng ở bước fuse
                chunk["topic_assignments"] = res.get("topic_assignments", [])
                chunk["topic_candidates"] = res.get("topic_candidates", [])

                return {"res": res, "tokens": tokens}

        tasks = [process_chunk(chunk) for chunk in chunks]
        results = await asyncio.gather(*tasks)

        for result in results:
            res = result["res"]
            tokens = result["tokens"]
            total_tokens += tokens
            all_entities.extend(res.get("entities", []))
            all_relations.extend(res.get("relations", []))
            all_domains.extend(res.get("domains", []))

        # Merge duplicates
        merged_entities = merge_entities(all_entities)
        merged_relations = merge_relations(all_relations)

        logger.info(
            f"Extraction complete via LangGraph: {len(merged_entities)} entities, "
            f"{len(merged_relations)} relations, {len(all_domains)} domains, {total_tokens} tokens"
        )
        return merged_entities, merged_relations, all_domains, total_tokens
