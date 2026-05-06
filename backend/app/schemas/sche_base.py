from typing import Any, Optional, TypeVar, Generic
from pydantic import BaseModel

T = TypeVar("T")


class ResponseSchemaBase(BaseModel):
    """
    Base schema for all API responses. Provides a consistent structure.
    Kế thừa class này cho các request/response schema để đảm bảo tính nhất quán.
    """
    code: str = ""
    message: str = ""

    @classmethod
    def custom_response(cls, code: str, message: str) -> "ResponseSchemaBase":
        """Tạo response base với code và message tùy chỉnh. Dùng cho error responses."""
        return cls(code=code, message=message)


class DataResponse(ResponseSchemaBase, Generic[T]):
    """
    Chuẩn hoá cấu trúc response trả về data thành công.

    Sử dụng:
        DataResponse[UserItemResponse].success_response(data=user_item)
        DataResponse[UserItemResponse].custom_response(code="201", message="Created", data=user_item)
    """
    data: Optional[T] = None

    @classmethod
    def success_response(cls, data: Any = None) -> "DataResponse[T]":
        """Trả về response thành công với code=200 và message=Success."""
        return cls(code="200", message="Success", data=data)

    @classmethod
    def custom_response(cls, code: str, message: str, data: Any = None) -> "DataResponse[T]":  # type: ignore[override]
        """Trả về response với code và message tùy chỉnh."""
        return cls(code=code, message=message, data=data)
