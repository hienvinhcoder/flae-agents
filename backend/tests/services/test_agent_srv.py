import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.agent_srv import AgentService
from app.schemas.sche_agent import AgentCreate, AgentUpdate, ChatSessionCreate
from app.models.agent import Agent, ChatSession, ChatMessage


@pytest.mark.asyncio
async def test_create_agent():
    db = AsyncMock(spec=AsyncSession)
    workspace_id = uuid.uuid4()
    user_uid = "firebase_user_123"
    
    payload = AgentCreate(
        name="Test Agent",
        avatar_color="bg-red-500",
        avatar_icon="bot",
        system_prompt="You are a test agent.",
        model_name="gemini-2.5-flash",
        temperature=0.2
    )
    
    agent = await AgentService.create_agent(db, workspace_id, user_uid, payload)
    
    assert agent.name == "Test Agent"
    assert agent.workspace_id == workspace_id
    assert agent.created_by == user_uid
    db.add.assert_called_once()
    assert db.commit.call_count >= 1
    assert db.refresh.call_count >= 1


@pytest.mark.asyncio
async def test_get_agent():
    db = AsyncMock(spec=AsyncSession)
    workspace_id = uuid.uuid4()
    agent_id = uuid.uuid4()
    
    mock_agent = Agent(
        id=agent_id,
        workspace_id=workspace_id,
        name="Mocked Agent",
        avatar_color="bg-blue-500",
        avatar_icon="user",
        system_prompt="Hello",
        created_by="user123",
        is_active=True
    )
    
    mock_execute = MagicMock()
    mock_execute.scalar_one_or_none.return_value = mock_agent
    db.execute = AsyncMock(return_value=mock_execute)
    
    agent = await AgentService.get_agent(db, workspace_id, agent_id)
    
    assert agent is not None
    assert agent.id == agent_id
    assert agent.name == "Mocked Agent"


@pytest.mark.asyncio
async def test_list_agents():
    db = AsyncMock(spec=AsyncSession)
    workspace_id = uuid.uuid4()
    
    mock_agents = [
        Agent(name="A1", workspace_id=workspace_id, avatar_color="c", avatar_icon="i", system_prompt="p", created_by="u"),
        Agent(name="A2", workspace_id=workspace_id, avatar_color="c", avatar_icon="i", system_prompt="p", created_by="u")
    ]
    
    mock_execute = MagicMock()
    mock_execute.scalars.return_value.all.return_value = mock_agents
    db.execute = AsyncMock(return_value=mock_execute)
    
    agents = await AgentService.list_agents(db, workspace_id)
    
    assert len(agents) == 2
    assert agents[0].name == "A1"
    assert agents[1].name == "A2"


@pytest.mark.asyncio
async def test_update_agent():
    db = AsyncMock(spec=AsyncSession)
    workspace_id = uuid.uuid4()
    agent_id = uuid.uuid4()
    
    existing_agent = Agent(
        id=agent_id,
        workspace_id=workspace_id,
        name="Old Name",
        avatar_color="bg-red-500",
        avatar_icon="bot",
        system_prompt="Old Prompt",
        created_by="user123",
        is_active=True
    )
    
    mock_execute = MagicMock()
    mock_execute.scalar_one_or_none.return_value = existing_agent
    db.execute = AsyncMock(return_value=mock_execute)
    
    payload = AgentUpdate(name="New Name", system_prompt="New Prompt")
    
    updated = await AgentService.update_agent(db, workspace_id, agent_id, payload)
    
    assert updated is not None
    assert updated.name == "New Name"
    assert updated.system_prompt == "New Prompt"
    assert db.commit.call_count >= 1


