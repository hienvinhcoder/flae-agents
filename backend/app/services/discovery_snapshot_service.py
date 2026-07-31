"""Validate and atomically publish complete topic/context projections."""

from __future__ import annotations

from typing import Protocol
from uuid import NAMESPACE_URL, UUID, uuid5

from app.core.exceptions import InvalidArgumentError
from app.schemas.discovery_catalog import (
    DiscoveryProjectionBundle,
    DiscoverySnapshot,
    DiscoverySnapshotBasis,
)
from app.services.topic_discovery_helpers import checksum


class DiscoverySnapshotStore(Protocol):
    async def load_current_basis(
        self, workspace_id: UUID
    ) -> DiscoverySnapshotBasis: ...

    async def publish_atomic(
        self,
        bundle: DiscoveryProjectionBundle,
        snapshot: DiscoverySnapshot,
    ) -> DiscoverySnapshot: ...


class DiscoverySnapshotService:
    def __init__(self, *, repository: DiscoverySnapshotStore) -> None:
        self._repository = repository

    async def publish(
        self, bundle: DiscoveryProjectionBundle
    ) -> DiscoverySnapshot:
        workspace_id = bundle.topics.workspace_id
        basis = await self._repository.load_current_basis(workspace_id)
        if (
            basis.graph_snapshot_id != bundle.topics.graph_snapshot_id
            or basis.revision_set_checksum
            != bundle.topics.revision_set_checksum
        ):
            raise InvalidArgumentError(
                "Discovery projection is stale for the current graph basis."
            )
        discovery_checksum = checksum(
            {
                "graph_snapshot_id": str(bundle.topics.graph_snapshot_id),
                "revision_set_checksum": bundle.topics.revision_set_checksum,
                "topic_checksum": bundle.topics.taxonomy_checksum,
                "context_checksum": bundle.contexts.context_checksum,
            }
        )
        snapshot_id = uuid5(
            NAMESPACE_URL,
            f"flae:discovery-snapshot:{workspace_id}:{discovery_checksum}",
        )
        snapshot = DiscoverySnapshot(
            snapshot_id=snapshot_id,
            workspace_id=workspace_id,
            graph_snapshot_id=bundle.topics.graph_snapshot_id,
            topic_discovery_run_id=bundle.topics.discovery_run_id,
            context_discovery_run_id=bundle.contexts.discovery_run_id,
            revision_set_checksum=bundle.topics.revision_set_checksum,
            discovery_checksum=discovery_checksum,
            topic_count=len(bundle.topics.topics),
            context_count=len(bundle.contexts.contexts),
            published_at=max(
                bundle.topics.observed_at, bundle.contexts.observed_at
            ),
        )
        return await self._repository.publish_atomic(bundle, snapshot)
