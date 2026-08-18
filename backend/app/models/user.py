from enum import Enum
from typing import Optional
from sqlalchemy import String, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import BaseModel


class LoginProvider(str, Enum):
    EMAIL_PASSWORD = "email_password"
    GOOGLE = "google"
    FACEBOOK = "facebook"


class User(BaseModel):
    __tablename__ = "users"

    firebase_uid: Mapped[str] = mapped_column(String, unique=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    login_providers: Mapped[list[str]] = mapped_column(JSONB, default=list)
    avatar_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    current_workspace_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
