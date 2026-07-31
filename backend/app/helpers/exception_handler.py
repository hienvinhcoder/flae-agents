"""Compatibility imports; new code should use :mod:`app.core.exceptions`."""

from app.core.exceptions import (
    CustomException,
    fastapi_error_handler,
    http_exception_handler,
    sqlalchemy_not_found_handler,
    starlette_http_exception_handler,
    validation_exception_handler,
)

__all__ = [
    "CustomException",
    "fastapi_error_handler",
    "http_exception_handler",
    "sqlalchemy_not_found_handler",
    "starlette_http_exception_handler",
    "validation_exception_handler",
]
