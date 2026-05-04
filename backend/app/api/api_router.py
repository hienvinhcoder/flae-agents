from fastapi import APIRouter
from app.api.endpoints import user

router = APIRouter()
router.include_router(user.router, prefix="/users", tags=["users"])
