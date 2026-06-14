import hashlib
import json
from typing import List, Dict, Tuple, Set, Any, cast
from collections import Counter
import pandas as pd
import numpy as np
from sqlalchemy import text

from app.core.config import settings
from app.core.logger import get_logger
from app.agents.shared.prompts import SUMMARIZE_ENTITY_DESCRIPTIONS

logger = get_logger(__name__)

def _summarize_descriptions(
    name: str,
    desc_type: str,
    desc_list: List[str],
    summary_length: int = 300,
    language: str = "Vietnamese"
) -> Tuple[str, int]:
    """Gọi Gemini LLM để tóm tắt danh sách mô tả"""
    from google import genai
    
    api_key = settings.GEMINI_API_KEY
    model_name = settings.GEMINI_LLM_MODEL
    
    if not api_key:
        logger.warning("GEMINI_API_KEY không được thiết lập. Trả về ghép nối thô.")
        return " | ".join(desc_list)[:2000], 0
        
    client = genai.Client(api_key=api_key)
    desc_json = "\n".join([json.dumps({"desc": d}, ensure_ascii=False) for d in desc_list])
    
    prompt = SUMMARIZE_ENTITY_DESCRIPTIONS.format(
        description_type="Entity" if desc_type == "entity" else "Relation",
        description_name=name,
        description_list=desc_json,
        summary_length=summary_length,
        language=language
    )
    
    try:
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
        )
        
        tokens_used = 0
        try:
            token_count_resp = client.models.count_tokens(model=model_name, contents=prompt)
            if token_count_resp.total_tokens is not None:
                tokens_used += token_count_resp.total_tokens
            
            if response.text:
                resp_tokens = client.models.count_tokens(model=model_name, contents=response.text)
                if resp_tokens.total_tokens is not None:
                    tokens_used += resp_tokens.total_tokens
        except Exception as token_err:
            logger.warning(f"Không thể đếm token tóm tắt: {token_err}")
            
        return (response.text or "").strip(), tokens_used
    except Exception as e:
        logger.error(f"⚠️ Việc tóm tắt thất bại cho {name}: {e}")
        return " | ".join(desc_list)[:1000], 0


def _merge_and_summarize_group(
    group_descs: List[str],
    group_name: str,
    desc_type: str,
    threshold: int = 3,
    summary_length: int = 300,
    language: str = "Vietnamese"
) -> Tuple[str, int]:
    """Xử lý logic kết hợp mô tả cho một nhóm dữ liệu trùng"""
    unique_descs = sorted(list(set([d.strip() for d in group_descs if d and d.strip()])))
    
    if not unique_descs:
        return "", 0
        
    if len(unique_descs) > threshold:
        return _summarize_descriptions(
            name=group_name,
            desc_type=desc_type,
            desc_list=unique_descs,
            summary_length=summary_length,
            language=language
        )
    else:
        return " ".join(unique_descs), 0


