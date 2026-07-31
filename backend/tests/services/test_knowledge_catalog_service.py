from datetime import UTC, datetime
from uuid import UUID

import pytest

from app.core.exceptions import InvalidArgumentError
from app.schemas.agent_memory import (
    ContextSummary,
    EvidenceMembership,
    MembershipDerivation,
    MembershipTargetKind,
    TopicSummary,
)
from app.schemas.discovery_catalog import (
    AuthorizedCatalogSnapshot,
    CatalogListRequest,
)
from app.services.knowledge_catalog_service import KnowledgeCatalogService
from tests.services.test_discovery_snapshot_service import _bundle


PUBLIC_EVIDENCE = UUID("76000000-0000-0000-0000-000000000001")
PRIVATE_EVIDENCE = UUID("76000000-0000-0000-0000-000000000002")
NOW = datetime(2026, 7, 30, tzinfo=UTC)


def _membership(index: int, evidence_id: UUID) -> EvidenceMembership:
    return EvidenceMembership(
        membership_id=UUID(f"77000000-0000-0000-0000-{index:012d}"),
        target_kind=MembershipTargetKind.source,
        target_id=f"source-{index}",
        confidence=0.9,
        derivation=MembershipDerivation.combined,
        first_seen_snapshot_id=UUID("78000000-0000-0000-0000-000000000001"),
        last_seen_snapshot_id=UUID("78000000-0000-0000-0000-000000000001"),
        supporting_evidence_ids=(evidence_id,),
    )


def _view() -> AuthorizedCatalogSnapshot:
    bundle = _bundle()
    topic = bundle.topics.topics[0].model_copy(
        update={
            "memberships": (
                _membership(1, PUBLIC_EVIDENCE),
                _membership(2, PRIVATE_EVIDENCE),
            ),
            "summary": TopicSummary(
                topic_id=bundle.topics.topics[0].topic_id,
                text="Authorized billing navigation",
                supporting_evidence_ids=(PUBLIC_EVIDENCE,),
                generated_at=NOW,
                summary_version="summary-v1",
            ),
        }
    )
    context = bundle.contexts.contexts[0].model_copy(
        update={
            "memberships": (
                _membership(3, PUBLIC_EVIDENCE),
                _membership(4, PRIVATE_EVIDENCE),
            ),
            "summary": ContextSummary(
                context_id=bundle.contexts.contexts[0].context_id,
                text="Mixed-access context summary",
                supporting_evidence_ids=(PUBLIC_EVIDENCE, PRIVATE_EVIDENCE),
                generated_at=NOW,
                summary_version="summary-v1",
            ),
        }
    )
    return AuthorizedCatalogSnapshot(
        snapshot_id=UUID("79000000-0000-0000-0000-000000000001"),
        published_at=NOW,
        topics=bundle.topics.model_copy(update={"topics": (topic,)}),
        contexts=bundle.contexts.model_copy(update={"contexts": (context,)}),
        authorized_evidence_ids=(PUBLIC_EVIDENCE,),
    )


class FakeRepository:
    def __init__(self, view: AuthorizedCatalogSnapshot) -> None:
        self.view = view
        self.subjects = []

    async def load_current(self, workspace_id, subject_id):
        self.subjects.append((workspace_id, subject_id))
        return self.view


@pytest.mark.asyncio
async def test_acl_filtering_precedes_counts_and_summary_aggregation() -> None:
    view = _view()
    repository = FakeRepository(view)
    service = KnowledgeCatalogService(repository=repository, cursor_secret=b"test-secret")

    page = await service.list_contexts(
        CatalogListRequest(
            workspace_id=view.contexts.workspace_id,
            subject_id="user-1",
            limit=10,
        )
    )

    assert page.items[0].source_count == 1
    assert page.items[0].evidence_count == 1
    assert page.items[0].summary is None
    assert PRIVATE_EVIDENCE not in page.items[0].supporting_evidence_ids


@pytest.mark.asyncio
async def test_context_to_topic_navigation_keeps_summary_derived() -> None:
    view = _view()
    service = KnowledgeCatalogService(
        repository=FakeRepository(view), cursor_secret=b"test-secret"
    )

    detail = await service.get_context(
        workspace_id=view.contexts.workspace_id,
        subject_id="user-1",
        context_id=view.contexts.contexts[0].context_id,
    )

    assert detail.topics[0].summary is not None
    assert detail.topics[0].summary.is_derived is True
    assert detail.topics[0].summary.content_kind == "topic_navigation_summary"
    assert detail.topics[0].evidence_count == 1


@pytest.mark.asyncio
async def test_topic_page_uses_one_snapshot_load() -> None:
    view = _view()
    repository = FakeRepository(view)
    service = KnowledgeCatalogService(
        repository=repository, cursor_secret=b"test-secret"
    )

    page = await service.list_topics(
        CatalogListRequest(
            workspace_id=view.contexts.workspace_id,
            subject_id="user-1",
            limit=1,
        ),
        context_id=view.contexts.contexts[0].context_id,
    )

    assert len(page.items) == 1
    assert len(repository.subjects) == 1


@pytest.mark.asyncio
async def test_cursor_is_bound_to_workspace_snapshot_and_subject() -> None:
    view = _view()
    second_context = view.contexts.contexts[0].model_copy(
        update={
            "context_id": UUID("75000000-0000-0000-0000-000000000002"),
            "name": "Helios",
            "summary": None,
        }
    )
    view = view.model_copy(
        update={
            "contexts": view.contexts.model_copy(
                update={"contexts": (*view.contexts.contexts, second_context)}
            )
        }
    )
    service = KnowledgeCatalogService(
        repository=FakeRepository(view), cursor_secret=b"test-secret"
    )
    first = await service.list_contexts(
        CatalogListRequest(
            workspace_id=view.contexts.workspace_id,
            subject_id="user-1",
            limit=1,
        )
    )

    assert first.next_cursor is not None
    second = await service.list_contexts(
        CatalogListRequest(
            workspace_id=view.contexts.workspace_id,
            subject_id="user-1",
            limit=1,
            cursor=first.next_cursor,
        )
    )
    assert second.items[0].context_id != first.items[0].context_id

    with pytest.raises(InvalidArgumentError, match="cursor scope"):
        await service.list_contexts(
            CatalogListRequest(
                workspace_id=view.contexts.workspace_id,
                subject_id="user-2",
                limit=1,
                cursor=first.next_cursor,
            )
        )
