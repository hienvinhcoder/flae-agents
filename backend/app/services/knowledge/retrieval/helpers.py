from collections import Counter
from typing import Dict, List, Tuple, Any, Set
import numpy as np
import pandas as pd
from app.core.config import settings


def minmax_scale(x: Any) -> np.ndarray:
    """Chuẩn hóa min-max thủ công bằng numpy."""
    x_arr = np.array(x)
    x_min = np.min(x_arr)
    x_max = np.max(x_arr)
    if x_max == x_min:
        return np.zeros_like(x_arr, dtype=float)
    return (x_arr - x_min) / (x_max - x_min)



def get_canonical_path_key(path: List[str]) -> frozenset:
    """Tạo key chuẩn hóa cho một đường dẫn để kiểm tra trùng lặp."""
    if len(path) < 2:
        return frozenset(path)
    edges = set()
    for i in range(len(path) - 1):
        edge = frozenset([path[i], path[i + 1]])
        edges.add(edge)
    return frozenset(edges)


def filter_redundant_paths(paths: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Lọc các đường dẫn dư thừa/tập con."""
    if not paths:
        return []

    keep_indices = set(range(len(paths)))
    path_sets = [set(p["path"]) for p in paths]

    for i in range(len(paths)):
        if i not in keep_indices:
            continue

        for j in range(len(paths)):
            if i == j:
                continue

            if path_sets[i].issubset(path_sets[j]):
                if len(path_sets[i]) < len(path_sets[j]):
                    keep_indices.discard(i)
                    break
                elif len(path_sets[i]) == len(path_sets[j]):
                    if paths[i]["score"] < paths[j]["score"]:
                        keep_indices.discard(i)
                        break
                    elif paths[i]["score"] == paths[j]["score"] and i > j:
                        keep_indices.discard(i)
                        break

    return [paths[i] for i in sorted(list(keep_indices))]


def batch_get_similarity(
    ids: List[str], data_map: Dict[str, Dict[str, Any]], query_embedding: np.ndarray, emb_key: str
) -> Dict[str, float]:
    """Tính cosine similarity hàng loạt."""
    if not ids:
        return {}

    embeddings = []
    valid_ids = []
    embedding_dim = settings.EMBEDDING_DIMENSIONS

    for item_id in ids:
        item = data_map.get(item_id)
        if item:
            emb = item.get(emb_key)
            if isinstance(emb, (list, np.ndarray)) and len(emb) == embedding_dim:
                embeddings.append(emb)
                valid_ids.append(item_id)

    if not valid_ids:
        return {}

    embeddings_np = np.array(embeddings).astype("float32")
    norms = np.linalg.norm(embeddings_np, axis=1, keepdims=True)
    embeddings_normalized = embeddings_np / (norms + 1e-10)

    query_norm = np.linalg.norm(query_embedding)
    query_embedding_normalized = query_embedding / (query_norm + 1e-10)

    scores = np.dot(embeddings_normalized, query_embedding_normalized.T).flatten()
    return {id_val: float(score) for id_val, score in zip(valid_ids, scores)}


def score_paths_component_based(
    paths: List[List[str]],
    query_embedding: np.ndarray,
    seed_entity_ids: Set[str],
    local_entity_map: dict,
    local_edge_map: dict,
) -> List[Dict[str, Any]]:
    """Chấm điểm các đường dẫn trên đồ thị dựa trên độ tương đồng node/edge và degree."""
    if not paths:
        return []

    unique_entity_ids = {eid for path in paths for eid in path}
    unique_relation_ids = set()

    entity_sim_map = batch_get_similarity(
        list(unique_entity_ids), local_entity_map, query_embedding, "embedding"
    )

    for path in paths:
        for i in range(len(path) - 1):
            edge_key = tuple(sorted((path[i], path[i + 1])))
            if edge_key in local_edge_map:
                rid = local_edge_map[edge_key]["relation_id"]
                unique_relation_ids.add(rid)

    local_relation_map = {data["relation_id"]: data for data in local_edge_map.values()}
    relation_sim_map = batch_get_similarity(
        list(unique_relation_ids), local_relation_map, query_embedding, "embedding"
    )

    final_scored_paths = []
    entity_weight = settings.RAG_SCORING_ENTITY_DEGREE_WEIGHT
    relation_weight = settings.RAG_SCORING_RELATION_DEGREE_WEIGHT
    seed_density_bonus = settings.RAG_SCORING_SEED_DENSITY_BONUS

    for path in paths:
        total_component_score = 0.0
        for eid in path:
            sim = entity_sim_map.get(eid, 0.0)
            deg_val = local_entity_map.get(eid, {}).get("degree")
            degree = deg_val if deg_val is not None else 0
            total_component_score += sim * (1 + entity_weight * degree)

        if len(path) > 1:
            for i in range(len(path) - 1):
                edge_key = tuple(sorted((path[i], path[i + 1])))
                edge_info = local_edge_map.get(edge_key)
                if edge_info:
                    rel_id = edge_info["relation_id"]
                    sim = relation_sim_map.get(rel_id, 0.0)
                    deg_val = edge_info.get("degree")
                    degree = deg_val if deg_val is not None else 0
                    total_component_score += sim * (1 + relation_weight * degree)

        num_components = len(path) + max(0, len(path) - 1)
        avg_quality_score = total_component_score / num_components if num_components > 0 else 0.0

        num_seeds = len(set(path) & seed_entity_ids)
        density_bonus_factor = 1.0
        if num_seeds > 1 and len(path) > 1:
            path_length = len(path) - 1
            density = num_seeds / path_length
            density_bonus_factor = 1 + seed_density_bonus * density

        base_score = avg_quality_score * density_bonus_factor
        final_scored_paths.append(
            {
                "path": path,
                "score": base_score,
                "reason": f"AvgQuality({avg_quality_score:.2f}) * DensityBonus({density_bonus_factor:.2f})",
            }
        )
    return final_scored_paths


def score_chunks(
    initial_chunk_ids: Set[str],
    chunk_recommendations_from_graph: Counter,
    query_embedding: np.ndarray,
    chunk_map: dict,
) -> Tuple[List[str], List[Dict[str, Any]]]:
    """Chấm điểm các chunks văn bản kết hợp cosine similarity và graph endorsement."""
    top_rec_k = settings.RAG_SCORING_TOP_REC_K
    chunk_alpha = settings.RAG_SCORING_CHUNK_ALPHA
    strong_bonus = settings.RAG_SCORING_STRONG_RECOMMENDATION_BONUS
    weak_bonus = settings.RAG_SCORING_WEAK_RECOMMENDATION_BONUS

    graph_only_recs = {
        cid: count for cid, count in chunk_recommendations_from_graph.items() if cid not in initial_chunk_ids
    }
    top_k_recs_to_score = sorted(graph_only_recs.items(), key=lambda x: x[1], reverse=True)[:top_rec_k]
    top_k_rec_ids = {cid for cid, count in top_k_recs_to_score}
    all_candidate_ids_to_score_sim = list(initial_chunk_ids | top_k_rec_ids)

    all_sim_scores = batch_get_similarity(
        all_candidate_ids_to_score_sim, chunk_map, query_embedding, "embedding"
    )

    candidate_scores = {}
    for cid in all_candidate_ids_to_score_sim:
        rec_count = chunk_recommendations_from_graph.get(cid, 0)
        rec_bonus = strong_bonus if cid in initial_chunk_ids else weak_bonus
        candidate_scores[cid] = {
            "sim_score": all_sim_scores.get(cid, 0.0),
            "rec_score": rec_count * rec_bonus,
        }

    if not candidate_scores:
        return [], []

    scoring_df = pd.DataFrame.from_dict(candidate_scores, orient="index")
    if scoring_df["sim_score"].nunique() > 1:
        scoring_df["norm_sim"] = minmax_scale(scoring_df["sim_score"]).tolist()
    else:
        scoring_df["norm_sim"] = scoring_df["sim_score"].apply(lambda x: 1.0 if x > 0 else 0.0)

    if scoring_df["rec_score"].nunique() > 1:
        scoring_df["norm_rec"] = minmax_scale(scoring_df["rec_score"]).tolist()
    else:
        scoring_df["norm_rec"] = scoring_df["rec_score"].apply(lambda x: 1.0 if x > 0 else 0.0)

    scoring_df["final_score"] = (chunk_alpha * scoring_df["norm_sim"]) + (
        (1 - chunk_alpha) * scoring_df["norm_rec"]
    )
    raw_records = scoring_df.reset_index().rename(columns={"index": "id"}).to_dict("records")
    final_chunk_scores_list = [
        {str(k): v for k, v in record.items()} for record in raw_records
    ]

    return list(candidate_scores.keys()), final_chunk_scores_list


def get_item_details(item: dict, chunk_map: dict | None = None, entity_map: dict | None = None) -> dict:
    """Lấy chi tiết và định dạng lại item (entity hoặc chunk) để trả về."""
    item_id = item["id"]
    details = item.copy()
    if "final_score" in details:
        details["score"] = details["final_score"]

    if item_id.startswith("ent-"):
        data = entity_map.get(item_id, {}) if entity_map else {}
        details.update(
            {
                "type": "entity",
                "name": data.get("entity_name", "Unknown"),
                "content": data.get("description", ""),
            }
        )
    else:
        data = chunk_map.get(item_id, {}) if chunk_map else {}
        doc_name = data.get("source_document_name", "N/A")
        details.update(
            {
                "type": "chunk",
                "name": f"Chunk from {doc_name}",
                "source_document": doc_name,
                "content": data.get("text", ""),
            }
        )
    return details


def get_path_details(path_info: dict, entity_map: dict, edge_map: dict) -> dict:
    """Format chi tiết một path bao gồm các segments và readable format."""
    path_ids = path_info["path"]
    path_segments = []
    path_readable_parts = [entity_map.get(path_ids[0], {}).get("entity_name", "Unknown")]

    for i in range(len(path_ids) - 1):
        source_id, target_id = path_ids[i], path_ids[i + 1]
        edge_key = tuple(sorted((source_id, target_id)))
        edge_info = edge_map.get(edge_key, {})

        source_name = entity_map.get(source_id, {}).get("entity_name", "Unknown")
        target_name = entity_map.get(target_id, {}).get("entity_name", "Unknown")
        keywords = edge_info.get("keywords", "N/A")

        path_readable_parts.extend([f" --[{keywords}]--> ", target_name])
        path_segments.append(
            {
                "source": source_name,
                "target": target_name,
                "keywords": keywords,
                "description": edge_info.get("description", "N/A"),
                "source_desc": entity_map.get(source_id, {}).get("description", ""),
                "target_desc": entity_map.get(target_id, {}).get("description", ""),
            }
        )

    details: Dict[str, Any] = {
        "path_readable": "".join(path_readable_parts),
        "segments": path_segments,
        "score": path_info["score"],
        "reason": path_info["reason"],
        "entity_ids": path_ids,
    }

    if path_info.get("endorsing_bridges"):
        details["endorsing_bridges"] = []
        for bridge in path_info["endorsing_bridges"]:
            bridge_readable = " -> ".join(
                [entity_map.get(eid, {}).get("entity_name", "Unknown") for eid in bridge]
            )
            details["endorsing_bridges"].append(bridge_readable)
    return details