def run_incremental_fusion(
    workspace_id: str,
    new_entities: List[Dict],
    new_relations: List[Dict],
    db_manager
) -> Tuple[List[Dict], List[Dict], int, Set[str]]:
    """
    Thực hiện Incremental Knowledge Fusion ở tầng Python Service:
    1. Tải các entities/relations cũ liên quan từ DB.
    2. Gộp cũ & mới, tóm tắt các mô tả trùng qua LLM nếu vượt threshold.
    3. Đánh dấu các bản ghi cần tạo lại embedding do đổi mô tả.
    4. Trả về entities và relations đã fusion cùng các thực thể bị ảnh hưởng.
    """
    logger.info("🔗 Đang bắt đầu kết hợp kiến thức gia tăng (incremental knowledge fusion)...")
    
    threshold = settings.RAG_SUMMARIZATION_THRESHOLD
    summary_length = settings.RAG_SUMMARIZATION_LENGTH
    
    total_tokens = 0
    touched_entity_ids: Set[str] = set()
    
    # ==========================================
    # 1. Kết hợp Thực thể (Entities)
    # ==========================================
    new_entities_df = pd.DataFrame(new_entities)
    final_entities: List[Dict] = []
    
    # Gom danh sách involved_names từ entities và relations mới
    involved_names: Set[str] = set()
    for e in new_entities:
        name = e.get("entity_name")
        if name:
            involved_names.add(name.strip())
    for r in new_relations:
        src = r.get("source")
        tgt = r.get("target")
        if src: involved_names.add(src.strip())
        if tgt: involved_names.add(tgt.strip())
        
    # Tải entities cũ từ DB trùng involved_names
    existing_entities_df = pd.DataFrame()
    if involved_names:
        raw_existing_entities = db_manager.load_df("entities", workspace_id=workspace_id)
        if not raw_existing_entities.empty:
            existing_entities_df = raw_existing_entities[raw_existing_entities["entity_name"].str.strip().isin(involved_names)]
            
    # Gộp cũ & mới
    combined_entities_df = pd.DataFrame()
    if not new_entities_df.empty or not existing_entities_df.empty:
        for df in [new_entities_df, existing_entities_df]:
            if not df.empty:
                if "source_chunk_ids" not in df.columns:
                    df["source_chunk_ids"] = pd.Series([[] for _ in range(len(df))], dtype=object)
                else:
                    df["source_chunk_ids"] = df["source_chunk_ids"].apply(lambda x: x if isinstance(x, list) else [])
                
                if "frequency" not in df.columns:
                    df["frequency"] = 1
                else:
                    df["frequency"] = df["frequency"].fillna(1).astype(int)
                    
                if "entity_type" not in df.columns:
                    df["entity_type"] = "UNKNOWN"
                if "description" not in df.columns:
                    df["description"] = ""
                if "chunk_descriptions" not in df.columns:
                    df["chunk_descriptions"] = pd.Series([{} for _ in range(len(df))], dtype=object)
                else:
                    df["chunk_descriptions"] = df["chunk_descriptions"].apply(lambda x: x if isinstance(x, dict) else {})
        
        combined_entities_df = pd.concat([existing_entities_df, new_entities_df], ignore_index=True)
        
    if not combined_entities_df.empty:
        grouped_entities = combined_entities_df.groupby("entity_name")
        for name, group in grouped_entities:
            first_row = group.iloc[0]
            eid = first_row.get("entity_id")
            
            existing_record = group[group["entity_id"].astype(str).str.startswith("ent-")]
            if not existing_record.empty:
                eid = existing_record.iloc[0]["entity_id"]
            elif not str(eid).startswith("ent-"):
                eid = f"ent-{hashlib.md5(str(name).encode()).hexdigest()}"
                
            touched_entity_ids.add(cast(str, eid))
            
            etype = Counter(group["entity_type"].dropna()).most_common(1)[0][0] if not group["entity_type"].dropna().empty else "UNKNOWN"
            freq = int(group["frequency"].sum())
            chunks = list(set(sum(group["source_chunk_ids"].tolist(), [])))
            
            # Gộp chunk_descriptions
            all_chunk_descs = {}
            for idx, row in group.iterrows():
                row_descs = row.get("chunk_descriptions")
                if isinstance(row_descs, dict) and row_descs:
                    all_chunk_descs.update(row_descs)
                else:
                    row_chunks = row.get("source_chunk_ids", [])
                    row_desc = row.get("description", "")
                    if isinstance(row_chunks, list) and isinstance(row_desc, str) and row_desc:
                        for cid in row_chunks:
                            all_chunk_descs[cid] = row_desc
            
            all_descs = list(set([d for d in all_chunk_descs.values() if d and d.strip()]))
            
            new_description, tokens = _merge_and_summarize_group(
                group_descs=all_descs,
                group_name=str(name),
                desc_type="entity",
                threshold=threshold,
                summary_length=summary_length
            )
            total_tokens += tokens
            
            old_embedding = None
            old_desc = None
            if not existing_entities_df.empty:
                old_rec = existing_entities_df[existing_entities_df["entity_name"] == name]
                if not old_rec.empty:
                    old_embedding = old_rec.iloc[0].get("embedding")
                    old_desc = old_rec.iloc[0].get("description")
                    
            final_embedding = old_embedding
            if new_description != old_desc or old_embedding is None:
                final_embedding = None
                
            final_entities.append({
                "entity_id": eid,
                "entity_name": name,
                "entity_type": etype,
                "description": new_description,
                "source_chunk_ids": chunks,
                "frequency": freq,
                "embedding": final_embedding,
                "degree": 0,
                "chunk_descriptions": all_chunk_descs
            })
            
    # ==========================================
    # 2. Kết hợp Mối quan hệ (Relations)
    # ==========================================
    new_relations_df = pd.DataFrame(new_relations)
    final_relations: List[Dict] = []
    
    if not new_relations_df.empty:
        new_relations_df.rename(columns={"source": "source_name", "target": "target_name"}, inplace=True)
        new_relations_df["source_name"] = new_relations_df["source_name"].str.strip()
        new_relations_df["target_name"] = new_relations_df["target_name"].str.strip()
        new_relations_df["key"] = new_relations_df.apply(
            lambda row: tuple(sorted((str(row["source_name"]), str(row["target_name"])))), axis=1
        )
        
    existing_relations_df = pd.DataFrame()
    if involved_names:
        raw_existing_relations = db_manager.load_df("relationships", workspace_id=workspace_id)
        if not raw_existing_relations.empty:
            raw_existing_relations["key"] = raw_existing_relations.apply(
                lambda row: tuple(sorted((str(row["source_name"]), str(row["target_name"])))), axis=1
            )
            existing_relations_df = raw_existing_relations[
                raw_existing_relations["source_name"].str.strip().isin(involved_names) &
                raw_existing_relations["target_name"].str.strip().isin(involved_names)
            ]
            if not new_relations_df.empty and not existing_relations_df.empty:
                new_keys_set = set(new_relations_df["key"].unique())
                existing_relations_df = existing_relations_df[existing_relations_df["key"].isin(new_keys_set)]

    combined_relations_df = pd.DataFrame()
    if not new_relations_df.empty or not existing_relations_df.empty:
        for df in [new_relations_df, existing_relations_df]:
            if not df.empty:
                if "source_chunk_ids" not in df.columns:
                    df["source_chunk_ids"] = pd.Series([[] for _ in range(len(df))], dtype=object)
                else:
                    df["source_chunk_ids"] = df["source_chunk_ids"].apply(lambda x: x if isinstance(x, list) else [])
                
                if "frequency" not in df.columns:
                    df["frequency"] = 1
                else:
                    df["frequency"] = df["frequency"].fillna(1).astype(int)
                    
                for col in ["keywords", "description"]:
                    if col not in df.columns:
                        df[col] = ""
                if "chunk_meta" not in df.columns:
                    df["chunk_meta"] = pd.Series([{} for _ in range(len(df))], dtype=object)
                else:
                    df["chunk_meta"] = df["chunk_meta"].apply(lambda x: x if isinstance(x, dict) else {})
        
        combined_relations_df = pd.concat([existing_relations_df, new_relations_df], ignore_index=True)
        
    if not combined_relations_df.empty:
        grouped_relations = combined_relations_df.groupby("key")
        for key_val, group in grouped_relations:
            key_tuple = cast(Tuple[Any, Any], key_val)
            first_row = group.iloc[0]
            rid = first_row.get("relation_id")
            
            existing_record = group[group["relation_id"].astype(str).str.startswith("rel-")]
            if not existing_record.empty:
                rid = existing_record.iloc[0]["relation_id"]
            elif not str(rid).startswith("rel-"):
                rid = f"rel-{hashlib.md5(f'{str(key_tuple[0])}-{str(key_tuple[1])}'.encode()).hexdigest()}"
                
            src_name = key_tuple[0]
            tgt_name = key_tuple[1]
            freq = int(group["frequency"].sum())
            chunks = list(set(sum(group["source_chunk_ids"].tolist(), [])))
            
            # Gộp chunk_meta
            all_chunk_meta = {}
            for idx, row in group.iterrows():
                row_meta = row.get("chunk_meta")
                if isinstance(row_meta, dict) and row_meta:
                    all_chunk_meta.update(row_meta)
                else:
                    row_chunks = row.get("source_chunk_ids", [])
                    row_desc = row.get("description", "")
                    row_kws = row.get("keywords", "")
                    if isinstance(row_chunks, list):
                        for cid in row_chunks:
                            all_chunk_meta[cid] = {
                                "description": row_desc,
                                "keywords": row_kws
                            }
            
            all_descs = list(set([m["description"] for m in all_chunk_meta.values() if isinstance(m, dict) and m.get("description")]))
            all_kws = []
            for m in all_chunk_meta.values():
                if isinstance(m, dict) and m.get("keywords"):
                    all_kws.extend(m["keywords"].split(","))
            keywords = ", ".join(sorted(list(set([k.strip() for k in all_kws if k.strip()]))))
                    
            rel_name_str = f"({src_name}, {tgt_name})"
            new_description, tokens = _merge_and_summarize_group(
                group_descs=all_descs,
                group_name=rel_name_str,
                desc_type="relation",
                threshold=threshold,
                summary_length=summary_length
            )
            total_tokens += tokens
            
            old_embedding = None
            old_desc = None
            if not existing_relations_df.empty:
                match = existing_relations_df[existing_relations_df["key"] == key_tuple]
                if not match.empty:
                    old_embedding = match.iloc[0].get("embedding")
                    old_desc = match.iloc[0].get("description")
                    
            final_embedding = old_embedding
            if new_description != old_desc or old_embedding is None:
                final_embedding = None
                
            final_relations.append({
                "relation_id": rid,
                "source_name": src_name,
                "target_name": tgt_name,
                "keywords": keywords,
                "description": new_description,
                "source_chunk_ids": chunks,
                "frequency": freq,
                "embedding": final_embedding,
                "degree": 0,
                "chunk_meta": all_chunk_meta
            })
            
    # ==========================================
    # 3. Placeholders & ID mapping cho Relations
    # ==========================================
    if final_relations:
        name_to_id = {e["entity_name"]: e["entity_id"] for e in final_entities}
        
        needed_names = set()
        for r in final_relations:
            needed_names.add(r["source_name"])
            needed_names.add(r["target_name"])
            
        missing_names = [n for n in needed_names if n not in name_to_id]
        
        if missing_names:
            safe_miss = [n.replace("'", "''") for n in missing_names]
            miss_str = "', '".join(safe_miss)
            
            try:
                conn = db_manager.get_conn()
                cur = conn.cursor()
                cur.execute(f"SET app.current_workspace_id = %s;", (workspace_id,))
                cur.execute(f"SELECT entity_name, entity_id FROM {db_manager.schema}.entities WHERE entity_name IN ('{miss_str}')")
                rows = cur.fetchall()
                for row in rows:
                    name_to_id[row[0]] = row[1]
                    touched_entity_ids.add(cast(str, row[1]))
                cur.close()
                conn.close()
            except Exception as e:
                logger.warning(f"⚠️ Không thể kiểm tra thực thể cũ từ DB cho missing names: {e}")
                
        real_missing = [n for n in missing_names if n not in name_to_id]
        if real_missing:
            new_placeholders = []
            for name in real_missing:
                eid = f"ent-{hashlib.md5(str(name).encode()).hexdigest()}"
                name_to_id[name] = eid
                touched_entity_ids.add(eid)
                new_placeholders.append({
                    "entity_id": eid,
                    "entity_name": name,
                    "entity_type": "UNKNOWN",
                    "description": "",
                    "source_chunk_ids": [],
                    "frequency": 0,
                    "degree": 0,
                    "embedding": None
                })
            final_entities.extend(new_placeholders)
            
        for r in final_relations:
            r["source_id"] = name_to_id.get(r["source_name"], f"ent-{hashlib.md5(str(r['source_name']).encode()).hexdigest()}")
            r["target_id"] = name_to_id.get(r["target_name"], f"ent-{hashlib.md5(str(r['target_name']).encode()).hexdigest()}")
            
    return final_entities, final_relations, total_tokens, touched_entity_ids
