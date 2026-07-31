from unittest.mock import AsyncMock, MagicMock
from datetime import UTC, datetime
from uuid import UUID

import pytest

from app.core.exceptions import InvalidArgumentError
from app.schemas.agent_memory import MembershipDerivation, MembershipTargetKind
from app.schemas.topic_discovery import TopicDiscoveryPolicy, TopicEvidenceWindow
from app.services.topic_discovery_service import TopicDiscoveryService
from app.services.topic_discovery_repository import TopicDiscoveryRepository


def _projection():
    windows = tuple(
        TopicEvidenceWindow(
            window_id=UUID(f"50000000-0000-0000-0000-{index:012d}"),
            revision_id=UUID("30000000-0000-0000-0000-000000000001"),
            chunk_id=f"chunk-{index}",
            candidate_name="Billing",
            target_kind=MembershipTargetKind.assertion,
            target_id=f"assertion-{index}",
            confidence=0.9,
            derivation=MembershipDerivation.combined,
            supporting_evidence_ids=(
                UUID(f"40000000-0000-0000-0000-{index:012d}"),
            ),
        )
        for index in (1, 2)
    )
    return TopicDiscoveryService.discover(
        workspace_id=UUID("10000000-0000-0000-0000-000000000001"),
        graph_snapshot_id=UUID("20000000-0000-0000-0000-000000000001"),
        revision_set_checksum="sha256:" + "a" * 64,
        evidence_windows=windows,
        taxonomy_version="taxonomy-v1",
        observed_at=datetime(2026, 7, 30, tzinfo=UTC),
        policy=TopicDiscoveryPolicy(),
    )


def _repository(existing_checksum=None):
    session = MagicMock()
    session.scalar = AsyncMock(return_value=existing_checksum)
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    manager = MagicMock()
    manager.get_ingestion_session.return_value.__aenter__.return_value = session
    return TopicDiscoveryRepository(manager), session


def _mapped_result(*, one=None, rows=()):
    result = MagicMock()
    result.mappings.return_value.one_or_none.return_value = one
    result.mappings.return_value.all.return_value = rows
    return result


@pytest.mark.asyncio
async def test_persist_writes_one_immutable_version_and_all_provenance() -> None:
    projection = _projection()
    repository, session = _repository()

    persisted = await repository.persist(projection)

    assert persisted == projection
    assert session.execute.await_count == 6
    assert "pg_advisory_xact_lock" in str(session.execute.await_args_list[0].args[0])
    session.commit.assert_awaited_once()
    session.rollback.assert_not_awaited()


@pytest.mark.asyncio
async def test_identical_retry_is_a_noop() -> None:
    projection = _projection()
    repository, session = _repository(projection.taxonomy_checksum)

    persisted = await repository.persist(projection)

    assert persisted == projection
    assert session.execute.await_count == 1
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_conflicting_retry_is_rejected() -> None:
    projection = _projection()
    repository, session = _repository("sha256:" + "f" * 64)

    with pytest.raises(InvalidArgumentError, match="conflicts"):
        await repository.persist(projection)

    assert session.execute.await_count == 1


@pytest.mark.asyncio
async def test_load_latest_reconstructs_topic_identity_and_memberships() -> None:
    projection = _projection()
    topic = projection.topics[0]
    membership = topic.memberships[0]
    run_result = _mapped_result(
        one={
            "discovery_run_id": projection.discovery_run_id,
            "taxonomy_version": projection.taxonomy_version,
        }
    )
    topic_result = _mapped_result(
        rows=(
            {
                "topic_id": topic.topic_id,
                "name": topic.name,
                "aliases": list(topic.aliases),
                "lifecycle": topic.lifecycle.value,
                "primary_parent_id": None,
                "secondary_parent_ids": [],
                "promotion_evidence_count": topic.promotion_evidence_count,
            },
        )
    )
    membership_result = _mapped_result(
        rows=(
            {
                "topic_id": topic.topic_id,
                **membership.model_dump(mode="json"),
                "first_seen_snapshot_id": membership.first_seen_snapshot_id,
                "last_seen_snapshot_id": membership.last_seen_snapshot_id,
            },
        )
    )
    lineage_result = _mapped_result(
        rows=tuple(item.model_dump(mode="python") for item in projection.lineage)
    )
    repository, session = _repository()
    session.execute.side_effect = (
        run_result,
        topic_result,
        membership_result,
        lineage_result,
    )

    loaded = await repository.load_latest(projection.workspace_id)

    assert loaded[0].topic_id == topic.topic_id
    assert loaded[0].memberships[0].membership_id == membership.membership_id
    assert loaded[0].lineage == projection.lineage
