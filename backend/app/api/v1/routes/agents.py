import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user_uid, get_current_workspace_id, require_roles
from app.db.database import get_db
from app.models.workspace import WorkspaceRole
from app.schemas.common import DataResponse
from app.schemas.agents import (
    AgentCreate,
    AgentUpdate,
    AgentDetail,
)
from app.schemas.chat import (
    ChatSessionCreate,
    ChatSessionResponse,
    ChatMessageResponse,
)
from app.services.agents.service import AgentService

router = APIRouter()


# ── Agent APIs ──────────────────────────────────────────────────────

@router.post("", response_model=DataResponse[AgentDetail], summary="Tạo mới Agent (chỉ Owner/Admin)")
async def create_agent(
    payload: AgentCreate,
    db: AsyncSession = Depends(get_db),
    user_uid: str = Depends(get_current_user_uid),
    workspace_id: uuid.UUID = Depends(get_current_workspace_id),
    _role: str = Depends(require_roles([WorkspaceRole.owner, WorkspaceRole.admin])),
):
    agent = await AgentService.create_agent(db, workspace_id, user_uid, payload)
    return DataResponse[AgentDetail].success_response(
        data=AgentDetail.model_validate(agent)
    )


@router.get("", response_model=DataResponse[List[AgentDetail]], summary="Lấy danh sách Agents trong Workspace")
async def list_agents(
    db: AsyncSession = Depends(get_db),
    workspace_id: uuid.UUID = Depends(get_current_workspace_id),
):
    agents = await AgentService.list_agents(db, workspace_id)
    return DataResponse[List[AgentDetail]].success_response(
        data=[AgentDetail.model_validate(agent) for agent in agents]
    )


@router.get("/default", response_model=DataResponse[AgentDetail], summary="Lấy thông tin Default Agent (tự tạo nếu chưa có)")
async def get_default_agent(
    db: AsyncSession = Depends(get_db),
    user_uid: str = Depends(get_current_user_uid),
    workspace_id: uuid.UUID = Depends(get_current_workspace_id),
):
    agent = await AgentService.get_or_create_default_agent(db, workspace_id, user_uid)
    return DataResponse[AgentDetail].success_response(
        data=AgentDetail.model_validate(agent)
    )


@router.get("/{agent_id}", response_model=DataResponse[AgentDetail], summary="Chi tiết Agent")
async def get_agent(

    agent_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    workspace_id: uuid.UUID = Depends(get_current_workspace_id),
):
    agent = await AgentService.get_agent(db, workspace_id, agent_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent không tồn tại hoặc bị ẩn")
    return DataResponse[AgentDetail].success_response(
        data=AgentDetail.model_validate(agent)
    )


@router.put("/{agent_id}", response_model=DataResponse[AgentDetail], summary="Cập nhật cấu hình Agent (chỉ Owner/Admin)")
async def update_agent(
    agent_id: uuid.UUID,
    payload: AgentUpdate,
    db: AsyncSession = Depends(get_db),
    workspace_id: uuid.UUID = Depends(get_current_workspace_id),
    _role: str = Depends(require_roles([WorkspaceRole.owner, WorkspaceRole.admin])),
):
    agent = await AgentService.update_agent(db, workspace_id, agent_id, payload)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent không tồn tại")
    return DataResponse[AgentDetail].success_response(
        data=AgentDetail.model_validate(agent)
    )


@router.delete("/{agent_id}", response_model=DataResponse[bool], summary="Xóa Agent (chỉ Owner/Admin)")
async def delete_agent(
    agent_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    workspace_id: uuid.UUID = Depends(get_current_workspace_id),
    _role: str = Depends(require_roles([WorkspaceRole.owner, WorkspaceRole.admin])),
):
    success = await AgentService.delete_agent(db, workspace_id, agent_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent không tồn tại")
    return DataResponse[bool].success_response(data=True)


# ── Chat Session APIs ───────────────────────────────────────────────

@router.post("/{agent_id}/sessions", response_model=DataResponse[ChatSessionResponse], summary="Tạo phiên hội thoại mới")
async def create_chat_session(
    agent_id: uuid.UUID,
    payload: ChatSessionCreate,
    db: AsyncSession = Depends(get_db),
    user_uid: str = Depends(get_current_user_uid),
    workspace_id: uuid.UUID = Depends(get_current_workspace_id),
):
    session = await AgentService.create_chat_session(db, workspace_id, agent_id, user_uid, payload)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không thể tạo session (Agent không tồn tại)")
    return DataResponse[ChatSessionResponse].success_response(
        data=ChatSessionResponse.model_validate(session)
    )


@router.get("/{agent_id}/sessions", response_model=DataResponse[List[ChatSessionResponse]], summary="Lấy danh sách phiên hội thoại")
async def list_chat_sessions(
    agent_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_uid: str = Depends(get_current_user_uid),
    workspace_id: uuid.UUID = Depends(get_current_workspace_id),
):
    sessions = await AgentService.list_chat_sessions(db, workspace_id, agent_id, user_uid)
    return DataResponse[List[ChatSessionResponse]].success_response(
        data=[ChatSessionResponse.model_validate(session) for session in sessions]
    )


@router.get("/{agent_id}/sessions/{session_id}", response_model=DataResponse[ChatSessionResponse], summary="Chi tiết phiên hội thoại")
async def get_chat_session(
    agent_id: uuid.UUID,
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_uid: str = Depends(get_current_user_uid),
    workspace_id: uuid.UUID = Depends(get_current_workspace_id),
):
    session = await AgentService.get_chat_session(db, workspace_id, agent_id, session_id, user_uid)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phiên hội thoại không tồn tại")
    return DataResponse[ChatSessionResponse].success_response(
        data=ChatSessionResponse.model_validate(session)
    )


@router.delete("/{agent_id}/sessions/{session_id}", response_model=DataResponse[bool], summary="Xóa phiên hội thoại")
async def delete_chat_session(
    agent_id: uuid.UUID,
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_uid: str = Depends(get_current_user_uid),
    workspace_id: uuid.UUID = Depends(get_current_workspace_id),
):
    success = await AgentService.delete_chat_session(db, workspace_id, agent_id, session_id, user_uid)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phiên hội thoại không tồn tại")
    return DataResponse[bool].success_response(data=True)


# ── Chat Message APIs ───────────────────────────────────────────────

@router.get("/{agent_id}/sessions/{session_id}/messages", response_model=DataResponse[List[ChatMessageResponse]], summary="Lấy lịch sử tin nhắn của phiên hội thoại")
async def list_messages(
    agent_id: uuid.UUID,
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user_uid: str = Depends(get_current_user_uid),
    workspace_id: uuid.UUID = Depends(get_current_workspace_id),
):
    # Validate session exists and user owns it
    session = await AgentService.get_chat_session(db, workspace_id, agent_id, session_id, user_uid)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phiên hội thoại không tồn tại")

    messages = await AgentService.list_messages(db, session_id)
    return DataResponse[List[ChatMessageResponse]].success_response(
        data=[ChatMessageResponse.model_validate(message) for message in messages]
    )
