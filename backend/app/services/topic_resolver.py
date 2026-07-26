import re
import uuid
import unicodedata
from typing import Optional, List, Dict, Any

from sqlalchemy import select, update, and_, or_, text

from app.core.config import settings
from app.core.logger import get_logger
from app.db.rag_db import rag_db_manager
from app.models.topic import Topic, TopicMembership, TopicAlias, TopicUpdateQueue

logger = get_logger(__name__)


def slugify(text_val: str) -> str:
    """Tạo slug chuẩn SEO từ text."""
    # Chuyển tiếng Việt có dấu sang không dấu
    text_val = unicodedata.normalize('NFKD', text_val).encode('ascii', 'ignore').decode('utf-8')
    text_val = re.sub(r'[^\w\s-]', '', text_val).strip().lower()
    return re.sub(r'[-\s]+', '-', text_val)


async def pre_filter_topics(
    workspace_id: str,
    chunk_embedding: List[float],
    text_content: str,
    entity_names: List[str]
) -> List[Dict[str, Any]]:
    """Lọc trước danh sách topic ứng viên dựa trên vector similarity và alias matching."""
    async with rag_db_manager.get_async_session(workspace_id) as session:
        # 1. Tìm các topic tương đồng vector (Cosine similarity)
        # pgvector <=> cosine distance. similarity = 1 - distance
        candidates = {}
        if chunk_embedding:
            stmt = text(f"""
                SELECT
                    topic_id,
                    name,
                    type,
                    summary,
                    1 - (embedding <=> CAST(:embedding AS vector)) as similarity
                FROM {rag_db_manager.schema}.topics
                WHERE workspace_id = :ws_id AND status != 'archived'
                ORDER BY embedding <=> CAST(:embedding AS vector)
                LIMIT 5
            """)
            vector_res = await session.execute(stmt, {"embedding": str(chunk_embedding), "ws_id": workspace_id})

            for row in vector_res:
                similarity = float(row.similarity) if row.similarity is not None else 0.0
                if similarity >= 0.65:  # Lọc thô similarity tương đối trước
                    candidates[row.topic_id] = {
                        "topic_id": row.topic_id,
                        "name": row.name,
                        "type": row.type,
                        "summary": row.summary or "",
                        "score": similarity
                    }

        # 2. Khớp các thực thể hoặc từ khóa với alias
        if entity_names:
            # Query các alias khớp với thực thể
            alias_stmt = select(TopicAlias).where(
                and_(
                    TopicAlias.workspace_id == workspace_id,
                    TopicAlias.alias.in_(entity_names)
                )
            )
            alias_res = await session.execute(alias_stmt)
            aliases = alias_res.scalars().all()

            for al in aliases:
                if al.topic_id not in candidates:
                    # Fetch topic details
                    t_stmt = select(Topic).where(and_(Topic.workspace_id == workspace_id, Topic.topic_id == al.topic_id))
                    t_res = await session.execute(t_stmt)
                    t = t_res.scalar_one_or_none()
                    if t:
                        candidates[al.topic_id] = {
                            "topic_id": t.topic_id,
                            "name": t.name,
                            "type": t.type,
                            "summary": t.summary or "",
                            "score": 0.8  # Default high score cho alias match
                        }
                else:
                    # Tăng score nếu khớp cả alias
                    candidates[al.topic_id]["score"] = float(candidates[al.topic_id]["score"]) + 0.1

        # Sắp xếp và trả về danh sách
        sorted_candidates = sorted(candidates.values(), key=lambda x: x["score"], reverse=True)
        return sorted_candidates[:10]


