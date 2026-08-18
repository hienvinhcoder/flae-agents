# tests/services/test_domain_service.py

import pytest
import hashlib
from unittest.mock import patch, AsyncMock, MagicMock


def test_get_domain_id_normalization():
    from app.services.knowledge_base.domain_service import get_domain_id

    assert get_domain_id("Technology") == get_domain_id("technology")
    assert get_domain_id("  Tech  ") == get_domain_id("Tech")
    assert get_domain_id("AI & ML") == get_domain_id("ai & ml")


def test_get_domain_id_format():
    from app.services.knowledge_base.domain_service import get_domain_id

    did = get_domain_id("Technology")
    assert did.startswith("dom-")
    assert len(did) == 36  # "dom-" (4) + 32-char md5 hex


def test_merge_domains_groups_and_counts():
    from app.services.knowledge_base.domain_service import merge_domains

    domains = [
        {"name": "Tech", "description": "First", "source_chunk_id": "c1"},
        {"name": "Tech", "description": "Second", "source_chunk_id": "c2"},
        {"name": "Business", "description": "Biz", "source_chunk_id": "c3"},
    ]
    merged = merge_domains(domains)

    assert len(merged) == 2
    tech = next(m for m in merged if m["name"] == "Tech")
    assert tech["frequency"] == 2
    assert set(tech["source_chunk_ids"]) == {"c1", "c2"}
    assert len(tech["descriptions"]) == 2


def test_merge_domains_empty():
    from app.services.knowledge_base.domain_service import merge_domains

    assert merge_domains([]) == []


# ── DomainService DB query tests ──


@pytest.mark.asyncio
async def test_list_domains():
    from app.services.knowledge_base.domain_service import DomainService

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_row = MagicMock()
    mock_row.domain_id = "dom-abc"
    mock_row.name = "Technology"
    mock_row.slug = "technology"
    mock_row.description = "Tech industry"
    mock_row.frequency = 5
    mock_row.status = "active"
    mock_row.confidence = 0.9
    mock_row.topic_count = 3
    mock_result.__iter__ = MagicMock(return_value=iter([mock_row]))
    mock_session.execute = AsyncMock(return_value=mock_result)

    mock_db = MagicMock()
    mock_cm = AsyncMock()
    mock_cm.__aenter__ = AsyncMock(return_value=mock_session)
    mock_cm.__aexit__ = AsyncMock(return_value=False)
    mock_db.get_async_session.return_value = mock_cm

    with patch(
        "app.services.knowledge_base.domain_service.rag_db_manager", mock_db
    ):
        page = await DomainService.list_domains(workspace_id="ws-1", limit=20)

    assert len(page["items"]) == 1
    assert page["items"][0]["domain_id"] == "dom-abc"
    assert page["items"][0]["name"] == "Technology"
    assert page["items"][0]["topic_count"] == 3
    assert page["next_cursor"] is None


@pytest.mark.asyncio
async def test_list_domains_pagination():
    from app.services.knowledge_base.domain_service import DomainService

    mock_session = AsyncMock()
    mock_result = MagicMock()
    # Return exactly `limit` items to trigger next_cursor
    mock_rows = [MagicMock(domain_id=f"dom-{i}", name=f"Domain {i}",
                           slug=f"domain-{i}", description=f"Desc {i}",
                           frequency=i, status="active", confidence=0.9,
                           topic_count=0) for i in range(5)]
    mock_result.__iter__ = MagicMock(return_value=iter(mock_rows))
    mock_session.execute = AsyncMock(return_value=mock_result)

    mock_db = MagicMock()
    mock_cm = AsyncMock()
    mock_cm.__aenter__ = AsyncMock(return_value=mock_session)
    mock_cm.__aexit__ = AsyncMock(return_value=False)
    mock_db.get_async_session.return_value = mock_cm

    with patch(
        "app.services.knowledge_base.domain_service.rag_db_manager", mock_db
    ):
        page = await DomainService.list_domains(workspace_id="ws-1", limit=5)

    assert len(page["items"]) == 5
    assert page["next_cursor"] == "5"


@pytest.mark.asyncio
async def test_list_domains_empty():
    from app.services.knowledge_base.domain_service import DomainService

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.__iter__ = MagicMock(return_value=iter([]))
    mock_session.execute = AsyncMock(return_value=mock_result)

    mock_db = MagicMock()
    mock_cm = AsyncMock()
    mock_cm.__aenter__ = AsyncMock(return_value=mock_session)
    mock_cm.__aexit__ = AsyncMock(return_value=False)
    mock_db.get_async_session.return_value = mock_cm

    with patch(
        "app.services.knowledge_base.domain_service.rag_db_manager", mock_db
    ):
        page = await DomainService.list_domains(workspace_id="ws-1", limit=20)

    assert page["items"] == []
    assert page["next_cursor"] is None


