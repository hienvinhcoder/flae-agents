from typing import Optional
from pydantic import EmailStr

from app.models.user import LoginProvider
from app.schemas.sche_base import ResponseSchemaBase


class UserSyncRequest(ResponseSchemaBase):
    """Schema cho request sync user từ Firebase Auth."""
    email: EmailStr
    full_name: str
    avatar_url: Optional[str] = None
    login_provider: LoginProvider
