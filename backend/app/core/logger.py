import logging
import sys
import json
from datetime import datetime, timezone
from app.core.config import settings


class JSONFormatter(logging.Formatter):
    """
    Formatter that outputs JSON strings after parsing the LogRecord.
    Used for Google Cloud Run (production).
    """

    def format(self, record):
        log_record = {
            "severity": record.levelname,
            "message": record.getMessage(),
            "time": datetime.now(timezone.utc).isoformat(),
            "name": record.name,
        }
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_record)


def setup_logging():
    """
    Configure standard logging.
    Uses plain text for local development, and JSON for production (Cloud Run).
    """
    logger = logging.getLogger()

    # Clear existing handlers
    if logger.hasHandlers():
        logger.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)

    if settings.ENVIRONMENT == "local":
        # Local text format
        formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
        )
    else:
        formatter = JSONFormatter()

    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

    # Tweak noisy loggers
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    logging.getLogger("urllib3").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """
    Trả về một logger instance theo tên module.

    Sử dụng:
        logger = get_logger(__name__)
        logger.info("Hello from this module")
    """
    return logging.getLogger(name)
