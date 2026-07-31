"""Application exceptions and safe global FastAPI handlers."""

from fastapi import Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import NoResultFound
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logger import get_logger
from app.schemas.sche_base import ResponseSchemaBase


logger = get_logger(__name__)


class ApplicationError(Exception):
    def __init__(self, *, status_code: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


class CustomException(ApplicationError):
    """Backward-compatible name for existing application errors."""

    def __init__(
        self,
        http_code: int | None = None,
        code: str | None = None,
        message: str | None = None,
    ) -> None:
        status_code = http_code or 500
        super().__init__(
            status_code=status_code,
            code=code or str(status_code),
            message=message or "Có lỗi xảy ra, vui lòng liên hệ admin!",
        )
        self.http_code = self.status_code


class InvalidArgumentError(ApplicationError, ValueError):
    def __init__(self, message: str) -> None:
        ApplicationError.__init__(
            self, status_code=400, code="INVALID_ARGUMENT", message=message
        )


class AuthenticationError(ApplicationError):
    def __init__(self, message: str) -> None:
        super().__init__(status_code=401, code="UNAUTHENTICATED", message=message)


class AuthorizationError(ApplicationError):
    def __init__(self, message: str) -> None:
        super().__init__(status_code=403, code="FORBIDDEN", message=message)


class ResourceNotFoundError(ApplicationError, ValueError):
    def __init__(self, message: str) -> None:
        ApplicationError.__init__(
            self, status_code=404, code="RESOURCE_NOT_FOUND", message=message
        )


class ExternalServiceError(ApplicationError, RuntimeError):
    def __init__(self, message: str = "Dịch vụ phụ thuộc tạm thời không khả dụng.") -> None:
        ApplicationError.__init__(
            self, status_code=503, code="SERVICE_UNAVAILABLE", message=message
        )


def _response(status_code: int, code: str, message: str) -> JSONResponse:
    content = ResponseSchemaBase.custom_response(code, message)
    return JSONResponse(status_code=status_code, content=jsonable_encoder(content))


async def application_exception_handler(
    request: Request, exc: ApplicationError
) -> JSONResponse:
    del request
    return _response(exc.status_code, exc.code, exc.message)


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    del request
    fields = []
    for error in exc.errors():
        location = error.get("loc")
        field = str(location[-1]) if location else "unknown"
        fields.append(f"/'{field}'/: {error.get('msg')}")
    return _response(400, "400", ", ".join(fields))


async def sqlalchemy_not_found_handler(
    request: Request, exc: NoResultFound
) -> JSONResponse:
    del request, exc
    return _response(404, "404", "Không tìm thấy dữ liệu yêu cầu")


async def starlette_http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    del request
    return _response(exc.status_code, str(exc.status_code), str(exc.detail))


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception(
        "Unhandled request error",
        extra={"method": request.method, "path": request.url.path},
    )
    return _response(500, "INTERNAL_ERROR", "Có lỗi xảy ra, vui lòng liên hệ admin!")


http_exception_handler = application_exception_handler
fastapi_error_handler = unhandled_exception_handler
