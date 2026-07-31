from datetime import UTC, datetime
from uuid import UUID

import pytest
from pydantic import ValidationError

from app.core.exceptions import InvalidArgumentError
from app.schemas.agent_memory import Context, TaxonomyLifecycle, Topic
from app.schemas.context_discovery import ContextDiscoveryResult
from app.schemas.discovery_catalog import (
    DiscoveryProjectionBundle,
    DiscoverySnapshotBasis,
)
from app.schemas.topic_discovery import TopicDiscoveryResult
from app.services.discovery_snapshot_service import DiscoverySnapshotService


WORKSPACE_ID = UUID("70000000-0000-0000-0000-000000000001")
GRAPH_ID = UUID("71000000-0000-0000-0000-000000000001")
TOPIC_RUN_ID = UUID("72000000-0000-0000-0000-000000000001")
CONTEXT_RUN_ID = UUID("73000000-0000-0000-0000-000000000001")
TOPIC_ID = UUID("74000000-0000-0000-0000-000000000001")
CONTEXT_ID = UUID("75000000-0000-0000-0000-000000000001")
CHECKSUM = "sha256:" + "a" * 64
NOW = datetime(2026, 7, 30, tzinfo=UTC)


def _bundle() -> DiscoveryProjectionBundle:
    topic = Topic(
        topic_id=TOPIC_ID,
        workspace_id=WORKSPACE_ID,
        name="Billing",
        lifecycle=TaxonomyLifecycle.active,
        promotion_evidence_count=2,
        discovery_version="topic-v1",
    )
    topics = TopicDiscoveryResult(
        discovery_run_id=TOPIC_RUN_ID,
        workspace_id=WORKSPACE_ID,
        graph_snapshot_id=GRAPH_ID,
        revision_set_checksum=CHECKSUM,
        taxonomy_version="topic-v1",
        input_checksum="sha256:" + "b" * 64,
        taxonomy_checksum="sha256:" + "c" * 64,
        observed_at=NOW,
        topics=(topic,),
        taxonomy_change_count=1,
        taxonomy_churn=1.0,
    )
    context = Context(
        context_id=CONTEXT_ID,
        workspace_id=WORKSPACE_ID,
        name="Aurora",
        context_type="project",
        lifecycle=TaxonomyLifecycle.active,
        confidence=0.9,
        stability_score=0.8,
        primary_topic_root_ids=(TOPIC_ID,),
        discovery_version="context-v1",
    )
    contexts = ContextDiscoveryResult(
        discovery_run_id=CONTEXT_RUN_ID,
        workspace_id=WORKSPACE_ID,
        topic_discovery_run_id=TOPIC_RUN_ID,
        revision_set_checksum=CHECKSUM,
        discovery_version="context-v1",
        input_checksum="sha256:" + "d" * 64,
        context_checksum="sha256:" + "e" * 64,
        observed_at=NOW,
        contexts=(context,),
        taxonomy_change_count=1,
        taxonomy_churn=1.0,
    )
    return DiscoveryProjectionBundle(topics=topics, contexts=contexts)


class FakeRepository:
    def __init__(self, basis: DiscoverySnapshotBasis) -> None:
        self.basis = basis
        self.published = None

    async def load_current_basis(self, workspace_id):
        assert workspace_id == WORKSPACE_ID
        return self.basis

    async def publish_atomic(self, bundle, snapshot):
        self.published = (bundle, snapshot)
        return snapshot


@pytest.mark.asyncio
async def test_complete_current_bundle_publishes_deterministic_snapshot() -> None:
    repository = FakeRepository(
        DiscoverySnapshotBasis(
            graph_snapshot_id=GRAPH_ID,
            revision_set_checksum=CHECKSUM,
        )
    )
    service = DiscoverySnapshotService(repository=repository)

    first = await service.publish(_bundle())
    replay = await service.publish(_bundle())

    assert first.snapshot_id == replay.snapshot_id
    assert first.discovery_checksum == replay.discovery_checksum
    assert repository.published is not None


@pytest.mark.asyncio
async def test_stale_graph_basis_never_reaches_atomic_switch() -> None:
    repository = FakeRepository(
        DiscoverySnapshotBasis(
            graph_snapshot_id=UUID("71000000-0000-0000-0000-000000000099"),
            revision_set_checksum=CHECKSUM,
        )
    )
    service = DiscoverySnapshotService(repository=repository)

    with pytest.raises(InvalidArgumentError, match="stale"):
        await service.publish(_bundle())

    assert repository.published is None


def test_partial_or_cross_revision_bundle_is_rejected() -> None:
    bundle = _bundle()
    mismatched = bundle.contexts.model_copy(
        update={"revision_set_checksum": "sha256:" + "f" * 64}
    )

    with pytest.raises(ValidationError, match="revision set"):
        DiscoveryProjectionBundle(topics=bundle.topics, contexts=mismatched)


def test_context_cannot_reference_topic_outside_snapshot() -> None:
    bundle = _bundle()
    invalid_context = bundle.contexts.contexts[0].model_copy(
        update={"primary_topic_root_ids": (UUID("74000000-0000-0000-0000-000000000099"),)}
    )

    with pytest.raises(ValidationError, match="unknown topic"):
        DiscoveryProjectionBundle(
            topics=bundle.topics,
            contexts=bundle.contexts.model_copy(update={"contexts": (invalid_context,)}),
        )
