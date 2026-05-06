from datetime import datetime, timezone
from typing import Optional
from pydantic import Field
from firedantic import Model


class BaseModel(Model):
    """
    Base model class for all firedantic models in the application.
    Includes common timestamp fields and optional id for custom document IDs.
    """

    __collection__ = "base_collection"  # Should be overridden by subclasses

    id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
