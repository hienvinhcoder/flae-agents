from fastapi import APIRouter
from app.api.v1.endpoints import user
from app.api.v1.endpoints import auth

router = APIRouter()
router.include_router(user.router, prefix="/users", tags=["users"])
router.include_router(auth.router, prefix="/auth", tags=["auth"])
