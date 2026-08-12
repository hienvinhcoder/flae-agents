import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from sqlalchemy import select, update, delete, insert, func, or_, and_, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logger import get_logger
from app.core.exceptions import ResourceNotFoundError
from app.db.rag_db import rag_db_manager
from app.models.rag.topics import Topic, TopicAlias, TopicMembership, TopicUpdateQueue
from app.core.temporal import get_temporal_client
from app.services.knowledge.discovery.topic_resolver import slugify

logger = get_logger(__name__)


class TopicService:
    @staticmethod
    async def get_topics(
        workspace_id: str,
        query: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Lấy danh sách topics kèm theo đếm số lượng evidence (memberships)."""
        async with rag_db_manager.get_async_session(workspace_id) as session:
            # Subquery đếm số lượng active memberships
            subq = (
                select(
                    TopicMembership.topic_id,
                    func.count(TopicMembership.membership_id).label("evidence_count")
                )
                .where(
                    and_(
                        TopicMembership.workspace_id == workspace_id,
                        TopicMembership.status == "active"
                    )
                )
                .group_by(TopicMembership.topic_id)
                .subquery()
            )

            # Query chính
            stmt = (
                select(Topic, func.coalesce(subq.c.evidence_count, 0).label("evidence_count"))
                .outerjoin(subq, Topic.topic_id == subq.c.topic_id)
                .where(Topic.workspace_id == workspace_id)
            )

            if status:
                stmt = stmt.where(Topic.status == status)

            if query:
                stmt = stmt.where(
                    or_(
                        Topic.name.ilike(f"%{query}%"),
                        Topic.summary.ilike(f"%{query}%")
                    )
                )

            stmt = stmt.order_by(Topic.updated_at.desc()).offset(offset).limit(limit)
            result = await session.execute(stmt)

            topics_list = []
            for row in result:
                topic, evidence_count = row
                topics_list.append({
                    "workspace_id": topic.workspace_id,
                    "topic_id": topic.topic_id,
                    "parent_topic_id": topic.parent_topic_id,
                    "name": topic.name,
                    "slug": topic.slug,
                    "type": topic.type,
                    "summary": topic.summary,
                    "status": topic.status,
                    "confidence": topic.confidence,
                    "evidence_count": evidence_count,
                    "created_at": topic.created_at,
                    "updated_at": topic.updated_at
                })

            return topics_list

    @staticmethod
    async def get_topic_detail(
        workspace_id: str,
        topic_id_or_slug: str,
        main_db: AsyncSession
    ) -> Optional[Dict[str, Any]]:
        """Lấy thông tin chi tiết của topic cùng danh sách các liên kết tri thức (memberships)."""
        async with rag_db_manager.get_async_session(workspace_id) as session:
            # Query lấy topic
            stmt = select(Topic).where(
                and_(
                    Topic.workspace_id == workspace_id,
                    or_(Topic.topic_id == topic_id_or_slug, Topic.slug == topic_id_or_slug)
                )
            )
            topic_result = await session.execute(stmt)
            topic = topic_result.scalar_one_or_none()

            if not topic:
                return None

            # Query lấy các memberships
            m_stmt = (
                select(TopicMembership)
                .where(
                    and_(
                        TopicMembership.workspace_id == workspace_id,
                        TopicMembership.topic_id == topic.topic_id,
                        TopicMembership.status == "active"
                    )
                )
                .order_by(TopicMembership.created_at.desc())
            )
            members_result = await session.execute(m_stmt)
            memberships = members_result.scalars().all()

            # Lấy metadata bổ sung cho các memberships từ RAG DB hoặc main_db
            members_detail = []
            for m in memberships:
                meta = {}
                try:
                    if m.member_type == "chunk":
                        # Query chunk text
                        c_stmt = text(
                            f"SELECT text, source_document_id FROM {rag_db_manager.schema}.chunks "
                            "WHERE workspace_id = :ws_id AND chunk_id = :chunk_id"
                        )
                        c_res = await session.execute(c_stmt, {"ws_id": workspace_id, "chunk_id": m.member_id})
                        c_row = c_res.first()
                        if c_row:
                            meta = {"text": c_row[0][:150] + "..." if len(c_row[0]) > 150 else c_row[0], "document_id": c_row[1]}
                    elif m.member_type == "entity":
                        # Query entity details
                        e_stmt = text(
                            f"SELECT entity_name, entity_type, description FROM {rag_db_manager.schema}.entities "
                            "WHERE workspace_id = :ws_id AND entity_id = :ent_id"
                        )
                        e_res = await session.execute(e_stmt, {"ws_id": workspace_id, "ent_id": m.member_id})
                        e_row = e_res.first()
                        if e_row:
                            meta = {"name": e_row[0], "type": e_row[1], "description": e_row[2]}
                    elif m.member_type == "relationship":
                        # Query relation details
                        r_stmt = text(
                            f"SELECT source_name, target_name, keywords, description FROM {rag_db_manager.schema}.relationships "
                            "WHERE workspace_id = :ws_id AND relation_id = :rel_id"
                        )
                        r_res = await session.execute(r_stmt, {"ws_id": workspace_id, "rel_id": m.member_id})
                        r_row = r_res.first()
                        if r_row:
                            meta = {"source": r_row[0], "target": r_row[1], "keywords": r_row[2], "description": r_row[3]}
                    elif m.member_type == "document":
                        # Query document title từ main_db (flae_db)
                        from app.models.knowledge_base import KnowledgeDocument
                        doc_uuid = uuid.UUID(m.member_id)
                        doc_stmt = select(KnowledgeDocument).where(KnowledgeDocument.id == doc_uuid)
                        doc_res = await main_db.execute(doc_stmt)
                        doc = doc_res.scalar_one_or_none()
                        if doc:
                            meta = {"title": doc.title, "document_type": doc.document_type.value}
                except Exception as ex:
                    logger.warning(f"Failed to fetch metadata for membership {m.membership_id}: {ex}")

                members_detail.append({
                    "member_type": m.member_type,
                    "member_id": m.member_id,
                    "relevance_score": m.relevance_score,
                    "evidence_count": m.evidence_count,
                    "created_at": m.created_at,
                    "metadata": meta
                })

            return {
                "workspace_id": topic.workspace_id,
                "topic_id": topic.topic_id,
                "parent_topic_id": topic.parent_topic_id,
                "name": topic.name,
                "slug": topic.slug,
                "type": topic.type,
                "summary": topic.summary,
                "current_state": topic.current_state,
                "status": topic.status,
                "confidence": topic.confidence,
                "created_at": topic.created_at,
                "updated_at": topic.updated_at,
                "members": members_detail
            }

    @staticmethod
    async def update_topic(
        workspace_id: str,
        topic_id: str,
        payload: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Cập nhật thông tin topic trong RAG DB."""
        async with rag_db_manager.get_async_session(workspace_id) as session:
            stmt = select(Topic).where(and_(Topic.workspace_id == workspace_id, Topic.topic_id == topic_id))
            result = await session.execute(stmt)
            topic = result.scalar_one_or_none()

            if not topic:
                return None

            if "name" in payload and payload["name"]:
                topic.name = payload["name"]
                topic.slug = slugify(payload["name"])
            if "parent_topic_id" in payload:
                topic.parent_topic_id = payload["parent_topic_id"]
            if "summary" in payload:
                topic.summary = payload["summary"]
            if "current_state" in payload:
                topic.current_state = payload["current_state"]
            if "status" in payload:
                topic.status = payload["status"]
            if "confidence" in payload:
                topic.confidence = payload["confidence"]

            topic.updated_at = datetime.now(timezone.utc)
            await session.commit()

            return {
                "workspace_id": topic.workspace_id,
                "topic_id": topic.topic_id,
                "name": topic.name,
                "slug": topic.slug,
                "status": topic.status
            }

    @staticmethod
    async def merge_topics(
        workspace_id: str,
        target_topic_id: str,
        source_topic_ids: List[str]
    ) -> bool:
        """Gộp các topics nguồn vào topic đích, tạo alias và trigger Temporal tóm tắt lại."""
        if not source_topic_ids:
            return False

        async with rag_db_manager.get_async_session(workspace_id) as session:
            # 1. Kiểm tra topic đích có tồn tại không
            t_stmt = select(Topic).where(and_(Topic.workspace_id == workspace_id, Topic.topic_id == target_topic_id))
            target_result = await session.execute(t_stmt)
            target_topic = target_result.scalar_one_or_none()

            if not target_topic:
                raise ResourceNotFoundError("Target topic không tồn tại.")

            # 2. Lấy danh sách các topic nguồn thực sự tồn tại
            s_stmt = select(Topic).where(
                and_(
                    Topic.workspace_id == workspace_id,
                    Topic.topic_id.in_(source_topic_ids)
                )
            )
            sources_result = await session.execute(s_stmt)
            source_topics = sources_result.scalars().all()

            if not source_topics:
                return False

            # 3. Với mỗi topic nguồn, xử lý gộp memberships
            for src in source_topics:
                # Lấy tất cả memberships của topic nguồn
                m_stmt = select(TopicMembership).where(
                    and_(
                        TopicMembership.workspace_id == workspace_id,
                        TopicMembership.topic_id == src.topic_id
                    )
                )
                m_res = await session.execute(m_stmt)
                src_memberships = m_res.scalars().all()

                for m in src_memberships:
                    # Kiểm tra xem target topic đã có membership tương tự chưa
                    check_stmt = select(TopicMembership).where(
                        and_(
                            TopicMembership.workspace_id == workspace_id,
                            TopicMembership.topic_id == target_topic_id,
                            TopicMembership.member_type == m.member_type,
                            TopicMembership.member_id == m.member_id
                        )
                    )
                    check_res = await session.execute(check_stmt)
                    existing = check_res.scalar_one_or_none()

                    if existing:
                        # Gộp relevance score và evidence count
                        existing.relevance_score = max(existing.relevance_score, m.relevance_score)
                        existing.evidence_count += m.evidence_count
                        # Xóa membership cũ
                        await session.delete(m)
                    else:
                        # Cập nhật topic_id sang target_topic_id
                        m.topic_id = target_topic_id

                # 4. Tạo alias cho topic nguồn trỏ về topic đích
                alias_id = f"alias-{uuid.uuid4()}"
                new_alias = TopicAlias(
                    workspace_id=workspace_id,
                    alias_id=alias_id,
                    topic_id=target_topic_id,
                    alias=src.name
                )
                session.add(new_alias)

                # Cũng gom các aliases hiện có của topic nguồn sang topic đích
                await session.execute(
                    update(TopicAlias)
                    .where(and_(TopicAlias.workspace_id == workspace_id, TopicAlias.topic_id == src.topic_id))
                    .values(topic_id=target_topic_id)
                )

                # 5. Xóa topic nguồn
                await session.delete(src)

            # 6. Đẩy target_topic vào hàng đợi cập nhật
            queue_id = f"q-{uuid.uuid4()}"
            queue_entry = TopicUpdateQueue(
                workspace_id=workspace_id,
                queue_id=queue_id,
                topic_id=target_topic_id,
                reason="Merged topics",
                status="pending"
            )
            session.add(queue_entry)

            await session.commit()

        # 7. Kích hoạt Temporal Workflow cập nhật tóm tắt topic đích
        await TopicService.trigger_topic_updates_via_temporal(workspace_id, [target_topic_id])
        return True

    @staticmethod
    async def pre_filter_topics(
        workspace_id: str,
        chunk_embedding: List[float],
        text_content: str,
        entity_names: List[str]
    ) -> List[Dict[str, Any]]:
        """Lọc trước danh sách topic ứng viên dựa trên vector similarity và alias matching."""
        from app.services.knowledge.discovery.topic_resolver import pre_filter_topics as _pre_filter
        return await _pre_filter(workspace_id, chunk_embedding, text_content, entity_names)

    @staticmethod
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
        """
        from app.services.knowledge.discovery.topic_resolver import resolve_topic_assignments as _resolve
        return _resolve(workspace_id, chunk_id, chunk_embedding, llm_assignments, llm_candidates, doc_id)

    @staticmethod
    async def trigger_topic_updates_via_temporal(workspace_id: str, topic_ids: List[str]) -> None:
        """Khởi chạy Temporal workflow TopicUpdateWorkflow cho các topic bị ảnh hưởng."""
        if not topic_ids:
            return

        from app.temporal.workflows.topic import TopicUpdateWorkflow
        client = await get_temporal_client()

        for t_id in set(topic_ids):
            workflow_id = f"topic-update-{workspace_id}-{t_id}"
            params = {
                "workspace_id": workspace_id,
                "topic_id": t_id
            }
            try:
                # Sử dụng WorkflowIDReusePolicy.ALLOW_DUPLICATE_FAILED_ONLY hoặc tương ứng
                # Để nếu workflow đang chạy thì thôi không trigger mới (hoặc debounce tự nhiên bằng temporal timer)
                await client.start_workflow(
                    TopicUpdateWorkflow.run,
                    params,
                    id=workflow_id,
                    task_queue="flae-default-queue"  # Cùng task queue với ingestion
                )
                logger.info(f"Started Temporal TopicUpdateWorkflow for topic: {t_id}")
            except Exception as e:
                # Tránh lỗi nếu workflow trùng ID đang chạy
                logger.debug(f"Workflow {workflow_id} might already be running or failed starting: {e}")

    @staticmethod
    async def request_re_summarize(workspace_id: str, topic_id: str) -> None:
        """Đẩy yêu cầu tóm tắt lại topic vào hàng đợi và trigger Temporal workflow."""
        async with rag_db_manager.get_async_session(workspace_id) as session:
            queue_id = f"q-{uuid.uuid4()}"
            await session.execute(
                text(f"INSERT INTO {rag_db_manager.schema}.topic_update_queue "
                     "(workspace_id, queue_id, topic_id, reason, status) "
                     "VALUES (:ws_id, :q_id, :t_id, 'User requested re-summarize', 'pending')"),
                {"ws_id": workspace_id, "q_id": queue_id, "t_id": topic_id}
            )
            await session.commit()

        await TopicService.trigger_topic_updates_via_temporal(workspace_id, [topic_id])
