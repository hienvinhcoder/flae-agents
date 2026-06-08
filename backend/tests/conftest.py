import pytest
import json
from unittest.mock import MagicMock, AsyncMock, patch

# Mock redis_client toàn cục trước khi bất kỳ module nào import nó
mock_redis = MagicMock()

# Mặc định trả về dữ liệu membership hợp lệ của user mock cho workspace mock
mock_membership = {
    "workspaces": [
        {
            "workspace_id": "11111111-2222-3333-4444-555555555555",
            "role": "admin",
            "status": "active"
        }
    ]
}

mock_redis.get = AsyncMock(return_value=json.dumps(mock_membership))
mock_redis.setex = AsyncMock(return_value=True)
mock_redis.delete = AsyncMock(return_value=True)

redis_patcher = patch("app.db.database.redis_client", mock_redis)
redis_patcher.start()

# Mock get_temporal_client toàn cục
mock_temporal = MagicMock()
mock_temporal.start_workflow = AsyncMock(return_value=MagicMock())
temporal_patcher = patch("app.core.temporal.get_temporal_client", AsyncMock(return_value=mock_temporal))
temporal_patcher.start()

# Mock RAG DB manager partition creation
rag_patcher = patch("app.db.rag_db.rag_db_manager.create_workspace_partition", AsyncMock())
rag_patcher.start()