@pytest.mark.asyncio
async def test_delete_agent():
    db = AsyncMock(spec=AsyncSession)
    workspace_id = uuid.uuid4()
    agent_id = uuid.uuid4()
    
    existing_agent = Agent(
        id=agent_id,
        workspace_id=workspace_id,
        name="To Delete",
        avatar_color="bg-red-500",
        avatar_icon="bot",
        system_prompt="Prompt",
        created_by="user123",
        is_active=True
    )
    
    mock_execute = MagicMock()
    mock_execute.scalar_one_or_none.return_value = existing_agent
    db.execute = AsyncMock(return_value=mock_execute)
    
    success = await AgentService.delete_agent(db, workspace_id, agent_id)
    
    assert success is True
    db.delete.assert_called_once_with(existing_agent)
    assert db.commit.call_count >= 1


@pytest.mark.asyncio
async def test_get_or_create_default_agent_new():
    db = AsyncMock(spec=AsyncSession)
    workspace_id = uuid.uuid4()
    user_uid = "firebase_user_123"
    
    # Giả lập trả về None khi tìm kiếm default agent
    mock_execute = MagicMock()
    mock_execute.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=mock_execute)
    
    agent = await AgentService.get_or_create_default_agent(db, workspace_id, user_uid)
    
    assert agent.is_default is True
    assert agent.name == "QA Assistant"
    db.add.assert_called_once()
    assert db.commit.call_count >= 1


@pytest.mark.asyncio
async def test_get_or_create_default_agent_existing():
    db = AsyncMock(spec=AsyncSession)
    workspace_id = uuid.uuid4()
    agent_id = uuid.uuid4()
    user_uid = "firebase_user_123"
    
    existing_agent = Agent(
        id=agent_id,
        workspace_id=workspace_id,
        name="QA Assistant",
        avatar_color="bg-primary-soft text-primary",
        avatar_icon="sparkles",
        system_prompt="...",
        created_by=user_uid,
        is_default=True,
        is_active=True
    )
    
    # Giả lập trả về existing_agent khi tìm kiếm default agent
    mock_execute = MagicMock()
    mock_execute.scalar_one_or_none.return_value = existing_agent
    db.execute = AsyncMock(return_value=mock_execute)
    
    agent = await AgentService.get_or_create_default_agent(db, workspace_id, user_uid)
    
    assert agent.id == agent_id
    assert agent.is_default is True
    db.add.assert_not_called()


@pytest.mark.asyncio
async def test_create_agent_sets_existing_default_to_false():
    db = AsyncMock(spec=AsyncSession)
    workspace_id = uuid.uuid4()
    user_uid = "firebase_user_123"
    
    payload = AgentCreate(
        name="New Default Agent",
        avatar_color="bg-blue-500",
        avatar_icon="bot",
        system_prompt="New prompt",
        model_name="gemini-2.5-flash",
        temperature=0.2,
        is_default=True
    )
    
    agent = await AgentService.create_agent(db, workspace_id, user_uid, payload)
    
    assert agent.is_default is True
    # Kiểm chứng db.execute đã được gọi để cập nhật các agent cũ thành false
    assert db.execute.call_count >= 1
    db.add.assert_called_once()
    assert db.commit.call_count >= 1


@pytest.mark.asyncio
async def test_update_agent_sets_existing_default_to_false():
    db = AsyncMock(spec=AsyncSession)
    workspace_id = uuid.uuid4()
    agent_id = uuid.uuid4()
    
    existing_agent = Agent(
        id=agent_id,
        workspace_id=workspace_id,
        name="Existing Agent",
        avatar_color="bg-red-500",
        avatar_icon="bot",
        system_prompt="Prompt",
        created_by="user123",
        is_active=True,
        is_default=False
    )
    
    mock_execute = MagicMock()
    mock_execute.scalar_one_or_none.return_value = existing_agent
    db.execute = AsyncMock(return_value=mock_execute)
    
    payload = AgentUpdate(is_default=True)
    
    updated = await AgentService.update_agent(db, workspace_id, agent_id, payload)
    
    assert updated is not None
    assert updated.is_default is True
    # execute được gọi để cập nhật agent cũ sang is_default=False và get_agent query
    assert db.execute.call_count >= 2
    assert db.commit.call_count >= 1


