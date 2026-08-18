from fastapi import APIRouter
from app.api.v1.routes import (
    agents,
    auth,
    chat,
    knowledge,
    topics,
    users,
    workspaces,
)

router = APIRouter()
router.include_router(users.router, prefix="/users", tags=["users"])
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(workspaces.router, prefix="/workspaces", tags=["workspaces"])
router.include_router(knowledge.router, prefix="/knowledge-base", tags=["knowledge-base"])
router.include_router(agents.router, prefix="/workspaces/{workspace_id}/agents", tags=["agents"])
router.include_router(chat.router, prefix="/workspaces/{workspace_id}/agents", tags=["chat-stream"])
router.include_router(topics.router, prefix="/workspaces/{workspace_id}/topics", tags=["topics"])

@router.get("/health", tags=["health"])
def health_check():
    return {"status": "ok"}
