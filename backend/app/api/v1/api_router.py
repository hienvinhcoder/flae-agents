from fastapi import APIRouter
from app.api.v1.endpoints import user
from app.api.v1.endpoints import auth
from app.api.v1.endpoints import workspace
from app.api.v1.endpoints import temporal_demo

router = APIRouter()
router.include_router(user.router, prefix="/users", tags=["users"])
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(workspace.router, prefix="/workspaces", tags=["workspaces"])
router.include_router(temporal_demo.router, prefix="/temporal-demo", tags=["temporal-demo"])
