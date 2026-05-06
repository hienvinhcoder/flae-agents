from enum import Enum
from typing import Optional
from pydantic import EmailStr
from app.models.base import BaseModel


class LoginProvider(str, Enum):
    EMAIL_PASSWORD = "email_password"
    GOOGLE = "google"
    FACEBOOK = "facebook"


class User(BaseModel):
    __collection__ = "users"

    firebase_uid: str
    email: EmailStr
    full_name: str
    is_active: bool = True
    login_providers: list[LoginProvider] = []
    avatar_url: Optional[str] = None
