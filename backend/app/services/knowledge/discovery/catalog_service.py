"""ACL-filtered context inventory and topic table-of-contents capabilities."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
from typing import Protocol
from uuid import UUID

from app.core.exceptions import InvalidArgumentError, ResourceNotFoundError
from app.schemas.agent_memory_discovery import Context, EvidenceMembership, Topic
from app.schemas.discovery_catalog import (
    AuthorizedCatalogSnapshot,
    CatalogContextDetail,
    CatalogContextItem,
    CatalogContextPage,
    CatalogListRequest,
    CatalogTopicItem,
    CatalogTopicPage,
)


class CatalogStore(Protocol):
    async def load_current(
        self, workspace_id: UUID, subject_id: str
    ) -> AuthorizedCatalogSnapshot: ...


class KnowledgeCatalogService:
    def __init__(self, *, repository: CatalogStore, cursor_secret: bytes) -> None:
        if len(cursor_secret) < 8:
            raise ValueError("catalog cursor secret must contain at least 8 bytes")
        self._repository = repository
        self._cursor_secret = cursor_secret

    async def list_contexts(
        self, request: CatalogListRequest
    ) -> CatalogContextPage:
        view = await self._repository.load_current(
            request.workspace_id, request.subject_id
        )
        authorized = set(view.authorized_evidence_ids)
        topics = self._topics(view, authorized)
        items = tuple(
            sorted(
                (
                    self._context_item(context, view, authorized, topics)
                    for context in view.contexts.contexts
                    if self._authorized_memberships(context.memberships, authorized)
                ),
                key=lambda item: (item.name.casefold(), str(item.context_id)),
            )
        )
        offset = self._offset(
            request.cursor,
            workspace_id=request.workspace_id,
            subject_id=request.subject_id,
            snapshot_id=view.snapshot_id,
            kind="contexts",
        )
        page = items[offset : offset + request.limit]
        next_offset = offset + len(page)
        next_cursor = (
            self._encode_cursor(
                workspace_id=request.workspace_id,
                subject_id=request.subject_id,
                snapshot_id=view.snapshot_id,
                kind="contexts",
                offset=next_offset,
            )
            if next_offset < len(items)
            else None
        )
        return CatalogContextPage(
            snapshot_id=view.snapshot_id,
            items=page,
            next_cursor=next_cursor,
        )

    async def get_context(
        self,
        *,
        workspace_id: UUID,
        subject_id: str,
        context_id: UUID,
    ) -> CatalogContextDetail:
        view = await self._repository.load_current(workspace_id, subject_id)
        authorized = set(view.authorized_evidence_ids)
        return self._context_detail(view, authorized, context_id)

    def _context_detail(self, view, authorized, context_id):
        context = next(
            (
                item
                for item in view.contexts.contexts
                if item.context_id == context_id
                and self._authorized_memberships(item.memberships, authorized)
            ),
            None,
        )
        if context is None:
            raise ResourceNotFoundError("Memory context was not found.")
        topics = self._topics(view, authorized)
        item = self._context_item(context, view, authorized, topics)
        return CatalogContextDetail(
            **item.model_dump(),
            topics=tuple(
                topics[topic_id]
                for topic_id in context.primary_topic_root_ids
                if topic_id in topics
            ),
        )

    async def list_topics(
        self,
        request: CatalogListRequest,
        *,
        context_id: UUID,
    ) -> CatalogTopicPage:
        view = await self._repository.load_current(
            request.workspace_id, request.subject_id
        )
        authorized = set(view.authorized_evidence_ids)
        detail = self._context_detail(view, authorized, context_id)
        offset = self._offset(
            request.cursor,
            workspace_id=request.workspace_id,
            subject_id=request.subject_id,
            snapshot_id=view.snapshot_id,
            kind=f"topics:{context_id}",
        )
        page = detail.topics[offset : offset + request.limit]
        next_offset = offset + len(page)
        next_cursor = (
            self._encode_cursor(
                workspace_id=request.workspace_id,
                subject_id=request.subject_id,
                snapshot_id=view.snapshot_id,
                kind=f"topics:{context_id}",
                offset=next_offset,
            )
            if next_offset < len(detail.topics)
            else None
        )
        return CatalogTopicPage(
            snapshot_id=view.snapshot_id,
            context_id=context_id,
            items=page,
            next_cursor=next_cursor,
        )

    @staticmethod
    def _authorized_memberships(memberships, authorized):
        return tuple(
            membership
            for membership in memberships
            if set(membership.supporting_evidence_ids) & authorized
        )

    def _topics(self, view, authorized):
        result = {}
        for topic in view.topics.topics:
            memberships = self._authorized_memberships(topic.memberships, authorized)
            if not memberships:
                continue
            evidence = self._evidence(memberships, authorized)
            result[topic.topic_id] = CatalogTopicItem(
                topic_id=topic.topic_id,
                name=topic.name,
                summary=self._summary(topic.summary, authorized),
                lineage=topic.lineage,
                source_count=len(
                    {item.target_id for item in memberships if item.target_kind.value == "source"}
                ),
                evidence_count=len(evidence),
                supporting_evidence_ids=evidence,
                freshness=view.published_at,
                confidence=max((item.confidence for item in memberships), default=0.0),
            )
        return result

    def _context_item(self, context, view, authorized, topics):
        memberships = self._authorized_memberships(context.memberships, authorized)
        evidence = self._evidence(memberships, authorized)
        topic_ids = tuple(
            topic_id for topic_id in context.primary_topic_root_ids if topic_id in topics
        )
        return CatalogContextItem(
            context_id=context.context_id,
            name=context.name,
            context_type=context.context_type,
            summary=self._summary(context.summary, authorized),
            lineage=context.lineage,
            topic_ids=topic_ids,
            topic_count=len(topic_ids),
            source_count=len(
                {item.target_id for item in memberships if item.target_kind.value == "source"}
            ),
            evidence_count=len(evidence),
            supporting_evidence_ids=evidence,
            freshness=view.published_at,
            confidence=context.confidence,
            stability_score=context.stability_score,
        )

    @staticmethod
    def _summary(summary, authorized):
        if summary is None or not set(summary.supporting_evidence_ids) <= authorized:
            return None
        return summary

    @staticmethod
    def _evidence(memberships: tuple[EvidenceMembership, ...], authorized):
        return tuple(
            sorted(
                {
                    evidence_id
                    for membership in memberships
                    for evidence_id in membership.supporting_evidence_ids
                    if evidence_id in authorized
                },
                key=str,
            )
        )

    def _encode_cursor(self, **payload) -> str:
        offset = int(payload.pop("offset"))
        raw = json.dumps(
            {"offset": offset, "scope": self._scope_fingerprint(payload)},
            separators=(",", ":"),
            sort_keys=True,
        ).encode()
        signature = hmac.new(self._cursor_secret, raw, hashlib.sha256).digest()
        return base64.urlsafe_b64encode(raw + signature).decode().rstrip("=")

    def _offset(self, cursor, **scope) -> int:
        if cursor is None:
            return 0
        try:
            padded = cursor + "=" * (-len(cursor) % 4)
            value = base64.urlsafe_b64decode(padded.encode())
            raw, signature = value[:-32], value[-32:]
            expected = hmac.new(self._cursor_secret, raw, hashlib.sha256).digest()
            if not hmac.compare_digest(signature, expected):
                raise ValueError
            payload = json.loads(raw)
            if payload.get("scope") != self._scope_fingerprint(scope):
                raise InvalidArgumentError("Catalog cursor scope does not match.")
            offset = int(payload["offset"])
            if offset < 0:
                raise ValueError
            return offset
        except InvalidArgumentError:
            raise
        except (ValueError, KeyError, TypeError, json.JSONDecodeError) as error:
            raise InvalidArgumentError("Catalog cursor is invalid.") from error

    def _scope_fingerprint(self, scope) -> str:
        normalized = json.dumps(
            {key: str(value) for key, value in scope.items()},
            separators=(",", ":"),
            sort_keys=True,
        ).encode()
        return hmac.new(
            self._cursor_secret, b"scope:" + normalized, hashlib.sha256
        ).hexdigest()
