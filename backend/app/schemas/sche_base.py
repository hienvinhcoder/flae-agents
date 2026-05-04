from typing import Any, Optional, TypeVar, Generic
from pydantic import BaseModel

T = TypeVar("T")

class ResponseSchemaBase(BaseModel, Generic[T]):
    code: str = ''
    message: str = ''
    data: Optional[T] = None

    @classmethod
    def custom_response(cls, code: str, message: str, data: Any = None):
        return cls(
            code=code,
            message=message,
            data=data
        )

class DataResponse(ResponseSchemaBase[T]):
    """
    Standardize the successful response data structure.
    Usage: DataResponse[YourSchema](code='200', message='Success', data=your_data)
    """
    pass
