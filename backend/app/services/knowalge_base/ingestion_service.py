"""
Ingestion pipeline cho Knowledge Base.
Port từ demo-app/examples-app (TGS-RAG) sang FLAE backend, hỗ trợ multi-tenant.
Pipeline: PDF→Markdown → Chunking → Embedding → Entity Extraction → Fusion → Save
Tất cả các hàm trong module này là sync (sử dụng trong Temporal activities).
"""
import re
import numpy as np
from typing import Dict, List, Tuple
from collections import Counter

from app.core.config import settings
from app.core.logger import get_logger
from app.services.knowalge_base.parser_service import ParserService
from app.agents.shared.prompts import TUPLE_DELIMITER, COMPLETION_DELIMITER
from app.utils import clean_entity_name
from app.services.knowalge_base.utils import get_entity_id, get_relation_id, update_graph_degrees

logger = get_logger(__name__)


# ── Private helper functions (Module-level) ───────────────────────


def _parse_extraction_output(
    raw_text: str, chunk_id: str
) -> Tuple[List[Dict], List[Dict]]:
    """Parse LLM output thành entities và relations."""
    entities: list[dict] = []
    relations: list[dict] = []

    lines = [line.strip() for line in raw_text.split(COMPLETION_DELIMITER)[0].split("\n") if line.strip()]

    for line in lines:
        parts = line.split(TUPLE_DELIMITER)
        if parts[0].lower() == "entity" and len(parts) == 4:
            entity_name = clean_entity_name(parts[1])
            entities.append({
                "entity_id": get_entity_id(entity_name),
                "entity_name": entity_name,
                "entity_type": clean_entity_name(parts[2]),
                "description": parts[3].strip(),
                "source_chunk_id": chunk_id,
            })
        elif parts[0].lower() == "relation" and len(parts) == 5:
            src = clean_entity_name(parts[1])
            tgt = clean_entity_name(parts[2])
            source, target = sorted((src, tgt))
            relations.append({
                "relation_id": get_relation_id(src, tgt),
                "source": source,
                "target": target,
                "keywords": parts[3].strip(),
                "description": parts[4].strip(),
                "source_chunk_id": chunk_id,
            })

    return entities, relations


def _merge_entities(entities: List[Dict]) -> List[Dict]:
    """Merge entities trùng tên, tính frequency."""
    grouped: dict[str, list[dict]] = {}
    for e in entities:
        norm_name = clean_entity_name(e["entity_name"]).lower()
        grouped.setdefault(norm_name, []).append(e)

    merged = []
    for norm_name, group in grouped.items():
        main = max(group, key=lambda x: len(x["description"]))
        main = main.copy()
        main["entity_name"] = clean_entity_name(main["entity_name"])
        main["entity_id"] = get_entity_id(norm_name)
        main["entity_type"] = Counter([e["entity_type"] for e in group]).most_common(1)[0][0]
        main["source_chunk_ids"] = list({e["source_chunk_id"] for e in group})
        main["frequency"] = len(group)
        main["chunk_descriptions"] = {
            e["source_chunk_id"]: e["description"] 
            for e in group if e.get("source_chunk_id")
        }
        main.pop("source_chunk_id", None)
        merged.append(main)

    return merged


def _merge_relations(relations: List[Dict]) -> List[Dict]:
    """Merge relations trùng source-target, tính frequency."""
    grouped: dict[tuple, list[dict]] = {}
    for r in relations:
        src_norm = clean_entity_name(r["source"]).lower()
        tgt_norm = clean_entity_name(r["target"]).lower()
        key = tuple(sorted((src_norm, tgt_norm)))
        grouped.setdefault(key, []).append(r)

    merged = []
    for key, group in grouped.items():
        main = max(group, key=lambda x: len(x["description"]))
        main = main.copy()
        main["source"] = clean_entity_name(main["source"])
        main["target"] = clean_entity_name(main["target"])
        main["relation_id"] = get_relation_id(key[0], key[1])
        main["description"] = " | ".join({r["description"] for r in group})
        main["keywords"] = ", ".join({r["keywords"] for r in group})
        main["source_chunk_ids"] = list({r["source_chunk_id"] for r in group})
        main["frequency"] = len(group)
        main["chunk_meta"] = {
            r["source_chunk_id"]: {
                "description": r["description"],
                "keywords": r["keywords"]
            } for r in group if r.get("source_chunk_id")
        }
        main.pop("source_chunk_id", None)
        merged.append(main)

    return merged


