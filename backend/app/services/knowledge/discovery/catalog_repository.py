"""RLS- and source-ACL-scoped loader for the current discovery catalog."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.exceptions import ExternalServiceError, ResourceNotFoundError
from app.db.rag_db import DBManager
from app.services.knowledge.repositories.tenant import AuthorizationContext
from app.schemas.context_discovery import ContextDiscoveryResult
from app.schemas.discovery_catalog import AuthorizedCatalogSnapshot
from app.schemas.topic_discovery import TopicDiscoveryResult


class KnowledgeCatalogRepository:
    def __init__(
        self, manager: DBManager, authorization: AuthorizationContext
    ) -> None:
        self._manager = manager
        self._authorization = authorization

    async def load_current(
        self, workspace_id: UUID, subject_id: str
    ) -> AuthorizedCatalogSnapshot:
        if (
            workspace_id != self._authorization.workspace_id
            or subject_id != self._authorization.subject_id
        ):
            raise ResourceNotFoundError("Discovery catalog was not found.")
        try:
            async with self._manager.get_async_session(
                str(workspace_id), subject_id
            ) as session:
                snapshot = (
                    await session.execute(
                        text(
                            """SELECT snapshot.snapshot_id,
                                      snapshot.published_at,
                                      payload.topic_payload,
                                      payload.context_payload
                                 FROM discovery_snapshots AS snapshot
                                 JOIN discovery_snapshot_payloads AS payload
                                   ON payload.workspace_id = snapshot.workspace_id
                                  AND payload.snapshot_id = snapshot.snapshot_id
                                WHERE snapshot.workspace_id = :workspace_id
                                  AND snapshot.status = 'current'"""
                        ),
                        {"workspace_id": str(workspace_id)},
                    )
                ).mappings().one_or_none()
                if snapshot is None:
                    raise ResourceNotFoundError(
                        "Current discovery catalog was not found."
                    )
                topics = TopicDiscoveryResult.model_validate(
                    snapshot["topic_payload"]
                )
                contexts = ContextDiscoveryResult.model_validate(
                    snapshot["context_payload"]
                )
                candidate_ids = self._candidate_evidence_ids(topics, contexts)
                evidence_ids = () if not candidate_ids else (
                    await session.execute(
                        text(
                            """WITH authorized_chunks AS (
                                 SELECT revision_id, chunk_id
                                   FROM current_chunks
                                  WHERE workspace_id = :workspace_id
                                    AND (acl_scope = 'workspace'
                                         OR jsonb_exists(
                                              acl_principal_ids, :subject_id))
                               )
                               SELECT assertion.assertion_id AS evidence_id
                                 FROM assertion_evidence AS assertion
                                 JOIN authorized_chunks AS chunk
                                   ON chunk.revision_id = assertion.revision_id
                                  AND chunk.chunk_id = assertion.chunk_id
                                WHERE assertion.workspace_id = :workspace_id
                                  AND assertion.assertion_id = ANY(:candidate_ids)
                               UNION
                               SELECT observation.observation_id AS evidence_id
                                 FROM entity_observations AS observation
                                 JOIN authorized_chunks AS chunk
                                   ON chunk.revision_id = observation.revision_id
                                  AND chunk.chunk_id = observation.chunk_id
                                WHERE observation.workspace_id = :workspace_id
                                  AND observation.observation_id = ANY(:candidate_ids)
                               ORDER BY evidence_id"""
                        ),
                        {
                            "workspace_id": str(workspace_id),
                            "subject_id": subject_id,
                            "candidate_ids": list(candidate_ids),
                        },
                    )
                ).scalars().all()
        except ResourceNotFoundError:
            raise
        except SQLAlchemyError as error:
            raise ExternalServiceError(
                "Không thể đọc discovery catalog."
            ) from error
        return AuthorizedCatalogSnapshot(
            snapshot_id=snapshot["snapshot_id"],
            published_at=snapshot["published_at"],
            topics=topics,
            contexts=contexts,
            authorized_evidence_ids=tuple(evidence_ids),
        )

    @staticmethod
    def _candidate_evidence_ids(topics, contexts) -> tuple[UUID, ...]:
        values = {
            evidence_id
            for projection in (*topics.topics, *contexts.contexts)
            for membership in projection.memberships
            for evidence_id in membership.supporting_evidence_ids
        }
        values.update(
            evidence_id
            for projection in (*topics.topics, *contexts.contexts)
            if projection.summary is not None
            for evidence_id in projection.summary.supporting_evidence_ids
        )
        return tuple(sorted(values, key=str))
