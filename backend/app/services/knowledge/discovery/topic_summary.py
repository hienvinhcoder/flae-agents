"""Topic summary service: generates/updates topic summaries via LLM."""

from __future__ import annotations

from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)


class TopicSummaryService:
    """Generates or refreshes a topic's summary by reading its members and calling LLM."""

    async def update(self, *, workspace_id: str, topic_id: str) -> dict[str, object]:
        """Re-summarize a single topic. Returns metrics dict."""
        from app.services.knowledge.discovery.topics import TopicService

        topic = await TopicService.get_topic_detail(
            workspace_id=workspace_id,
            topic_id_or_slug=topic_id,
        )
        if topic is None:
            logger.warning("Topic %s not found for summary update", topic_id)
            return {"updated": False}

        # Collect evidence text from memberships
        members = topic.get("memberships", [])
        if not members:
            return {"updated": False, "reason": "no_members"}

        texts = [
            m.get("summary", "") or m.get("name", "")
            for m in members
            if m.get("summary") or m.get("name")
        ]
        if not texts:
            return {"updated": False, "reason": "no_text"}

        combined = "\n".join(texts[:20])  # limit to avoid token explosion

        # Generate summary via LLM
        api_key = settings.GEMINI_API_KEY
        model_name = settings.GEMINI_LLM_MODEL
        if not api_key:
            logger.warning("GEMINI_API_KEY not set, skipping summary generation")
            return {"updated": False, "reason": "no_api_key"}

        try:
            from google import genai

            client = genai.Client(api_key=api_key)
            prompt = (
                f"You are a knowledge curator. Summarize the following content about "
                f"'{topic.get('name', '')}' into a concise 2-3 sentence summary.\n\n"
                f"Content:\n{combined}"
            )
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
            )
            summary = (response.text or "").strip()
            if not summary:
                return {"updated": False, "reason": "empty_response"}

            # Update topic summary in DB
            from app.db.rag_db import rag_db_manager
            from sqlalchemy import text as sql_text

            async with rag_db_manager.get_async_session(workspace_id) as session:
                await session.execute(
                    sql_text(
                        f"UPDATE {rag_db_manager.schema}.topics "
                        "SET summary = :summary, updated_at = NOW() "
                        "WHERE workspace_id = :ws_id AND topic_id = :t_id"
                    ),
                    {"summary": summary, "ws_id": workspace_id, "t_id": topic_id},
                )
                await session.commit()

            logger.info("Topic %s summary updated", topic_id)
            return {"updated": True, "summary_length": len(summary)}

        except Exception as exc:
            logger.error("Failed to update topic summary for %s: %s", topic_id, exc)
            return {"updated": False, "error": str(exc)}
