"""
Service dọn dẹp dữ liệu RAG trong database.
"""
import json
from typing import Any
from psycopg2.extras import execute_values

from app.core.config import settings
from app.core.logger import get_logger
from app.db.rag_db import rag_db_manager
from app.services.knowalge_base.fusion_service import _merge_and_summarize_group
from app.services.knowalge_base.ingestion_service import IngestionService

logger = get_logger(__name__)


async def cleanup_rag_data(workspace_id: str, document_id: str) -> None:
    """Xóa chunks/entities/relationships/topics liên quan đến document trong rag_db."""
    conn = None
    topics_to_update = []
    try:
        rag_db_manager.initialize()
        conn = rag_db_manager.get_conn()
        conn.autocommit = False  # Sử dụng transaction để đảm bảo toàn vẹn dữ liệu
        cur = conn.cursor()
        schema = rag_db_manager.schema

        # 1. Lấy tất cả các chunk_id thuộc về document bị xóa trong workspace này
        cur.execute(
            f"SELECT chunk_id FROM {schema}.chunks "
            f"WHERE workspace_id = %s AND source_document_id = %s",
            (workspace_id, document_id),
        )
        deleted_chunk_ids = [row[0] for row in cur.fetchall()]

        # Nếu tài liệu này chưa được tạo bất kỳ chunk nào, dừng xử lý dọn dẹp
        if not deleted_chunk_ids:
            cur.close()
            conn.close()
            logger.info(f"Không tìm thấy chunks nào cho document {document_id} trong workspace {workspace_id}")
            return

        deleted_chunk_ids_set = set(deleted_chunk_ids)

        # 1.5. Xử lý dọn dẹp các topics và topic memberships liên quan
        cur.execute(
            f"SELECT DISTINCT topic_id FROM {schema}.topic_memberships "
            f"WHERE workspace_id = %s AND ("
            f"  (member_type = 'chunk' AND member_id = ANY(%s)) "
            f"  OR (member_type = 'document' AND member_id = %s)"
            f")",
            (workspace_id, deleted_chunk_ids, document_id),
        )
        affected_topic_ids = [row[0] for row in cur.fetchall()]

        if affected_topic_ids:
            # Xóa các memberships liên quan
            cur.execute(
                f"DELETE FROM {schema}.topic_memberships "
                f"WHERE workspace_id = %s AND ("
                f"  (member_type = 'chunk' AND member_id = ANY(%s)) "
                f"  OR (member_type = 'document' AND member_id = %s)"
                f")",
                (workspace_id, deleted_chunk_ids, document_id),
            )

            # Phân loại topic: xóa topic trống, giữ lại topic còn membership để update
            topics_to_delete = []
            for t_id in affected_topic_ids:
                if not t_id:
                    continue
                cur.execute(
                    f"SELECT COUNT(*) FROM {schema}.topic_memberships "
                    f"WHERE workspace_id = %s AND topic_id = %s AND member_type = 'chunk' AND status = 'active'",
                    (workspace_id, t_id),
                )
                row = cur.fetchone()
                if row is None:
                    logger.warning(f"Không thể đếm số lượng memberships cho topic {t_id}. Bỏ qua dọn dẹp topic này.")
                    continue
                count = row[0]
                if count == 0:
                    topics_to_delete.append(t_id)
                else:
                    topics_to_update.append(t_id)

            if topics_to_delete:
                cur.execute(
                    f"DELETE FROM {schema}.topics "
                    f"WHERE workspace_id = %s AND topic_id = ANY(%s)",
                    (workspace_id, topics_to_delete),
                )

        # 2. Xử lý dọn dẹp bảng Entities
        cur.execute(
            f"SELECT entity_id, entity_name, source_chunk_ids, description, chunk_descriptions, embedding "
            f"FROM {schema}.entities "
            f"WHERE workspace_id = %s AND source_chunk_ids ?| %s",
            (workspace_id, deleted_chunk_ids),
        )
        entity_candidates = cur.fetchall()

        entities_to_delete: list[Any] = []
        entities_to_update: list[tuple[Any, str, str, int, str, str | None, str]] = []
        entities_needing_embedding: list[dict[str, Any]] = []

        threshold = settings.RAG_SUMMARIZATION_THRESHOLD
        summary_length = settings.RAG_SUMMARIZATION_LENGTH

        for row in entity_candidates:
            ent_id, ent_name, src_chunk_ids_raw, old_desc, chunk_descriptions_raw, old_embedding = row

            if isinstance(src_chunk_ids_raw, str):
                src_chunk_ids = json.loads(src_chunk_ids_raw)
            elif isinstance(src_chunk_ids_raw, list):
                src_chunk_ids = src_chunk_ids_raw
            else:
                src_chunk_ids = []

            remaining_chunks = [cid for cid in src_chunk_ids if cid not in deleted_chunk_ids_set]

            if not remaining_chunks:
                entities_to_delete.append(ent_id)
            else:
                chunk_descriptions = {}
                if isinstance(chunk_descriptions_raw, str):
                    try:
                        chunk_descriptions = json.loads(chunk_descriptions_raw)
                    except Exception:
                        pass
                elif isinstance(chunk_descriptions_raw, dict):
                    chunk_descriptions = chunk_descriptions_raw

                if not chunk_descriptions:
                    # Fallback cho data cũ
                    chunk_descriptions = {cid: old_desc for cid in src_chunk_ids if old_desc}

                # Lọc bỏ chunk bị xóa
                new_chunk_descs = {cid: desc for cid, desc in chunk_descriptions.items() if cid in remaining_chunks}

                # Tính toán lại description mới
                all_descs = list(set([d for d in new_chunk_descs.values() if d and d.strip()]))
                new_desc, _ = _merge_and_summarize_group(
                    group_descs=all_descs,
                    group_name=ent_name,
                    desc_type="entity",
                    threshold=threshold,
                    summary_length=summary_length
                )

                needs_emb = (new_desc != old_desc) or (old_embedding is None)
                if needs_emb:
                    entities_needing_embedding.append({
                        "entity_id": ent_id,
                        "text": f"{ent_name}\n{new_desc}",
                        "new_desc": new_desc,
                        "remaining_chunks": remaining_chunks,
                        "chunk_descs": new_chunk_descs
                    })
                else:
                    entities_to_update.append((
                        ent_id,
                        new_desc,
                        json.dumps(remaining_chunks),
                        len(remaining_chunks),
                        json.dumps(new_chunk_descs),
                        str(old_embedding) if old_embedding is not None else None,
                        workspace_id
                    ))

        # Gọi Embedding API cho các entity cần tạo lại embedding
        if entities_needing_embedding:
            logger.info(f"Generating new embeddings for {len(entities_needing_embedding)} entities due to description change...")
            texts = [item["text"] for item in entities_needing_embedding]
            embeddings, _ = IngestionService.generate_embeddings(texts, "entities")

            for item, emb in zip(entities_needing_embedding, embeddings):
                emb_str = json.dumps(emb) if emb is not None else None
                entities_to_update.append((
                    item["entity_id"],
                    item["new_desc"],
                    json.dumps(item["remaining_chunks"]),
                    len(item["remaining_chunks"]),
                    json.dumps(item["chunk_descs"]),
                    emb_str,
                    workspace_id
                ))

        # Thực thi update/delete entities
        if entities_to_update:
            update_ent_sql = f"""
                UPDATE {schema}.entities AS t
                SET description = v.new_desc,
                    source_chunk_ids = v.new_ids::jsonb,
                    frequency = v.new_freq::int,
                    chunk_descriptions = v.chunk_descs::jsonb,
                    embedding = v.emb::vector
                FROM (VALUES %s) AS v(id, new_desc, new_ids, new_freq, chunk_descs, emb, w_id)
                WHERE t.workspace_id = v.w_id AND t.entity_id = v.id
            """
            execute_values(cur, update_ent_sql, entities_to_update)

        if entities_to_delete:
            # Xóa các topic memberships liên quan đến các entities bị xóa
            cur.execute(
                f"DELETE FROM {schema}.topic_memberships "
                f"WHERE workspace_id = %s AND member_type = 'entity' AND member_id = ANY(%s)",
                (workspace_id, entities_to_delete),
            )
            cur.execute(
                f"DELETE FROM {schema}.entities "
                f"WHERE workspace_id = %s AND entity_id = ANY(%s)",
                (workspace_id, entities_to_delete),
            )

        # 3. Xử lý dọn dẹp bảng Relationships
        cur.execute(
            f"SELECT relation_id, source_name, target_name, source_chunk_ids, description, keywords, chunk_meta, embedding "
            f"FROM {schema}.relationships "
            f"WHERE workspace_id = %s AND source_chunk_ids ?| %s",
            (workspace_id, deleted_chunk_ids),
        )
        rel_candidates = cur.fetchall()

        rels_to_delete: list[Any] = []
        rels_to_update: list[tuple[Any, str, str, str, int, str, str | None, str]] = []
        rels_needing_embedding: list[dict[str, Any]] = []

        for row in rel_candidates:
            rel_id, src_name, tgt_name, src_chunk_ids_raw, old_desc, old_kws, chunk_meta_raw, old_embedding = row

            if isinstance(src_chunk_ids_raw, str):
                src_chunk_ids = json.loads(src_chunk_ids_raw)
            elif isinstance(src_chunk_ids_raw, list):
                src_chunk_ids = src_chunk_ids_raw
            else:
                src_chunk_ids = []

            remaining_chunks = [cid for cid in src_chunk_ids if cid not in deleted_chunk_ids_set]

            if not remaining_chunks:
                rels_to_delete.append(rel_id)
            else:
                chunk_meta = {}
                if isinstance(chunk_meta_raw, str):
                    try:
                        chunk_meta = json.loads(chunk_meta_raw)
                    except Exception:
                        pass
                elif isinstance(chunk_meta_raw, dict):
                    chunk_meta = chunk_meta_raw

                if not chunk_meta:
                    # Fallback cho data cũ
                    chunk_meta = {
                        cid: {
                            "description": old_desc,
                            "keywords": old_kws
                        } for cid in src_chunk_ids
                    }

                # Lọc bỏ chunk bị xóa
                new_chunk_meta = {cid: meta for cid, meta in chunk_meta.items() if cid in remaining_chunks}

                # Tính toán lại keywords và description mới
                all_descs = list(set([m["description"] for m in new_chunk_meta.values() if isinstance(m, dict) and m.get("description")]))
                all_kws = []
                for m in new_chunk_meta.values():
                    if isinstance(m, dict) and m.get("keywords"):
                        all_kws.extend(m["keywords"].split(","))
                new_keywords = ", ".join(sorted(list(set([k.strip() for k in all_kws if k.strip()]))))

                rel_name_str = f"({src_name}, {tgt_name})"
                new_desc, _ = _merge_and_summarize_group(
                    group_descs=all_descs,
                    group_name=rel_name_str,
                    desc_type="relation",
                    threshold=threshold,
                    summary_length=summary_length
                )

                needs_emb = (new_desc != old_desc) or (new_keywords != old_kws) or (old_embedding is None)
                if needs_emb:
                    rels_needing_embedding.append({
                        "relation_id": rel_id,
                        "text": f"{new_keywords}\t{src_name}\n{tgt_name}\n{new_desc}",
                        "new_desc": new_desc,
                        "new_kws": new_keywords,
                        "remaining_chunks": remaining_chunks,
                        "chunk_meta": new_chunk_meta
                    })
                else:
                    rels_to_update.append((
                        rel_id,
                        new_desc,
                        new_keywords,
                        json.dumps(remaining_chunks),
                        len(remaining_chunks),
                        json.dumps(new_chunk_meta),
                        str(old_embedding) if old_embedding is not None else None,
                        workspace_id
                    ))

        # Gọi Embedding API cho các relationship cần tạo lại embedding
        if rels_needing_embedding:
            logger.info(f"Generating new embeddings for {len(rels_needing_embedding)} relationships due to description/keyword change...")
            texts = [item["text"] for item in rels_needing_embedding]
            embeddings, _ = IngestionService.generate_embeddings(texts, "relationships")

            for item, emb in zip(rels_needing_embedding, embeddings):
                emb_str = json.dumps(emb) if emb is not None else None
                rels_to_update.append((
                    item["relation_id"],
                    item["new_desc"],
                    item["new_kws"],
                    json.dumps(item["remaining_chunks"]),
                    len(item["remaining_chunks"]),
                    json.dumps(item["chunk_meta"]),
                    emb_str,
                    workspace_id
                ))

        # Thực thi update/delete relationships
        if rels_to_update:
            update_rel_sql = f"""
                UPDATE {schema}.relationships AS t
                SET description = v.new_desc,
                    keywords = v.new_kws,
                    source_chunk_ids = v.new_ids::jsonb,
                    frequency = v.new_freq::int,
                    chunk_meta = v.chunk_meta::jsonb,
                    embedding = v.emb::vector
                FROM (VALUES %s) AS v(id, new_desc, new_kws, new_ids, new_freq, chunk_meta, emb, w_id)
                WHERE t.workspace_id = v.w_id AND t.relation_id = v.id
            """
            execute_values(cur, update_rel_sql, rels_to_update)

        if rels_to_delete:
            # Xóa các topic memberships liên quan đến các relationships bị xóa
            cur.execute(
                f"DELETE FROM {schema}.topic_memberships "
                f"WHERE workspace_id = %s AND member_type = 'relationship' AND member_id = ANY(%s)",
                (workspace_id, rels_to_delete),
            )
            cur.execute(
                f"DELETE FROM {schema}.relationships "
                f"WHERE workspace_id = %s AND relation_id = ANY(%s)",
                (workspace_id, rels_to_delete),
            )

        # 4. Xóa vật lý toàn bộ các Chunks thuộc về tài liệu này
        cur.execute(
            f"DELETE FROM {schema}.chunks "
            f"WHERE workspace_id = %s AND source_document_id = %s",
            (workspace_id, document_id),
        )

        conn.commit()  # Xác nhận lưu tất cả thay đổi nếu không có lỗi xảy ra
        cur.close()
        conn.close()
        logger.info(
            f"Đã dọn dẹp triệt để RAG data (chunks, entities, relationships, topics) cho document {document_id} "
            f"trong workspace {workspace_id} (sử dụng Batch Operations và cập nhật mô tả/embeddings)"
        )

        # 5. Kích hoạt Temporal workflow để tóm tắt lại các topics bị ảnh hưởng còn lại
        if topics_to_update:
            try:
                from app.services.srv_topic import TopicService
                await TopicService.trigger_topic_updates_via_temporal(workspace_id, topics_to_update)
                logger.info(f"Đã kích hoạt TopicUpdateWorkflow cho các topic: {topics_to_update}")
            except Exception as te:
                logger.warning(f"Không thể kích hoạt Temporal TopicUpdateWorkflow: {te}")
    except Exception as e:
        if conn:
            try:
                conn.rollback()  # Rollback toàn bộ nếu có bất kỳ lỗi nào xảy ra trong transaction
                conn.close()
            except Exception:
                pass
        logger.warning(f"Failed to cleanup RAG data: {e}")
