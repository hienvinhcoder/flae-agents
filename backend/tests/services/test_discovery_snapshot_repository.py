from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.exceptions import InvalidArgumentError
from app.services.discovery_snapshot_repository import DiscoverySnapshotRepository
from tests.services.test_discovery_snapshot_service import (
    CHECKSUM,
    GRAPH_ID,
    _bundle,
)
from app.services.discovery_snapshot_service import DiscoverySnapshotService


def _result(*, one=None):
    result = MagicMock()
    result.mappings.return_value.one.return_value = one
    result.mappings.return_value.one_or_none.return_value = one
    return result


def _repository(execute_results):
    session = MagicMock()
    session.execute = AsyncMock(side_effect=execute_results)
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    manager = MagicMock()
    manager.get_ingestion_session.return_value.__aenter__.return_value = session
    return DiscoverySnapshotRepository(manager), session


async def _snapshot():
    class Store:
        async def load_current_basis(self, _workspace_id):
            from app.schemas.discovery_catalog import DiscoverySnapshotBasis

            return DiscoverySnapshotBasis(
                graph_snapshot_id=GRAPH_ID,
                revision_set_checksum=CHECKSUM,
            )

        async def publish_atomic(self, _bundle, snapshot):
            return snapshot

    return await DiscoverySnapshotService(repository=Store()).publish(_bundle())


@pytest.mark.asyncio
async def test_atomic_publish_rechecks_basis_before_current_switch() -> None:
    basis = {"graph_snapshot_id": GRAPH_ID, "revision_set_checksum": CHECKSUM}
    repository, session = _repository(
        (
            MagicMock(),
            _result(one=basis),
            _result(one=None),
            MagicMock(),
            MagicMock(),
            _result(one=basis),
            MagicMock(),
            MagicMock(),
            MagicMock(),
        )
    )

    result = await repository.publish_atomic(_bundle(), await _snapshot())

    assert result.status == "current"
    assert session.execute.await_count == 9
    assert "pg_advisory_xact_lock" in str(session.execute.await_args_list[0].args[0])
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_basis_race_rolls_back_without_switching_current_snapshot() -> None:
    current = {"graph_snapshot_id": GRAPH_ID, "revision_set_checksum": CHECKSUM}
    stale = {
        "graph_snapshot_id": GRAPH_ID,
        "revision_set_checksum": "sha256:" + "f" * 64,
    }
    repository, session = _repository(
        (
            MagicMock(),
            _result(one=current),
            _result(one=None),
            MagicMock(),
            MagicMock(),
            _result(one=stale),
        )
    )

    with pytest.raises(InvalidArgumentError, match="changed"):
        await repository.publish_atomic(_bundle(), await _snapshot())

    session.rollback.assert_awaited_once()
    session.commit.assert_not_awaited()
