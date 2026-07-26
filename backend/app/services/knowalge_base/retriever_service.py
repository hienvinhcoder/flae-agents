import json
import time
from collections import Counter, defaultdict
from typing import Dict, List, Tuple, Any, Set

import numpy as np
import pandas as pd
from google import genai
from google.genai import types
from sqlalchemy import text

from app.core.config import settings
from app.core.logger import get_logger
from app.db.rag_db import rag_db_manager
from app.services.knowalge_base.prompts import QUERY_ENTITY_EXTRACTION
from app.services.knowalge_base.retriever_helpers import (
    get_canonical_path_key,
    filter_redundant_paths,
    score_paths_component_based,
    score_chunks,
    get_item_details,
    get_path_details,
)
from app.services.knowalge_base.utils import parse_db_row

logger = get_logger(__name__)


class RetrieverService:
    """
    Retriever Service cho Knowledge Base (RAG) sử dụng tìm kiếm Hybrid.
    Kết hợp Vector Search trên chunks văn bản và Graph RAG qua Beam Search trên các thực thể.
    """

    @staticmethod
    async def get_embedding(text_val: str) -> np.ndarray:
        """Tạo vector embedding cho một đoạn văn bản bất đồng bộ."""
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        config_params = {}
        if settings.EMBEDDING_DIMENSIONS:
            config_params["output_dimensionality"] = settings.EMBEDDING_DIMENSIONS

        response = await client.aio.models.embed_content(
            model=settings.GEMINI_EMBEDDING_MODEL,
            contents=text_val,
        )
        if not response.embeddings:
            raise ValueError("Không nhận được embeddings từ Gemini API.")
        return np.array(response.embeddings[0].values).astype("float32")

    @staticmethod
    async def _extract_entities_from_query(query: str) -> Tuple[List[str], Dict[str, Any]]:
        """Trích xuất danh sách thực thể hạt giống từ câu truy vấn qua LLM."""
        prompt = QUERY_ENTITY_EXTRACTION.format(query=query)
        try:
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            response = await client.aio.models.generate_content(
                model=settings.GEMINI_LLM_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    max_output_tokens=1000,
                ),
            )
            resp_text = response.text or "[]"
            entities = json.loads(resp_text)
            tokens_used = 0
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                tokens_used = response.usage_metadata.total_token_count

            return entities, {"entities": entities, "total_tokens": tokens_used}
        except Exception as e:
            logger.error(f"Lỗi trích xuất thực thể từ câu truy vấn: {e}")
            return [], {"entities": [], "error": str(e)}

    @staticmethod
    async def _vector_search_sql(
        workspace_id: str, session, table_name: str, query_embedding: np.ndarray, limit: int
    ) -> pd.DataFrame:
        """Thực hiện tìm kiếm vector similarity trên PostgreSQL."""
        schema = rag_db_manager.schema
        sql = text(f"""
            SELECT *, 1 - (embedding <=> :emb::vector) as similarity
            FROM {schema}.{table_name}
            WHERE workspace_id = :workspace_id
            ORDER BY embedding <=> :emb::vector
            LIMIT :limit
        """)

        emb_str = str(query_embedding.tolist()) if query_embedding is not None else None
        result = await session.execute(
            sql, {"emb": emb_str, "limit": limit, "workspace_id": workspace_id}
        )

        rows = [parse_db_row(r._asdict()) for r in result]
        return pd.DataFrame(rows)

    @staticmethod
    async def _graph_pathfinding_beam_search(
        workspace_id: str, session, seed_entity_ids: Set[str], query_embedding: np.ndarray
    ) -> Tuple[List[List[str]], Dict[str, Dict[str, Any]]]:
        """Thuật toán Beam Search trên đồ thị tri thức để tìm các đường đi liên quan."""
        if not seed_entity_ids:
            return [], {}

        schema = rag_db_manager.schema
        visited_memory = {}
        query_norm = np.linalg.norm(query_embedding) + 1e-10
        current_beams: List[Dict[str, Any]] = []

        for seed in seed_entity_ids:
            current_beams.append({"path": [seed], "score": 1.0})
            visited_memory[seed] = {"score": 1.0, "path": [seed], "source_chunk_ids": []}

        final_completed_paths = []
        bfs_depth = settings.RAG_RETRIEVAL_BFS_DEPTH
        beam_width = settings.RAG_RETRIEVAL_BEAM_WIDTH
        max_neighbors = settings.RAG_RETRIEVAL_MAX_NEIGHBORS

        for _ in range(bfs_depth):
            if not current_beams:
                break

            frontier_ids = list(set([b["path"][-1] for b in current_beams]))
            if not frontier_ids:
                break

            quoted_ids = [f"'{fid}'" for fid in frontier_ids]
            ids_sql = f"ARRAY[{', '.join(quoted_ids)}]::TEXT[]"

            sql_neighbors = text(f"""
                SELECT t.fid as parent_id,
                       CASE WHEN r.source_id = t.fid THEN r.target_id ELSE r.source_id END as neighbor_id,
                       e.embedding,
                       e.source_chunk_ids
                FROM (SELECT unnest({ids_sql}) as fid) t
                JOIN LATERAL (
                    SELECT source_id, target_id
                    FROM {schema}.relationships
                    WHERE (source_id = t.fid OR target_id = t.fid) AND workspace_id = :workspace_id
                    ORDER BY frequency DESC
                    LIMIT :max_neighbors
                ) r ON true
                JOIN {schema}.entities e ON e.entity_id = (CASE WHEN r.source_id = t.fid THEN r.target_id ELSE r.source_id END) AND e.workspace_id = :workspace_id
            """)

            neighbors_map = defaultdict(list)
            try:
                result = await session.execute(
                    sql_neighbors, {"max_neighbors": max_neighbors, "workspace_id": workspace_id}
                )
                for row in result:
                    parent_id, neighbor_id, emb_val, chunk_ids_val = row[0], row[1], row[2], row[3]

                    if isinstance(emb_val, str):
                        emb = np.array(json.loads(emb_val))
                    elif emb_val is not None:
                        emb = np.array(emb_val)
                    else:
                        emb = None

                    chunk_ids = []
                    if isinstance(chunk_ids_val, list):
                        chunk_ids = chunk_ids_val
                    elif isinstance(chunk_ids_val, str):
                        try:
                            chunk_ids = json.loads(chunk_ids_val)
                        except Exception:
                            pass

                    neighbors_map[parent_id].append(
                        {"id": neighbor_id, "embedding": emb, "chunk_ids": chunk_ids}
                    )
            except Exception as e:
                logger.error(f"Lỗi SQL khi chạy Beam search: {e}")
                break

            candidates = []
            for beam in current_beams:
                parent = beam["path"][-1]
                path_so_far: List[str] = beam["path"]

                if parent not in neighbors_map:
                    continue

                for neighbor in neighbors_map[parent]:
                    n_id = neighbor["id"]
                    if n_id in path_so_far:
                        continue

                    n_emb = neighbor["embedding"]
                    if n_emb is None:
                        sim = 0.0
                    else:
                        n_norm = np.linalg.norm(n_emb) + 1e-10
                        sim = float(np.dot(query_embedding, n_emb) / (query_norm * n_norm))

                    new_path = path_so_far + [n_id]
                    if n_id not in visited_memory:
                        visited_memory[n_id] = {
                            "score": sim,
                            "path": new_path,
                            "source_chunk_ids": neighbor["chunk_ids"],
                        }
                    elif sim > visited_memory[n_id]["score"]:
                        visited_memory[n_id]["score"] = sim
                        visited_memory[n_id]["path"] = new_path

                    candidates.append((new_path, sim))

            if not candidates:
                break

            candidates.sort(key=lambda x: x[1], reverse=True)
            top_candidates = candidates[:beam_width]

            current_beams = [{"path": c[0], "score": c[1]} for c in top_candidates]
            final_completed_paths.extend([c[0] for c in top_candidates])

        return final_completed_paths, visited_memory

    @staticmethod
    async def _fetch_local_graph_data(
        workspace_id: str, session, entity_ids: Set[str]
    ) -> Tuple[Dict[str, Any], Dict[Tuple[str, str], Any]]:
        """Lấy thông tin chi tiết thực thể và quan hệ thuộc tập node truyền vào."""
        if not entity_ids:
            empty_entities: Dict[str, Any] = {}
            empty_edges: Dict[Tuple[str, str], Any] = {}
            return empty_entities, empty_edges

        schema = rag_db_manager.schema
        quoted_ids = [f"'{eid}'" for eid in entity_ids]
        ids_sql = f"({', '.join(quoted_ids)})"

        entities_sql = text(f"""
            SELECT * FROM {schema}.entities
            WHERE entity_id IN {ids_sql} AND workspace_id = :workspace_id
        """)
        entities_result = await session.execute(entities_sql, {"workspace_id": workspace_id})

        entities_rows = [parse_db_row(row._asdict(), ["source_chunk_ids"]) for row in entities_result]
        entities_df = pd.DataFrame(entities_rows)
        local_entity_map: Dict[str, Any] = (
            {str(k): v for k, v in entities_df.set_index("entity_id").to_dict("index").items()}
            if not entities_df.empty
            else {}
        )

        rels_sql = text(f"""
            SELECT * FROM {schema}.relationships
            WHERE source_id IN {ids_sql} AND target_id IN {ids_sql} AND workspace_id = :workspace_id
        """)
        rels_result = await session.execute(rels_sql, {"workspace_id": workspace_id})

        rels_rows = [parse_db_row(row._asdict(), ["source_chunk_ids"]) for row in rels_result]
        rels_df = pd.DataFrame(rels_rows)
        local_edge_map: Dict[Tuple[str, str], Any] = {}
        if not rels_df.empty:
            for _, row in rels_df.iterrows():
                sorted_nodes = sorted((str(row["source_id"]), str(row["target_id"])))
                edge_key: Tuple[str, str] = (sorted_nodes[0], sorted_nodes[1])
                local_edge_map[edge_key] = row.to_dict()

        return local_entity_map, local_edge_map

    @classmethod
    async def retrieve(
        cls, workspace_id: str, query: str, top_k_chunks: int = 5, top_k_paths: int = 10
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Thực thi quy trình truy xuất Hybrid RAG.
        Tìm kiếm chunks bằng vector search, tìm paths bằng Graph RAG Beam Search, và kết hợp.
        """
        diagnostics: Dict[str, Any] = {}
        total_start = time.time()

        # 1. Trích xuất embedding cho query
        query_embedding = await cls.get_embedding(query)

        # 2. Trích xuất thực thể hạt giống qua LLM
        extracted_entities, ext_diag = await cls._extract_entities_from_query(query)
        diagnostics["llm_extraction"] = ext_diag

        search_targets = extracted_entities if extracted_entities else [query]

        # 3. Tìm hạt giống
        seed_entities_dict = {}
        async with rag_db_manager.get_async_session(workspace_id) as session:
            for target in search_targets:
                target_emb = query_embedding if target == query else await cls.get_embedding(target)
                df_seeds = await cls._vector_search_sql(
                    workspace_id, session, "entities", target_emb, limit=settings.RAG_RETRIEVAL_TOP_P
                )

                for _, row in df_seeds.iterrows():
                    eid = row["entity_id"]
                    score = row["similarity"]
                    if eid not in seed_entities_dict or score > seed_entities_dict[eid]["score"]:
                        origin = "initial_entity" if target != query else "query_fallback"
                        seed_entities_dict[eid] = {"id": eid, "score": score, "origin": origin}

            seed_entity_ids = set(seed_entities_dict.keys())

            # 4. Tìm kiếm đường đi qua Beam Search trên Đồ thị
            initial_paths, visited_memory = await cls._graph_pathfinding_beam_search(
                workspace_id, session, seed_entity_ids, query_embedding
            )

            if not initial_paths and seed_entity_ids:
                initial_paths = [[seed_id] for seed_id in seed_entity_ids]
                for seed in seed_entity_ids:
                    if seed not in visited_memory:
                        visited_memory[seed] = {"score": 1.0, "path": [seed], "source_chunk_ids": []}

            # 5. Truy xuất văn bản qua Vector Search trên chunks
            df_chunks = await cls._vector_search_sql(
                workspace_id, session, "chunks", query_embedding, limit=top_k_chunks * 2
            )
            initial_chunk_ids = set(df_chunks["chunk_id"].tolist()) if not df_chunks.empty else set()
            local_chunk_map = (
                df_chunks.set_index("chunk_id").to_dict("index") if not df_chunks.empty else {}
            )

            # 6. Chấm điểm paths đồ thị tri thức
            all_path_node_ids = {eid for p in initial_paths for eid in p}
            local_entity_map, local_edge_map = await cls._fetch_local_graph_data(
                workspace_id, session, all_path_node_ids
            )

            scored_paths = score_paths_component_based(
                initial_paths, query_embedding, seed_entity_ids, local_entity_map, local_edge_map
            )

            entities_from_chunks = set()
            for cid in initial_chunk_ids:
                if cid in local_chunk_map and (ents := local_chunk_map[cid].get("entity_ids")):
                    entities_from_chunks.update(ents)

            text_bonus = settings.RAG_SCORING_TEXT_CONFIRMATION_BONUS
            for p_info in scored_paths:
                overlap = len(set(p_info["path"]).intersection(entities_from_chunks))
                if overlap > 0:
                    p_info["score"] += text_bonus * overlap
                    p_info["reason"] += f" + TextConfirm({overlap})"

            # 8. Bắc cầu (Bridge Orphans)
            entities_from_paths = {eid for p_info in scored_paths for eid in p_info["path"]}
            orphan_entities = entities_from_chunks - entities_from_paths
            bridged_path_objects = []

            if orphan_entities and visited_memory:
                found_bridges = 0
                max_bridges = settings.RAG_RETRIEVAL_TOP_K_ORPHANS_TO_BRIDGE
                for orphan in orphan_entities:
                    if orphan in visited_memory:
                        mem_record = visited_memory[orphan]
                        bridge_path = mem_record["path"]
                        if len(bridge_path) > 1:
                            bridged_path_objects.append(
                                {"path": bridge_path, "score": mem_record["score"]}
                            )
                            found_bridges += 1
                            if found_bridges >= max_bridges * 2:
                                break

                if bridged_path_objects:
                    new_bridge_nodes = {eid for p in bridged_path_objects for eid in p["path"]}
                    bridge_ent_map, bridge_edge_map = await cls._fetch_local_graph_data(
                        workspace_id, session, new_bridge_nodes
                    )
                    local_entity_map.update(bridge_ent_map)
                    local_edge_map.update(bridge_edge_map)

                    raw_bridge_paths = [p["path"] for p in bridged_path_objects]
                    scored_bridged_paths = score_paths_component_based(
                        raw_bridge_paths,
                        query_embedding,
                        seed_entity_ids,
                        local_entity_map,
                        local_edge_map,
                    )
                    for p_info in scored_bridged_paths:
                        p_info["reason"] = "Bridged Path (Visited Check)"
                    bridged_path_objects = scored_bridged_paths

            # 9. Tải chunks đề xuất thêm từ đồ thị
            chunk_recs_from_graph = Counter()
            for record in visited_memory.values():
                chunks = record.get("source_chunk_ids", [])
                if chunks:
                    chunk_recs_from_graph.update(chunks)

            graph_only_recs = {
                cid: count
                for cid, count in chunk_recs_from_graph.items()
                if cid not in initial_chunk_ids
            }
            top_recs = sorted(graph_only_recs.items(), key=lambda x: x[1], reverse=True)[
                :settings.RAG_SCORING_TOP_REC_K
            ]
            extra_chunk_ids = {cid for cid, count in top_recs}

            if extra_chunk_ids:
                quoted_extra = [f"'{cid}'" for cid in extra_chunk_ids]
                schema = rag_db_manager.schema
                sql_extra = text(f"""
                    SELECT * FROM {schema}.chunks
                    WHERE chunk_id IN ({', '.join(quoted_extra)}) AND workspace_id = :workspace_id
                """)
                extra_result = await session.execute(sql_extra, {"workspace_id": workspace_id})
                extra_rows = [parse_db_row(row._asdict()) for row in extra_result]
                df_extra = pd.DataFrame(extra_rows)
                if not df_extra.empty:
                    extra_map = df_extra.set_index("chunk_id").to_dict("index")
                    local_chunk_map.update(extra_map)

            # 10. Chấm điểm và xếp hạng lại chunks
            all_candidate_ids, final_chunk_scores = score_chunks(
                initial_chunk_ids, chunk_recs_from_graph, query_embedding, local_chunk_map
            )

            # 11. Hợp nhất và loại bỏ redundance trên paths
            merged_paths = {}
            for p_info in (scored_paths + bridged_path_objects):
                canonical_key = get_canonical_path_key(p_info["path"])
                if canonical_key not in merged_paths or p_info["score"] > merged_paths[canonical_key]["score"]:
                    merged_paths[canonical_key] = p_info

            filtered_scored_paths = filter_redundant_paths(list(merged_paths.values()))
            final_ranked_paths = sorted(filtered_scored_paths, key=lambda x: x["score"], reverse=True)[
                :top_k_paths
            ]

            results = {
                "top_paths": [
                    get_path_details(p, local_entity_map, local_edge_map) for p in final_ranked_paths
                ],
                "top_chunks": [
                    get_item_details(c, local_chunk_map, local_entity_map)
                    for c in sorted(final_chunk_scores, key=lambda x: x["final_score"], reverse=True)[
                        :top_k_chunks
                    ]
                ],
            }

            diagnostics["total_time_seconds"] = time.time() - total_start
            return results, diagnostics
