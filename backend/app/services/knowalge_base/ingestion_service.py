"""
Ingestion pipeline cho Knowledge Base.
Port từ demo-app/examples-app (TGS-RAG) sang FLAE backend, hỗ trợ multi-tenant.
Pipeline: PDF→Markdown → Chunking → Embedding → Entity Extraction → Fusion → Save
Tất cả các hàm trong module này là sync (sử dụng trong Temporal activities).
"""
import re
import hashlib
from typing import Dict, List, Tuple
from collections import Counter

from app.core.config import settings
from app.core.logger import get_logger
from app.services.knowalge_base.parser_service import ParserService
from app.agents.shared.prompts import TUPLE_DELIMITER, COMPLETION_DELIMITER

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
            entity_name = parts[1].strip()
            entities.append({
                "entity_id": f"ent-{hashlib.md5(entity_name.encode()).hexdigest()}",
                "entity_name": entity_name,
                "entity_type": parts[2].strip(),
                "description": parts[3].strip(),
                "source_chunk_id": chunk_id,
            })
        elif parts[0].lower() == "relation" and len(parts) == 5:
            src, tgt = sorted((parts[1].strip(), parts[2].strip()))
            relations.append({
                "relation_id": f"rel-{hashlib.md5(f'{src}-{tgt}'.encode()).hexdigest()}",
                "source": src,
                "target": tgt,
                "keywords": parts[3].strip(),
                "description": parts[4].strip(),
                "source_chunk_id": chunk_id,
            })

    return entities, relations


def _merge_entities(entities: List[Dict]) -> List[Dict]:
    """Merge entities trùng tên, tính frequency."""
    grouped: dict[str, list[dict]] = {}
    for e in entities:
        grouped.setdefault(e["entity_name"], []).append(e)

    merged = []
    for name, group in grouped.items():
        main = max(group, key=lambda x: len(x["description"]))
        main["entity_type"] = Counter([e["entity_type"] for e in group]).most_common(1)[0][0]
        main["source_chunk_ids"] = list({e["source_chunk_id"] for e in group})
        main["frequency"] = len(group)
        main.pop("source_chunk_id", None)
        merged.append(main)

    return merged


def _merge_relations(relations: List[Dict]) -> List[Dict]:
    """Merge relations trùng source-target, tính frequency."""
    grouped: dict[tuple, list[dict]] = {}
    for r in relations:
        grouped.setdefault((r["source"], r["target"]), []).append(r)

    merged = []
    for key, group in grouped.items():
        main = max(group, key=lambda x: len(x["description"]))
        main["description"] = " | ".join({r["description"] for r in group})
        main["keywords"] = ", ".join({r["keywords"] for r in group})
        main["source_chunk_ids"] = list({r["source_chunk_id"] for r in group})
        main["frequency"] = len(group)
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
        """
        import pandas as pd
        from app.db.rag_db import rag_db_manager
        from typing import Any, cast

        rag_db_manager.initialize()

        # Gán source_document_id cho chunks
        for chunk in chunks:
            chunk["source_document_id"] = source_doc_id

        # Lưu chunks
        chunks_df = pd.DataFrame(chunks)
        if "embedding" in chunks_df.columns:
            # Filter chunks có embedding
            valid_chunks = chunks_df[
                chunks_df["embedding"].apply(lambda x: x is not None)
            ]
        else:
            valid_chunks = chunks_df

        chunk_count = 0
        if not valid_chunks.empty:
            # Gán entity_ids và relation_ids vào chunks
            valid_chunks = valid_chunks.copy()
            valid_chunks["entity_ids"] = [[] for _ in range(len(valid_chunks))]
            valid_chunks["relation_ids"] = [[] for _ in range(len(valid_chunks))]

            chunk_index = {
                cid: idx
                for idx, cid in enumerate(valid_chunks["chunk_id"])
            }

            for ent in entities:
                src_chunks = ent.get("source_chunk_ids", [])
                if isinstance(src_chunks, list):
                    for cid in src_chunks:
                        if cid in chunk_index:
                            idx = chunk_index[cid]
                            valid_chunks.iloc[idx]["entity_ids"].append(
                                ent["entity_id"]
                            )

            for rel in relations:
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
                workspace_id=workspace_id,
            )
            chunk_count = len(valid_chunks)

        # Lưu entities (tạo embeddings nếu cần)
        entity_count = 0
        if entities:
            entities_df = pd.DataFrame(entities)
            # Tạo entity embeddings
            texts = [
                f"{e['entity_name']}\n{e['description']}" for e in entities
            ]
            embs, _ = IngestionService.generate_embeddings(texts, "entities")
            entities_df["embedding"] = cast(Any, embs)
            entities_df["degree"] = 0

            rag_db_manager.save_df(
                entities_df, "entities", pk_col="entity_id",
                workspace_id=workspace_id,
            )
            entity_count = len(entities_df)

        # Lưu relations (tạo embeddings nếu cần)
        relation_count = 0
        if relations:
            rels_df = pd.DataFrame(relations)
            rels_df.rename(
                columns={"source": "source_name", "target": "target_name"},
                inplace=True,
            )

            # Map entity IDs
            name_to_id = {}
            if entities:
                name_to_id = {
                    e["entity_name"]: e["entity_id"] for e in entities
                }
            rels_df["source_id"] = rels_df["source_name"].map(
                lambda n: name_to_id.get(n, f"ent-{hashlib.md5(n.encode()).hexdigest()}")
            )
            rels_df["target_id"] = rels_df["target_name"].map(
                lambda n: name_to_id.get(n, f"ent-{hashlib.md5(n.encode()).hexdigest()}")
            )
            rels_df["degree"] = 0

            # Tạo relation embeddings
            texts = [
                f"{r.get('keywords', '')}\t{r.get('source_name', '')}\n"
                f"{r.get('target_name', '')}\n{r.get('description', '')}"
                for r in rels_df.to_dict("records")
            ]
            embs, _ = IngestionService.generate_embeddings(texts, "relationships")
            rels_df["embedding"] = cast(Any, embs)

            # Ensure correct columns
            rel_cols = [
                "relation_id", "source_id", "source_name",
                "target_id", "target_name", "keywords",
                "description", "source_chunk_ids", "frequency",
                "degree", "embedding",
            ]
            for col in rel_cols:
                if col not in rels_df.columns:
                    rels_df[col] = None

            rag_db_manager.save_df(
                rels_df[rel_cols], "relationships", pk_col="relation_id",
                workspace_id=workspace_id,
            )
            relation_count = len(rels_df)

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
                        all_embeddings.extend([None] * len(batch))

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
            entity_types = ["person", "organization", "location", "event", "product", "concept", "equipment", "category", "other"]

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
                    glean_max=1,
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