def resolve_topic_assignments(
    workspace_id: str,
    chunk_id: str,
    chunk_embedding: List[float],
    llm_assignments: List[Dict[str, Any]],
    llm_candidates: List[Dict[str, Any]],
    doc_id: str
) -> List[str]:
    """
    Quyết định gán topic (resolve). Đồng bộ vì chạy trong Ingestion service.
    Tạo membership và đẩy queue tóm tắt.
    Trả về danh sách topic_id bị ảnh hưởng.
    """
    # Vì đây là code chạy đồng bộ trong Temporal Activity, chúng ta mở kết nối psycopg2 đồng bộ
    conn = rag_db_manager.get_conn()
    cur = conn.cursor()

    affected_topics = []
    try:
        # Thiết lập workspace context
        cur.execute("SET LOCAL app.current_workspace_id = %s;", (workspace_id,))

        # Lấy entity_ids và relation_ids của chunk này để liên kết với các topic được gán
        cur.execute(
            f"SELECT entity_ids, relation_ids FROM {rag_db_manager.schema}.chunks "
            "WHERE workspace_id = %s AND chunk_id = %s;",
            (workspace_id, chunk_id)
        )
        row = cur.fetchone()
        entity_ids = row[0] if row and row[0] is not None else []
        relation_ids = row[1] if row and row[1] is not None else []

        # Parse phòng thủ nếu DB trả về JSON string thay vì python list
        if isinstance(entity_ids, str):
            import json
            try:
                entity_ids = json.loads(entity_ids)
            except Exception:
                entity_ids = []
        if isinstance(relation_ids, str):
            import json
            try:
                relation_ids = json.loads(relation_ids)
            except Exception:
                relation_ids = []

        def link_entities_and_relations(t_id: str, score: float):
            """Liên kết các thực thể và mối quan hệ của chunk với topic."""
            if isinstance(entity_ids, list):
                for ent_id in entity_ids:
                    mem_id = f"mem-{uuid.uuid4()}"
                    cur.execute(f"""
                        INSERT INTO {rag_db_manager.schema}.topic_memberships
                        (workspace_id, membership_id, topic_id, member_type, member_id, relevance_score, evidence_count, status)
                        VALUES (%s, %s, %s, 'entity', %s, %s, 1, 'active')
                        ON CONFLICT (workspace_id, topic_id, member_type, member_id) DO UPDATE
                        SET relevance_score = EXCLUDED.relevance_score,
                            evidence_count = topic_memberships.evidence_count + 1,
                            status = 'active';
                    """, (workspace_id, mem_id, t_id, ent_id, score))

            if isinstance(relation_ids, list):
                for rel_id in relation_ids:
                    mem_id = f"mem-{uuid.uuid4()}"
                    cur.execute(f"""
                        INSERT INTO {rag_db_manager.schema}.topic_memberships
                        (workspace_id, membership_id, topic_id, member_type, member_id, relevance_score, evidence_count, status)
                        VALUES (%s, %s, %s, 'relationship', %s, %s, 1, 'active')
                        ON CONFLICT (workspace_id, topic_id, member_type, member_id) DO UPDATE
                        SET relevance_score = EXCLUDED.relevance_score,
                            evidence_count = topic_memberships.evidence_count + 1,
                            status = 'active';
                    """, (workspace_id, mem_id, t_id, rel_id, score))

        # Gán ngưỡng tự động
        AUTO_ASSIGN_THRESHOLD = getattr(settings, "AUTO_ASSIGN_THRESHOLD", 0.75)

        # 1. Xử lý các topic gán sẵn từ LLM
        for assign in llm_assignments:
            topic_id = assign.get("topic_id")
            confidence = assign.get("confidence", 1.0)

            if not topic_id:
                continue

            # Tính toán score kết hợp: LLM confidence & Vector similarity
            if chunk_embedding:
                cur.execute(
                    f"SELECT 1 - (embedding <=> %s::vector) FROM {rag_db_manager.schema}.topics "
                    "WHERE workspace_id = %s AND topic_id = %s;",
                    (str(chunk_embedding), workspace_id, topic_id)
                )
                row = cur.fetchone()
                vec_similarity = float(row[0]) if row and row[0] is not None else 0.0
            else:
                vec_similarity = 0.0

            # Score kết hợp
            final_score = (confidence * 0.4) + (vec_similarity * 0.6)

            if final_score >= AUTO_ASSIGN_THRESHOLD:
                # Tạo hoặc cập nhật membership cho chunk
                membership_id = f"mem-{uuid.uuid4()}"
                cur.execute(f"""
                    INSERT INTO {rag_db_manager.schema}.topic_memberships
                    (workspace_id, membership_id, topic_id, member_type, member_id, relevance_score, evidence_count, status)
                    VALUES (%s, %s, %s, 'chunk', %s, %s, 1, 'active')
                    ON CONFLICT (workspace_id, topic_id, member_type, member_id) DO UPDATE
                    SET relevance_score = EXCLUDED.relevance_score,
                        evidence_count = topic_memberships.evidence_count + 1,
                        status = 'active';
                """, (workspace_id, membership_id, topic_id, chunk_id, final_score))

                # Tạo liên kết document membership (evidence gián tiếp)
                doc_mem_id = f"mem-{uuid.uuid4()}"
                cur.execute(f"""
                    INSERT INTO {rag_db_manager.schema}.topic_memberships
                    (workspace_id, membership_id, topic_id, member_type, member_id, relevance_score, evidence_count, status)
                    VALUES (%s, %s, %s, 'document', %s, %s, 1, 'active')
                    ON CONFLICT (workspace_id, topic_id, member_type, member_id) DO UPDATE
                    SET evidence_count = topic_memberships.evidence_count + 1;
                """, (workspace_id, doc_mem_id, topic_id, doc_id, final_score))

                # Tạo liên kết thực thể & mối quan hệ liên quan
                link_entities_and_relations(topic_id, final_score)

                affected_topics.append(topic_id)

        # 2. Xử lý các candidate mới đề xuất từ LLM
        for cand in llm_candidates:
            cand_name = cand.get("name")
            confidence = cand.get("confidence", 1.0)
            if not cand_name:
                continue

            slug = slugify(cand_name)

            # Kiểm tra xem topic candidate này đã tồn tại chưa
            cur.execute(
                f"SELECT topic_id, status FROM {rag_db_manager.schema}.topics "
                "WHERE workspace_id = %s AND slug = %s;",
                (workspace_id, slug)
            )
            row = cur.fetchone()

            if row:
                topic_id = row[0]
                # Nếu đã tồn tại, tự động tạo membership
                membership_id = f"mem-{uuid.uuid4()}"
                cur.execute(f"""
                    INSERT INTO {rag_db_manager.schema}.topic_memberships
                    (workspace_id, membership_id, topic_id, member_type, member_id, relevance_score, evidence_count, status)
                    VALUES (%s, %s, %s, 'chunk', %s, %s, 1, 'active')
                    ON CONFLICT (workspace_id, topic_id, member_type, member_id) DO UPDATE
                    SET evidence_count = topic_memberships.evidence_count + 1;
                """, (workspace_id, membership_id, topic_id, chunk_id, confidence))

                # Tạo liên kết thực thể & mối quan hệ liên quan
                link_entities_and_relations(topic_id, confidence)

                affected_topics.append(topic_id)
            else:
                # Tạo candidate topic mới ở trạng thái needs_review
                topic_id = f"topic-{uuid.uuid4()}"
                chunk_emb_str = str(chunk_embedding) if chunk_embedding else None
                cur.execute(f"""
                    INSERT INTO {rag_db_manager.schema}.topics
                    (workspace_id, topic_id, name, slug, type, status, confidence, embedding)
                    VALUES (%s, %s, %s, %s, 'topic', 'needs_review', %s, %s::vector);
                """, (workspace_id, topic_id, cand_name, slug, confidence, chunk_emb_str))

                # Tạo membership
                membership_id = f"mem-{uuid.uuid4()}"
                cur.execute(f"""
                    INSERT INTO {rag_db_manager.schema}.topic_memberships
                    (workspace_id, membership_id, topic_id, member_type, member_id, relevance_score, evidence_count, status)
                    VALUES (%s, %s, %s, 'chunk', %s, %s, 1, 'active');
                """, (workspace_id, membership_id, topic_id, chunk_id, confidence))

                # Tạo document membership
                doc_mem_id = f"mem-{uuid.uuid4()}"
                cur.execute(f"""
                    INSERT INTO {rag_db_manager.schema}.topic_memberships
                    (workspace_id, membership_id, topic_id, member_type, member_id, relevance_score, evidence_count, status)
                    VALUES (%s, %s, %s, 'document', %s, %s, 1, 'active');
                """, (workspace_id, doc_mem_id, topic_id, doc_id, confidence))

                # Tạo liên kết thực thể & mối quan hệ liên quan
                link_entities_and_relations(topic_id, confidence)

                affected_topics.append(topic_id)

        # 3. Đẩy các topics bị ảnh hưởng vào hàng đợi cập nhật
        for topic_id in set(affected_topics):
            queue_id = f"q-{uuid.uuid4()}"
            cur.execute(f"""
                INSERT INTO {rag_db_manager.schema}.topic_update_queue
                (workspace_id, queue_id, topic_id, reason, status)
                VALUES (%s, %s, %s, 'Chunk ingested/updated', 'pending')
                ON CONFLICT (workspace_id, queue_id) DO NOTHING;
            """, (workspace_id, queue_id, topic_id))

        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Error resolving topic assignments: {e}")
        raise e
    finally:
        cur.close()
        conn.close()

    return list(set(affected_topics))
