import json

import pytest
from starlette.requests import Request

from app.core.exceptions import (
    ApplicationError,
    application_exception_handler,
    unhandled_exception_handler,
)


def _request() -> Request:
    return Request({"type": "http", "method": "GET", "path": "/test", "headers": []})


@pytest.mark.asyncio
async def test_application_error_returns_only_safe_fields() -> None:
    error = ApplicationError(
        status_code=409,
        code="WORKSPACE_CONFLICT",
        message="The workspace state changed. Please retry.",
    )

    response = await application_exception_handler(_request(), error)

    assert response.status_code == 409
    assert json.loads(response.body) == {
        "code": "WORKSPACE_CONFLICT",
        "message": "The workspace state changed. Please retry.",
    }


@pytest.mark.asyncio
async def test_unhandled_error_never_returns_internal_details() -> None:
    response = await unhandled_exception_handler(
        _request(), RuntimeError("postgres password=secret SELECT * FROM users")
    )

    assert response.status_code == 500
    assert json.loads(response.body) == {
        "code": "INTERNAL_ERROR",
        "message": "Có lỗi xảy ra, vui lòng liên hệ admin!",
    }
