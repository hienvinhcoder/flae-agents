"""Knowledge Domain service: resolve, merge, fuse, and list domains."""

import hashlib
from typing import Optional

from sqlalchemy import text

from app.core.logger import get_logger
from app.db.rag_db import rag_db_manager
from app.utils import clean_entity_name

logger = get_logger(__name__)


def get_domain_id(name: str) -> str:
    """Generate deterministic domain ID from normalized name (case-insensitive)."""
    name_clean = clean_entity_name(name).lower()
    return f"dom-{hashlib.md5(name_clean.encode('utf-8')).hexdigest()}"


def merge_domains(domains: list[dict]) -> list[dict]:
    """
    Merge duplicate domain names. Return list of merged domain dicts
    with: name, description, source_chunk_ids, frequency, descriptions.
    """
    grouped: dict[str, list[dict]] = {}
    for d in domains:
        key = clean_entity_name(d["name"]).lower()
        grouped.setdefault(key, []).append(d)

    merged = []
    for key, group in grouped.items():
        # Pick name from most frequent or first
        name = clean_entity_name(group[0]["name"])
        source_chunks = list({d["source_chunk_id"] for d in group if d.get("source_chunk_id")})
        descriptions = list({d["description"].strip() for d in group if d.get("description") and d["description"].strip()})

        merged.append({
            "name": name,
            "descriptions": descriptions,
            "source_chunk_ids": source_chunks,
            "frequency": len(group),
        })

    return merged


class DomainService:
    """DB query methods for knowledge domains."""

    @staticmethod
    async def list_domains(
        workspace_id: str,
        limit: int = 20,
        cursor: Optional[str] = None,
    ) -> dict:
        """Return paginated domains with topic_count via LEFT JOIN on topics."""
        offset = 0
        if cursor:
            try:
                offset = int(cursor)
            except ValueError:
                offset = 0

        async with rag_db_manager.get_async_session(workspace_id) as session:
            sql = text("""
                SELECT d.domain_id, d.name, d.slug, d.description,
                       d.frequency, d.status, d.confidence,
                       COUNT(t.topic_id) AS topic_count
                FROM knowledge_domains d
                LEFT JOIN topics t ON t.workspace_id = d.workspace_id
                    AND t.domain_id = d.domain_id
                WHERE d.workspace_id = :ws_id
                GROUP BY d.domain_id, d.name, d.slug, d.description,
                         d.frequency, d.status, d.confidence
                ORDER BY d.name
                LIMIT :limit OFFSET :offset
            """)
            result = await session.execute(
                sql, {"ws_id": workspace_id, "limit": limit, "offset": offset}
            )
            items = [
                {
                    "domain_id": row.domain_id,
                    "name": row.name,
                    "slug": row.slug,
                    "description": row.description,
                    "topic_count": row.topic_count,
                    "confidence": row.confidence,
                    "frequency": row.frequency,
                }
                for row in result
            ]

        next_cursor = None
        if len(items) == limit:
            next_cursor = str(offset + limit)

        return {"items": items, "next_cursor": next_cursor}

    @staticmethod
    async def get_domain(
        workspace_id: str, domain_id: str
    ) -> Optional[dict]:
        """Return a single domain with its topics from the topics table."""
        async with rag_db_manager.get_async_session(workspace_id) as session:
            sql = text("""
                SELECT domain_id, name, slug, description, frequency,
                       status, confidence
                FROM knowledge_domains
                WHERE workspace_id = :ws_id AND domain_id = :domain_id
            """)
            result = await session.execute(
                sql, {"ws_id": workspace_id, "domain_id": domain_id}
            )
            row = result.mappings().first()
            if not row:
                return None

            topic_sql = text("""
                SELECT t.topic_id, t.name, t.slug, t.summary, t.status,
                       t.confidence,
                       COUNT(m.membership_id) AS chunk_count
                FROM topics t
                LEFT JOIN topic_memberships m
                    ON m.workspace_id = t.workspace_id
                    AND m.topic_id = t.topic_id
                    AND m.member_type = 'chunk'
                    AND m.status = 'active'
                WHERE t.workspace_id = :ws_id AND t.domain_id = :domain_id
                GROUP BY t.topic_id, t.name, t.slug, t.summary, t.status,
                         t.confidence
                ORDER BY t.name
            """)
            topic_result = await session.execute(
                topic_sql, {"ws_id": workspace_id, "domain_id": domain_id}
            )
            topics = [
                {
                    "topic_id": t.topic_id,
                    "name": t.name,
                    "summary": t.summary,
                    "domain_id": domain_id,
                    "chunk_count": t.chunk_count,
                    "confidence": t.confidence,
                }
                for t in topic_result
            ]

        return {**dict(row), "topics": topics}
