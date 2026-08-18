from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.knowledge.repositories.tenant import AuthorizationContext
from app.services.knowledge.discovery.catalog_repository import KnowledgeCatalogRepository
from tests.services.test_knowledge_catalog_service import PUBLIC_EVIDENCE, _view


def _rows(*, one=None, all_rows=()):
    result = MagicMock()
    result.mappings.return_value.one_or_none.return_value = one
    result.scalars.return_value.all.return_value = all_rows
    return result


@pytest.mark.asyncio
async def test_repository_applies_source_acl_before_returning_evidence_ids() -> None:
    view = _view()
    snapshot_row = {
        "snapshot_id": view.snapshot_id,
        "published_at": view.published_at,
        "topic_payload": view.topics.model_dump(mode="json"),
        "context_payload": view.contexts.model_dump(mode="json"),
    }
    session = MagicMock()
    session.execute = AsyncMock(
        side_effect=(
            _rows(one=snapshot_row),
            _rows(all_rows=(PUBLIC_EVIDENCE,)),
        )
    )
    manager = MagicMock()
    manager.get_async_session.return_value.__aenter__.return_value = session
    authorization = AuthorizationContext(
        workspace_id=view.contexts.workspace_id,
        subject_id="user-1",
        authorization_version="acl-v1",
    )
    repository = KnowledgeCatalogRepository(manager, authorization)

    loaded = await repository.load_current(
        view.contexts.workspace_id, "user-1"
    )

    assert loaded.authorized_evidence_ids == (PUBLIC_EVIDENCE,)
    manager.get_async_session.assert_called_once_with(
        str(view.contexts.workspace_id), "user-1"
    )
    acl_sql = str(session.execute.await_args_list[1].args[0])
    assert "current_chunks" in acl_sql
    assert "jsonb_exists" in acl_sql
    assert "ANY(:candidate_ids)" in acl_sql
