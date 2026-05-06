import logging
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from starlette.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.api_router import router as api_router_v1
from app.core.logger import setup_logging
from app.helpers.exception_handler import (
    CustomException,
    http_exception_handler,
    validation_exception_handler,
    fastapi_error_handler,
)
from app.db.database import setup_database

# Configure logging
setup_logging()

# Configure database (Firestore & firedantic)
setup_database()


def get_application() -> FastAPI:
    application = FastAPI(
        title=settings.PROJECT_NAME,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        description="""
        FastAPI Base configured for Firestore and Firebase Auth
        - Firebase Authentication (JWT) via Depends
        - Firestore connection via firedantic
        - No GET endpoints (Frontend queries directly)
        """,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    application.include_router(api_router_v1, prefix=settings.API_V1_STR)

    # Exception Handlers
    application.add_exception_handler(CustomException, http_exception_handler)
    application.add_exception_handler(RequestValidationError, validation_exception_handler)
    application.add_exception_handler(Exception, fastapi_error_handler)

    return application


app = get_application()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
