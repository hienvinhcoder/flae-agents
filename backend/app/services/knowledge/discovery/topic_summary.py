"""Topic summary generation and persistence."""

import asyncio
import json
from datetime import datetime, timezone

from sqlalchemy import and_, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import ExternalServiceError
from app.core.logger import get_logger
from app.db.rag_db import rag_db_manager
from app.models.rag.topics import Topic, TopicMembership, TopicUpdateQueue


logger = get_logger(__name__)


class TopicSummaryService:
    async def update(self, workspace_id: str, topic_id: str) -> dict[str, object]:
        logger.info(
            "Starting topic summary update for topic %s in workspace %s",
            topic_id,
            workspace_id,
        )

        async with rag_db_manager.get_async_session(workspace_id) as session:
            topic_result = await session.execute(
                select(Topic).where(
                    and_(
                        Topic.workspace_id == workspace_id,
                        Topic.topic_id == topic_id,
                    )
                )
            )
            topic = topic_result.scalar_one_or_none()
            if topic is None:
                logger.warning("Topic %s was not found in the RAG database", topic_id)
                return {"status": "skipped", "reason": "Topic not found"}

            await session.execute(
                update(TopicUpdateQueue)
                .where(
                    and_(
                        TopicUpdateQueue.workspace_id == workspace_id,
                        TopicUpdateQueue.topic_id == topic_id,
                        TopicUpdateQueue.status == "pending",
                    )
                )
                .values(status="processing")
            )
            await session.commit()

            membership_result = await session.execute(
                select(TopicMembership).where(
                    and_(
                        TopicMembership.workspace_id == workspace_id,
                        TopicMembership.topic_id == topic_id,
                        TopicMembership.status == "active",
                    )
                )
            )
            memberships = membership_result.scalars().all()

            chunk_ids: list[str] = []
            entity_ids: list[str] = []
            relation_ids: list[str] = []
            for membership in memberships:
                if membership.member_type == "chunk":
                    chunk_ids.append(membership.member_id)
                elif membership.member_type == "entity":
                    entity_ids.append(membership.member_id)
                elif membership.member_type == "relationship":
                    relation_ids.append(membership.member_id)

            chunks_text: list[str] = []
            if chunk_ids:
                chunks_result = await session.execute(
                    text(
                        f"SELECT text FROM {rag_db_manager.schema}.chunks "
                        "WHERE workspace_id = :ws_id AND chunk_id = ANY(:chunk_ids)"
                    ),
                    {"ws_id": workspace_id, "chunk_ids": chunk_ids},
                )
                chunks_text = [row[0] for row in chunks_result if row[0]]

            entities_info: list[str] = []
            if entity_ids:
                entities_result = await session.execute(
                    text(
                        f"SELECT entity_name, entity_type, description FROM "
                        f"{rag_db_manager.schema}.entities "
                        "WHERE workspace_id = :ws_id AND entity_id = ANY(:ent_ids)"
                    ),
                    {"ws_id": workspace_id, "ent_ids": entity_ids},
                )
                entities_info = [
                    f"- {row[0]} ({row[1]}): {row[2]}"
                    for row in entities_result
                    if row[0]
                ]

            relations_info: list[str] = []
            if relation_ids:
                relations_result = await session.execute(
                    text(
                        f"SELECT source_name, target_name, keywords, description FROM "
                        f"{rag_db_manager.schema}.relationships "
                        "WHERE workspace_id = :ws_id AND relation_id = ANY(:rel_ids)"
                    ),
                    {"ws_id": workspace_id, "rel_ids": relation_ids},
                )
                relations_info = [
                    f"- {row[0]} -> {row[1]} ({row[2]}): {row[3]}"
                    for row in relations_result
                    if row[0]
                ]

            if not chunks_text and not entities_info:
                logger.warning("No evidence was found for topic %s", topic.name)
                await session.execute(
                    update(TopicUpdateQueue)
                    .where(
                        and_(
                            TopicUpdateQueue.workspace_id == workspace_id,
                            TopicUpdateQueue.topic_id == topic_id,
                            TopicUpdateQueue.status == "processing",
                        )
                    )
                    .values(status="completed")
                )
                await session.commit()
                return {"status": "skipped", "reason": "No evidence"}

            prompt = self._build_prompt(
                topic.name, chunks_text, entities_info, relations_info
            )
            try:
                summary_text, current_state_text = await asyncio.to_thread(
                    self._generate_summary,
                    prompt,
                )
            except ExternalServiceError:
                logger.exception("Topic summary provider failed for topic %s", topic_id)
                await self._mark_queue_failed(session, workspace_id, topic_id)
                raise
            except Exception as error:
                logger.exception("Topic summary provider failed for topic %s", topic_id)
                await self._mark_queue_failed(session, workspace_id, topic_id)
                raise ExternalServiceError("Topic summary provider unavailable") from error

            topic.summary = summary_text
            topic.current_state = current_state_text
            topic.updated_at = datetime.now(timezone.utc)

            if summary_text:
                try:
                    embedding = await self._generate_embedding(topic.name, summary_text)
                    if embedding is not None:
                        topic.embedding = embedding
                except Exception:
                    logger.warning(
                        "Could not update the embedding for topic %s",
                        topic.name,
                        exc_info=True,
                    )

            await session.execute(
                update(TopicUpdateQueue)
                .where(
                    and_(
                        TopicUpdateQueue.workspace_id == workspace_id,
                        TopicUpdateQueue.topic_id == topic_id,
                        TopicUpdateQueue.status == "processing",
                    )
                )
                .values(status="completed")
            )
            await session.commit()

        logger.info("Topic summary updated successfully for topic %s", topic.name)
        return {"status": "completed", "topic_id": topic_id}

    @staticmethod
    async def _mark_queue_failed(
        session: AsyncSession, workspace_id: str, topic_id: str
    ) -> None:
        await session.execute(
            update(TopicUpdateQueue)
            .where(
                and_(
                    TopicUpdateQueue.workspace_id == workspace_id,
                    TopicUpdateQueue.topic_id == topic_id,
                    TopicUpdateQueue.status == "processing",
                )
            )
            .values(status="failed")
        )
        await session.commit()

    @staticmethod
    def _build_prompt(
        topic_name: str,
        chunks_text: list[str],
        entities_info: list[str],
        relations_info: list[str],
    ) -> str:
        chunks = "\n---\n".join(chunks_text[:15])
        entities = "\n".join(entities_info[:30])
        relations = "\n".join(relations_info[:30])
        language = (
            "Vietnamese"
            if getattr(settings, "DEFAULT_LANGUAGE", "vi") == "vi"
            else "English"
        )
        return f"""
You are an AI Architect. Analyze the following knowledge chunks and graph components grouped under the topic "{topic_name}".
Generate a high-quality summary and current state description of this topic in {language}.

Entities:
{entities}

Relationships:
{relations}

Chunks of text:
{chunks}

Output strictly as a JSON object with two fields:
1. "summary": A comprehensive markdown summary of the topic.
2. "current_state": A brief description of the current status/developments of this topic.

Do not output any markdown formatting other than the JSON itself.
"""

    @staticmethod
    def _generate_summary(prompt: str) -> tuple[str, str]:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model=settings.GEMINI_LLM_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )
        if response.text is None:
            raise ValueError("Gemini API returned an empty response")
        payload = json.loads(response.text)
        return payload.get("summary", ""), payload.get("current_state", "")

    @staticmethod
    async def _generate_embedding(
        topic_name: str, summary_text: str
    ) -> list[float] | None:
        from app.services.knowledge.ingestion.service import IngestionService

        embeddings, _ = await asyncio.to_thread(
            IngestionService.generate_embeddings,
            [f"{topic_name}\n{summary_text}"],
            "topics",
        )
        if embeddings and embeddings[0] is not None:
            return embeddings[0]
        return None
