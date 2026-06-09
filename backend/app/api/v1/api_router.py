from fastapi import APIRouter
from app.api.v1.endpoints import user
from app.api.v1.endpoints import auth
from app.api.v1.endpoints import workspace
from app.api.v1.endpoints import knowledge_base
router = APIRouter()
router.include_router(user.router, prefix="/users", tags=["users"])
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(workspace.router, prefix="/workspaces", tags=["workspaces"])
router.include_router(knowledge_base.router, prefix="/knowledge-base", tags=["knowledge-base"])

@router.get("/health", tags=["health"])
def health_check():
    return {"status": "ok"}

