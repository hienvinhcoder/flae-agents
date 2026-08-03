import pytest
import uuid
from unittest.mock import patch, AsyncMock, MagicMock

# Mock require_roles decorator dependency TRƯỚC KHI import main/app
def mock_require_roles(roles):
    async def dummy_dep(*args, **kwargs):
        return "admin"
    return dummy_dep

patcher = patch("app.core.security.require_roles", mock_require_roles)
patcher.start()

from main import app
from fastapi.testclient import TestClient
from app.core.security import (
    get_current_user,
    get_current_user_uid,
    get_current_workspace_id,
)
from app.schemas.agent_memory import FacetState
from app.schemas.memory_query import (
    MemoryQueryRequest,
    MemoryReadiness,
    MemorySearchResult,
    MemoryTextHit,
    MemoryTruncation,
)

patcher.stop()

client = TestClient(app)


def override_get_current_user():
    mock_user = MagicMock()
    mock_user.firebase_uid = "mock_firebase_uid_123"
    mock_user.email = "test@example.com"
    return mock_user

def override_get_current_workspace_id():
    return uuid.UUID("11111111-2222-3333-4444-555555555555")

app.dependency_overrides[get_current_user] = override_get_current_user
app.dependency_overrides[get_current_user_uid] = lambda: "mock_firebase_uid_123"
app.dependency_overrides[get_current_workspace_id] = override_get_current_workspace_id


def test_search_knowledge_base_api_success():
    canonical_result = MemorySearchResult(
        query="Ai sản xuất iPhone?",
        text_hits=(
            MemoryTextHit(
                chunk_id="chunk-1",
                source_id="source-1",
                source_name="apple_info.txt",
                resource_uri="flae://workspace/ws/chunks/chunk-1",
                content="Apple manufactures iPhone.",
                score=0.85,
                token_count=4,
                match_signals=("semantic",),
            ),
        ),
        graph_paths=(),
        readiness=MemoryReadiness(
            base=FacetState.ready,
            graph=FacetState.pending,
        ),
        truncation=MemoryTruncation(
            chunks_truncated=False,
            paths_truncated=False,
            citations_truncated=False,
            context_tokens_used=4,
            citations_used=0,
        ),
    )
    service = MagicMock()
    service.search = AsyncMock(return_value=canonical_result)

    with patch(
        "app.api.v1.endpoints.knowledge_base.create_memory_query_service",
        return_value=service,
    ) as factory:

        payload = {
            "query": "Ai sản xuất iPhone?",
            "top_k_chunks": 5,
            "top_k_paths": 10
        }

        response = client.post("/api/v1/knowledge-base/search", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["code"] == "200"
        assert data["message"] == "Success"
        assert "data" in data

        # Verify content
        search_data = data["data"]
        assert len(search_data["top_chunks"]) == 1
        assert search_data["top_chunks"][0]["id"] == "chunk-1"
        assert search_data["top_chunks"][0]["content"] == "Apple manufactures iPhone."

        assert search_data["top_paths"] == []
        assert search_data["diagnostics"]["readiness"]["base"] == "ready"

        factory.assert_called_once_with(
            uuid.UUID("11111111-2222-3333-4444-555555555555"),
            "mock_firebase_uid_123",
        )
        request = service.search.await_args.args[0]
        assert isinstance(request, MemoryQueryRequest)
        assert request.query == "Ai sản xuất iPhone?"
        assert request.budget.max_chunks == 5
        assert request.budget.max_paths == 10