# ── Ingestion Service Class ────────────────────────────────────────


class IngestionService:
    @staticmethod
    def fuse_and_save(
        workspace_id: str,
        chunks: List[Dict],
        entities: List[Dict],
        relations: List[Dict],
        source_doc_id: str,
    ) -> Dict[str, int]:
        """
        Fusion & lưu chunks/entities/relations vào RAG database.
        Áp dụng Incremental Knowledge Fusion & LLM Summarization ở Python level.
        """
        import pandas as pd
        from app.db.rag_db import rag_db_manager
        from app.services.knowalge_base.fusion_service import run_incremental_fusion
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
            valid_chunks = valid_chunks.copy()
            valid_chunks["entity_ids"] = [[] for _ in range(len(valid_chunks))]
            valid_chunks["relation_ids"] = [[] for _ in range(len(valid_chunks))]

            chunk_index = {
                cid: idx
                for idx, cid in enumerate(valid_chunks["chunk_id"])
            }

            for ent in final_entities:
                src_chunks = ent.get("source_chunk_ids", [])
                if isinstance(src_chunks, list):
                    for cid in src_chunks:
                        if cid in chunk_index:
                            idx = chunk_index[cid]
                            valid_chunks.iloc[idx]["entity_ids"].append(
                                ent["entity_id"]
                            )

            for rel in final_relations:
                src_chunks = rel.get("source_chunk_ids", [])
                if isinstance(src_chunks, list):
                    for cid in src_chunks:
                        if cid in chunk_index:
                            idx = chunk_index[cid]
                            valid_chunks.iloc[idx]["relation_ids"].append(
                                rel["relation_id"]
                            )

            rag_db_manager.save_df(
                valid_chunks, "chunks", pk_col="chunk_id",
                workspace_id=workspace_id, overwrite=True
            )
            chunk_count = len(valid_chunks)

        # 3. Tạo vector embeddings gia tăng cho entities có embedding = None
        entity_count = 0
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

        # 5. Cập nhật Degree cho Entities và Relationships bị ảnh hưởng trong DB bằng SQL
        if touched_entity_ids:
            update_graph_degrees(rag_db_manager, workspace_id, touched_entity_ids)

        return {
            "chunk_count": chunk_count,
            "entity_count": entity_count,
            "relation_count": relation_count,
        }

    @staticmethod
    def generate_embeddings(
        texts: List[str],
        item_type: str = "chunks",
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
        max_retries = 3
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
                        raise ValueError("Gemini API response did not return any embeddings.")

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
                        raise RuntimeError(f"Failed to generate embeddings after {max_retries} retries: {e}")

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
        entity_types: list[str] | None = None,
    ) -> Tuple[List[Dict], List[Dict], int]:
        """Trích xuất entities & relations từ chunks qua LangGraph agent."""
        import asyncio
        from app.agents.extractor.graph import run_extraction_agent

        api_key = settings.GEMINI_API_KEY
        model_name = settings.GEMINI_LLM_MODEL

        if not api_key:
            logger.warning("GEMINI_API_KEY not set. Skipping extraction.")
            return [], [], 0

        if entity_types is None:
            entity_types = settings.RAG_ENTITY_TYPES

        semaphore = asyncio.Semaphore(4)
        total_tokens = 0
        all_entities: list[dict] = []
        all_relations: list[dict] = []

        async def process_chunk(chunk: dict) -> dict:
            nonlocal total_tokens
            async with semaphore:
                res, tokens = await run_extraction_agent(
                    chunk=chunk,
                    model_name=model_name,
                    api_key=api_key,
                    entity_types=entity_types,
                    glean_max=settings.RAG_GLEAN_MAX,
                    language="auto"
                )
                return {"res": res, "tokens": tokens}

        tasks = [process_chunk(chunk) for chunk in chunks]
        results = await asyncio.gather(*tasks)

        for result in results:
            res = result["res"]
            tokens = result["tokens"]
            total_tokens += tokens
            all_entities.extend(res.get("entities", []))
            all_relations.extend(res.get("relations", []))

        # Merge duplicates
        merged_entities = _merge_entities(all_entities)
        merged_relations = _merge_relations(all_relations)

        logger.info(
            f"Extraction complete via LangGraph: {len(merged_entities)} entities, "
            f"{len(merged_relations)} relations, {total_tokens} tokens"
        )
        return merged_entities, merged_relations, total_tokens
