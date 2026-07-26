import uuid
from typing import Optional, List
from sqlalchemy import select, and_, desc, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import Agent, ChatSession, ChatMessage
from app.schemas.sche_agent import AgentCreate, AgentUpdate, ChatSessionCreate


class AgentService:
    """
    Service xử lý nghiệp vụ CRUD cho Agent, ChatSession và ChatMessage.
    """

    # ── Agent Operations ──────────────────────────────────────────────

    @staticmethod
    async def create_agent(
        db: AsyncSession, workspace_id: uuid.UUID, user_uid: str, payload: AgentCreate
    ) -> Agent:
        if payload.is_default:
            await db.execute(
                update(Agent)
                .where(and_(Agent.workspace_id == workspace_id, Agent.is_default == True))
                .values(is_default=False)
            )

        agent = Agent(
            workspace_id=workspace_id,
            name=payload.name,
            avatar_color=payload.avatar_color,
            avatar_icon=payload.avatar_icon,
            system_prompt=payload.system_prompt,
            model_name=payload.model_name,
            temperature=payload.temperature,
            created_by=user_uid,
            is_default=payload.is_default,
        )
        db.add(agent)
        await db.commit()
        await db.refresh(agent)
        return agent

    @staticmethod
    async def get_or_create_default_agent(
        db: AsyncSession, workspace_id: uuid.UUID, user_uid: str
    ) -> Agent:
        stmt = select(Agent).where(
            and_(
                Agent.workspace_id == workspace_id,
                Agent.is_default == True,
                Agent.is_active == True
            )
        )
        result = await db.execute(stmt)
        agent = result.scalar_one_or_none()
        if agent:
            return agent

        # Tạo mới Default Agent nếu chưa tồn tại
        agent = Agent(
            workspace_id=workspace_id,
            name="QA Assistant",
            avatar_color="bg-primary-soft text-primary",
            avatar_icon="sparkles",
            system_prompt="Bạn là một AI Assistant thông minh hỗ trợ trả lời câu hỏi dựa trên tài liệu tham khảo trong cơ sở tri thức.",
            model_name="gemini-2.5-flash",
            temperature=0.2,
            created_by=user_uid,
            is_default=True
        )
        db.add(agent)
        await db.commit()
        await db.refresh(agent)
        return agent


    @staticmethod
    async def get_agent(
        db: AsyncSession, workspace_id: uuid.UUID, agent_id: uuid.UUID
    ) -> Optional[Agent]:
        stmt = select(Agent).where(
            and_(Agent.id == agent_id, Agent.workspace_id == workspace_id, Agent.is_active == True)
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def list_agents(
        db: AsyncSession, workspace_id: uuid.UUID
    ) -> List[Agent]:
        stmt = select(Agent).where(
            and_(Agent.workspace_id == workspace_id, Agent.is_active == True, Agent.is_default == False)
        ).order_by(desc(Agent.created_at))
        result = await db.execute(stmt)
        return list(result.scalars().all())


    @staticmethod
    async def update_agent(
        db: AsyncSession, workspace_id: uuid.UUID, agent_id: uuid.UUID, payload: AgentUpdate
    ) -> Optional[Agent]:
        agent = await AgentService.get_agent(db, workspace_id, agent_id)
        if not agent:
            return None

        update_data = payload.model_dump(exclude_unset=True)
        if update_data.get("is_default") is True:
            await db.execute(
                update(Agent)
                .where(and_(Agent.workspace_id == workspace_id, Agent.is_default == True))
                .values(is_default=False)
            )

        for key, val in update_data.items():
            setattr(agent, key, val)

        await db.commit()
        await db.refresh(agent)
        return agent

    @staticmethod
    async def delete_agent(
        db: AsyncSession, workspace_id: uuid.UUID, agent_id: uuid.UUID
    ) -> bool:
        agent = await AgentService.get_agent(db, workspace_id, agent_id)
        if not agent:
            return False

        # Soft delete hoặc Hard delete? Spec ghi "xóa Agent", chúng ta làm hard delete vì đã cascade liên quan.
        await db.delete(agent)
        await db.commit()
        return True

    # ── Chat Session Operations ────────────────────────────────────────

    @staticmethod
    async def create_chat_session(
        db: AsyncSession,
        workspace_id: uuid.UUID,
        agent_id: uuid.UUID,
        user_uid: str,
        payload: ChatSessionCreate,
    ) -> Optional[ChatSession]:
        # Kiểm tra Agent có tồn tại trong Workspace hay không
        agent = await AgentService.get_agent(db, workspace_id, agent_id)
        if not agent:
            return None

        title = payload.title or f"Cuộc hội thoại mới ({datetime_now_str()})"
        session = ChatSession(
            workspace_id=workspace_id,
            agent_id=agent_id,
            title=title,
            created_by=user_uid,
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return session

    @staticmethod
    async def list_chat_sessions(
        db: AsyncSession, workspace_id: uuid.UUID, agent_id: uuid.UUID, user_uid: str
    ) -> List[ChatSession]:
        stmt = select(ChatSession).where(
            and_(
                ChatSession.workspace_id == workspace_id,
                ChatSession.agent_id == agent_id,
                ChatSession.created_by == user_uid,
            )
        ).order_by(desc(ChatSession.created_at))
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_chat_session(
        db: AsyncSession, workspace_id: uuid.UUID, agent_id: uuid.UUID, session_id: uuid.UUID, user_uid: str
    ) -> Optional[ChatSession]:
        stmt = select(ChatSession).where(
            and_(
                ChatSession.id == session_id,
                ChatSession.workspace_id == workspace_id,
                ChatSession.agent_id == agent_id,
                ChatSession.created_by == user_uid,
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def delete_chat_session(
        db: AsyncSession, workspace_id: uuid.UUID, agent_id: uuid.UUID, session_id: uuid.UUID, user_uid: str
    ) -> bool:
        session = await AgentService.get_chat_session(db, workspace_id, agent_id, session_id, user_uid)
        if not session:
            return False

        await db.delete(session)
        await db.commit()
        return True

    # ── Chat Message Operations ────────────────────────────────────────

    @staticmethod
    async def list_messages(
        db: AsyncSession, session_id: uuid.UUID
    ) -> List[ChatMessage]:
        stmt = select(ChatMessage).where(
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.created_at)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def create_message(
        db: AsyncSession,
        session_id: uuid.UUID,
        role: str,
        content: str,
        citations: Optional[List[dict]],
        created_by: str,
    ) -> ChatMessage:
        message = ChatMessage(
            session_id=session_id,
            role=role,
            content=content,
            citations=citations,
            created_by=created_by,
        )
        db.add(message)
        await db.commit()
        await db.refresh(message)
        return message


def datetime_now_str() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M")
