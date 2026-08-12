import json
from datetime import datetime, timezone
from temporalio import activity

from app.core.config import settings
from app.core.logger import get_logger
from app.db.rag_db import rag_db_manager
from app.models.topic import Topic, TopicMembership, TopicUpdateQueue
from sqlalchemy import select, update, and_, text

logger = get_logger(__name__)


@activity.defn
async def update_topic_summary_activity(params: dict) -> dict:
    """
    Activity cập nhật tóm tắt và trạng thái hiện tại của Topic bằng LLM.
    """
    workspace_id = params["workspace_id"]
    topic_id = params["topic_id"]

    logger.info(f"Bắt đầu cập nhật tóm tắt cho Topic {topic_id} trong workspace {workspace_id}")

    # 1. Kết nối RAG DB
    async with rag_db_manager.get_async_session(workspace_id) as session:
        # Lấy thông tin topic
        t_stmt = select(Topic).where(and_(Topic.workspace_id == workspace_id, Topic.topic_id == topic_id))
        t_res = await session.execute(t_stmt)
        topic = t_res.scalar_one_or_none()

        if not topic:
            logger.warning(f"Topic {topic_id} không tồn tại trong DB RAG.")
            return {"status": "skipped", "reason": "Topic not found"}

        # Cập nhật hàng đợi sang 'processing'
        await session.execute(
            update(TopicUpdateQueue)
            .where(
                and_(
                    TopicUpdateQueue.workspace_id == workspace_id,
                    TopicUpdateQueue.topic_id == topic_id,
                    TopicUpdateQueue.status == "pending"
                )
            )
            .values(status="processing")
        )
        await session.commit()

        # 2. Truy vấn các memberships liên quan
        m_stmt = select(TopicMembership).where(
            and_(
                TopicMembership.workspace_id == workspace_id,
                TopicMembership.topic_id == topic_id,
                TopicMembership.status == "active"
            )
        )
        m_res = await session.execute(m_stmt)
        memberships = m_res.scalars().all()

        chunk_ids = []
        entity_ids = []
        relation_ids = []

        for m in memberships:
            if m.member_type == "chunk":
                chunk_ids.append(m.member_id)
            elif m.member_type == "entity":
                entity_ids.append(m.member_id)
            elif m.member_type == "relationship":
                relation_ids.append(m.member_id)

        # 3. Fetch dữ liệu thô từ RAG DB
        chunks_text = []
        if chunk_ids:
            # Query chunks
            c_stmt = text(
                f"SELECT text FROM {rag_db_manager.schema}.chunks "
                "WHERE workspace_id = :ws_id AND chunk_id = ANY(:chunk_ids)"
            )
            c_res = await session.execute(c_stmt, {"ws_id": workspace_id, "chunk_ids": chunk_ids})
            chunks_text = [row[0] for row in c_res if row[0]]

        entities_info = []
        if entity_ids:
            e_stmt = text(
                f"SELECT entity_name, entity_type, description FROM {rag_db_manager.schema}.entities "
                "WHERE workspace_id = :ws_id AND entity_id = ANY(:ent_ids)"
            )
            e_res = await session.execute(e_stmt, {"ws_id": workspace_id, "ent_ids": entity_ids})
            entities_info = [f"- {row[0]} ({row[1]}): {row[2]}" for row in e_res if row[0]]

        relations_info = []
        if relation_ids:
            r_stmt = text(
                f"SELECT source_name, target_name, keywords, description FROM {rag_db_manager.schema}.relationships "
                "WHERE workspace_id = :ws_id AND relation_id = ANY(:rel_ids)"
            )
            r_res = await session.execute(r_stmt, {"ws_id": workspace_id, "rel_ids": relation_ids})
            relations_info = [f"- {row[0]} -> {row[1]} ({row[2]}): {row[3]}" for row in r_res if row[0]]

        # Nếu không có chunks hay entities nào, bỏ qua
        if not chunks_text and not entities_info:
            logger.warning(f"Không tìm thấy evidence cho Topic {topic.name}. Skip update.")
            await session.execute(
                update(TopicUpdateQueue)
                .where(
                    and_(
                        TopicUpdateQueue.workspace_id == workspace_id,
                        TopicUpdateQueue.topic_id == topic_id,
                        TopicUpdateQueue.status == "processing"
                    )
                )
                .values(status="completed")
            )
            await session.commit()
            return {"status": "skipped", "reason": "No evidence"}

        # 4. Chuẩn bị prompt cho LLM
        chunks_str = "\n---\n".join(chunks_text[:15])  # Giới hạn 15 chunks để tránh overload token
        entities_str = "\n".join(entities_info[:30])
        relations_str = "\n".join(relations_info[:30])

        language = "Vietnamese" if getattr(settings, "DEFAULT_LANGUAGE", "vi") == "vi" else "English"

        prompt = f"""
You are an AI Architect. Analyze the following knowledge chunks and graph components grouped under the topic "{topic.name}".
Generate a high-quality summary and current state description of this topic in {language}.

Entities:
{entities_str}

Relationships:
{relations_str}

Chunks of text:
{chunks_str}

Output strictly as a JSON object with two fields:
1. "summary": A comprehensive markdown summary of the topic.
2. "current_state": A brief description of the current status/developments of this topic.

Do not output any markdown formatting other than the JSON itself.
"""

        # 5. Gọi Google Gemini API
        summary_text = ""
        current_state_text = ""
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            config = types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2
            )
            response = client.models.generate_content(
                model=settings.GEMINI_LLM_MODEL,
                contents=prompt,
                config=config
            )

            if response.text is not None:
                res_json = json.loads(response.text)
                summary_text = res_json.get("summary", "")
                current_state_text = res_json.get("current_state", "")
            else:
                raise ValueError("Gemini API returned an empty response.")
        except Exception as api_err:
            logger.error(f"Lỗi khi gọi LLM sinh tóm tắt cho topic {topic.name}: {api_err}")
            # Đánh dấu queue thất bại
            await session.execute(
                update(TopicUpdateQueue)
                .where(
                    and_(
                        TopicUpdateQueue.workspace_id == workspace_id,
                        TopicUpdateQueue.topic_id == topic_id,
                        TopicUpdateQueue.status == "processing"
                    )
                )
                .values(status="failed")
            )
            await session.commit()
            raise api_err

        # 6. Cập nhật thông tin Topic và hàng đợi
        topic.summary = summary_text
        topic.current_state = current_state_text
        topic.updated_at = datetime.now(timezone.utc)

        # Cập nhật topic embedding (embedding của topic = embedding trung bình hoặc embedding của summary)
        if summary_text:
            try:
                import asyncio
                from app.services.knowledge.ingestion.service import IngestionService
                embs, _ = await asyncio.to_thread(
                    IngestionService.generate_embeddings,
                    [f"{topic.name}\n{summary_text}"],
                    "topics"
                )
                if embs and embs[0] is not None:
                    topic.embedding = embs[0]
            except Exception as emb_err:
                logger.warning(f"Không thể cập nhật embedding cho topic {topic.name}: {emb_err}")

        await session.execute(
            update(TopicUpdateQueue)
            .where(
                and_(
                    TopicUpdateQueue.workspace_id == workspace_id,
                    TopicUpdateQueue.topic_id == topic_id,
                    TopicUpdateQueue.status == "processing"
                )
            )
            .values(status="completed")
        )
        await session.commit()

    logger.info(f"Cập nhật tóm tắt thành công cho Topic: {topic.name}")
    return {"status": "completed", "topic_id": topic_id}
