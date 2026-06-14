import hashlib
import json
from typing import Dict, List, Any, Optional, Set
import numpy as np

from app.utils import clean_entity_name
from app.core.logger import get_logger

logger = get_logger(__name__)


def get_entity_id(name: str) -> str:
    """
    Sinh ID duy nhất cho thực thể từ tên thực thể (case-insensitive).
    Sử dụng MD5 hash của tên đã chuẩn hóa viết thường.
    """
    name_clean = clean_entity_name(name).lower()
    return f"ent-{hashlib.md5(name_clean.encode('utf-8')).hexdigest()}"


def get_relation_id(source: str, target: str) -> str:
    """
    Sinh ID duy nhất cho mối quan hệ từ tên của thực thể nguồn và đích.
    Không phụ thuộc vào thứ tự truyền vào (sắp xếp theo alphabet tên viết thường đã chuẩn hóa).
    """
    src_clean = clean_entity_name(source).lower()
    tgt_clean = clean_entity_name(target).lower()
    first, second = sorted((src_clean, tgt_clean))
    key_str = f"{first}-{second}"
    return f"rel-{hashlib.md5(key_str.encode('utf-8')).hexdigest()}"


def parse_db_row(row_dict: Dict[str, Any], json_cols: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Chuẩn hóa dữ liệu của một hàng truy vấn từ database.
    - Chuyển đổi embedding (nếu có và không rỗng) sang np.ndarray (float32).
    - Parse các trường dữ liệu JSON từ định dạng string/jsonb sang list/dict Python tương ứng.
    """
    if json_cols is None:
        json_cols = ["source_chunk_ids", "entity_ids", "relation_ids"]

    r_dict = dict(row_dict)

    # Xử lý trường embedding
    if "embedding" in r_dict and r_dict["embedding"] is not None:
        emb_val = r_dict["embedding"]
        if isinstance(emb_val, str):
            try:
                r_dict["embedding"] = np.array(json.loads(emb_val)).astype("float32")
            except Exception:
                pass
        else:
            r_dict["embedding"] = np.array(emb_val).astype("float32")

    # Xử lý các cột dạng JSON
    for col in json_cols:
        if col in r_dict:
            val = r_dict[col]
            if isinstance(val, str):
                try:
                    r_dict[col] = json.loads(val)
                except Exception:
                    r_dict[col] = []
            elif val is None:
                r_dict[col] = []

    return r_dict


def update_graph_degrees(db_manager: Any, workspace_id: str, touched_entity_ids: Set[str]) -> None:
    """
    Cập nhật Degree cho Entities và Relationships bị ảnh hưởng trong DB bằng SQL trực tiếp.
    """
    if not touched_entity_ids:
        return

    logger.info(f"Cập nhật degree cho {len(touched_entity_ids)} thực thể qua SQL...")
    ids_tuple = tuple(touched_entity_ids)
    ids_sql_str = str(ids_tuple) if len(ids_tuple) > 1 else f"('{list(touched_entity_ids)[0]}')"

    sql_degree = f"""
        UPDATE {db_manager.schema}.entities 
        SET degree = (
            SELECT COUNT(*) 
            FROM {db_manager.schema}.relationships 
            WHERE (source_id = {db_manager.schema}.entities.entity_id 
               OR target_id = {db_manager.schema}.entities.entity_id)
              AND workspace_id = :workspace_id
        )
        WHERE entity_id IN {ids_sql_str} AND workspace_id = :workspace_id
    """

    sql_rel_degree = f"""
        UPDATE {db_manager.schema}.relationships r
        SET degree = (
            COALESCE((SELECT degree FROM {db_manager.schema}.entities WHERE entity_id = r.source_id AND workspace_id = :workspace_id), 0) + 
            COALESCE((SELECT degree FROM {db_manager.schema}.entities WHERE entity_id = r.target_id AND workspace_id = :workspace_id), 0)
        )
        WHERE (r.source_id IN {ids_sql_str} OR r.target_id IN {ids_sql_str}) AND r.workspace_id = :workspace_id
    """

    try:
        conn = db_manager.get_conn()
        cur = conn.cursor()
        cur.execute("SET app.current_workspace_id = %s;", (workspace_id,))

        # Thực thi update degree entities
        cur.execute(sql_degree.replace(":workspace_id", f"'{workspace_id}'"))
        # Thực thi update degree relationships
        cur.execute(sql_rel_degree.replace(":workspace_id", f"'{workspace_id}'"))

        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        logger.error(f"⚠️ Cập nhật degree thất bại: {e}")
