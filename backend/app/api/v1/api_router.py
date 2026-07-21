from fastapi import APIRouter
from app.api.v1.endpoints import user
from app.api.v1.endpoints import auth
from app.api.v1.endpoints import workspace
from app.api.v1.endpoints import knowledge_base
from app.api.v1.endpoints import agent
from app.api.v1.endpoints import chat_stream
from app.api.v1.endpoints import topic

router = APIRouter()
router.include_router(user.router, prefix="/users", tags=["users"])
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(workspace.router, prefix="/workspaces", tags=["workspaces"])
router.include_router(knowledge_base.router, prefix="/knowledge-base", tags=["knowledge-base"])
router.include_router(agent.router, prefix="/workspaces/{workspace_id}/agents", tags=["agents"])
router.include_router(chat_stream.router, prefix="/workspaces/{workspace_id}/agents", tags=["chat-stream"])
router.include_router(topic.router, prefix="/workspaces/{workspace_id}/topics", tags=["topics"])

@router.get("/health", tags=["health"])
def health_check():
    return {"status": "ok"}