@pytest.mark.asyncio
async def test_get_domain():
    from app.services.knowledge_base.domain_service import DomainService

    mock_session = AsyncMock()

    # Domain query result
    domain_row = MagicMock()
    domain_row._mapping = {
        "domain_id": "dom-abc",
        "name": "Technology",
        "slug": "technology",
        "description": "Tech industry",
        "frequency": 5,
        "status": "active",
        "confidence": 0.9,
    }
    domain_result = MagicMock()
    domain_result.mappings.return_value.first.return_value = domain_row._mapping

    # Topics query result
    topic_row = MagicMock()
    topic_row.topic_id = "topic-1"
    topic_row.name = "AI"
    topic_row.summary = "Artificial Intelligence"
    topic_row.confidence = 0.85
    topic_row.chunk_count = 3
    topic_result = MagicMock()
    topic_result.__iter__ = MagicMock(return_value=iter([topic_row]))

    call_count = [0]

    async def mock_execute(sql, params):
        call_count[0] += 1
        if call_count[0] == 1:
            return domain_result
        return topic_result

    mock_session.execute = mock_execute

    mock_db = MagicMock()
    mock_cm = AsyncMock()
    mock_cm.__aenter__ = AsyncMock(return_value=mock_session)
    mock_cm.__aexit__ = AsyncMock(return_value=False)
    mock_db.get_async_session.return_value = mock_cm

    with patch(
        "app.services.knowledge_base.domain_service.rag_db_manager", mock_db
    ):
        detail = await DomainService.get_domain(
            workspace_id="ws-1", domain_id="dom-abc"
        )

    assert detail is not None
    assert detail["domain_id"] == "dom-abc"
    assert detail["name"] == "Technology"
    assert len(detail["topics"]) == 1
    assert detail["topics"][0]["topic_id"] == "topic-1"
    assert detail["topics"][0]["chunk_count"] == 3


@pytest.mark.asyncio
async def test_get_domain_not_found():
    from app.services.knowledge_base.domain_service import DomainService

    mock_session = AsyncMock()
    domain_result = MagicMock()
    domain_result.mappings.return_value.first.return_value = None
    mock_session.execute = AsyncMock(return_value=domain_result)

    mock_db = MagicMock()
    mock_cm = AsyncMock()
    mock_cm.__aenter__ = AsyncMock(return_value=mock_session)
    mock_cm.__aexit__ = AsyncMock(return_value=False)
    mock_db.get_async_session.return_value = mock_cm

    with patch(
        "app.services.knowledge_base.domain_service.rag_db_manager", mock_db
    ):
        detail = await DomainService.get_domain(
            workspace_id="ws-1", domain_id="dom-nonexistent"
        )

    assert detail is None


@pytest.mark.asyncio
async def test_get_domain_no_topics():
    from app.services.knowledge_base.domain_service import DomainService

    mock_session = AsyncMock()

    domain_row = MagicMock()
    domain_row._mapping = {
        "domain_id": "dom-abc",
        "name": "Tech",
        "slug": "tech",
        "description": None,
        "frequency": 1,
        "status": "active",
        "confidence": 0.9,
    }
    domain_result = MagicMock()
    domain_result.mappings.return_value.first.return_value = domain_row._mapping

    topic_result = MagicMock()
    topic_result.__iter__ = MagicMock(return_value=iter([]))

    call_count = [0]

    async def mock_execute(sql, params):
        call_count[0] += 1
        if call_count[0] == 1:
            return domain_result
        return topic_result

    mock_session.execute = mock_execute

    mock_db = MagicMock()
    mock_cm = AsyncMock()
    mock_cm.__aenter__ = AsyncMock(return_value=mock_session)
    mock_cm.__aexit__ = AsyncMock(return_value=False)
    mock_db.get_async_session.return_value = mock_cm

    with patch(
        "app.services.knowledge_base.domain_service.rag_db_manager", mock_db
    ):
        detail = await DomainService.get_domain(
            workspace_id="ws-1", domain_id="dom-abc"
        )

    assert detail is not None
    assert detail["domain_id"] == "dom-abc"
    assert detail["topics"] == []
