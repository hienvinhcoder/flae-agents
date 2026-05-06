from typing import Optional
from pydantic import EmailStr

from app.models.user import LoginProvider
from app.schemas.sche_base import ResponseSchemaBase


class UserItemResponse(ResponseSchemaBase):
    """
    Schema for user item response data.
    Kế thừa từ ResponseSchemaBase để đảm bảo cấu trúc response nhất quán.

    Sử dụng:
        DataResponse[UserItemResponse].success_response(data=UserItemResponse(...))
    """
    id: str = ""
    firebase_uid: str = ""
    email: EmailStr
    full_name: str
    is_active: bool
    login_providers: list[LoginProvider] = []
    avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}


class UserCreateRequest(ResponseSchemaBase):
    """Schema for creating a new user."""
    full_name: str
    avatar_url: Optional[str] = None
    login_provider: LoginProvider


class UserUpdateRequest(ResponseSchemaBase):
    """Schema for updating user info."""
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
