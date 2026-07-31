import os
import sys

# Prevent import-time model construction from requiring a real credential in tests.
os.environ.setdefault("GEMINI_API_KEY", "test-gemini-api-key")

# Cấu hình tên database test
POSTGRES_TEST_DB = "flae_db_test"
RAG_TEST_DB = "rag_db_test"

# Lấy URL DB hiện tại và thay thế tên database bằng phiên bản test
default_postgres_url = os.getenv("POSTGRES_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/flae_db")
default_rag_url = os.getenv("RAG_DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/rag_db")

def make_test_db_url(url, test_db_name):
    if "/" in url:
        parts = url.rsplit("/", 1)
        base = parts[0]
        db_and_query = parts[1]
        if "?" in db_and_query:
            query = db_and_query.split("?", 1)[1]
            return f"{base}/{test_db_name}?{query}"
        return f"{base}/{test_db_name}"
    return url

postgres_test_url = make_test_db_url(default_postgres_url, POSTGRES_TEST_DB)
rag_test_url = make_test_db_url(default_rag_url, RAG_TEST_DB)

# Ghi đè biến môi trường kết nối database test
os.environ["POSTGRES_URL"] = postgres_test_url
os.environ["RAG_DATABASE_URL"] = rag_test_url
os.environ["REDIS_URL"] = os.getenv("REDIS_URL", "redis://localhost:6379/1")
os.environ["ENVIRONMENT"] = "testing"

import pytest
import json
import psycopg2
import urllib.parse
from sqlalchemy.engine import make_url
from alembic.config import Config
from alembic import command
from unittest.mock import MagicMock, AsyncMock, patch

# Mock redis_client toàn cục trước khi bất kỳ module nào import nó
mock_redis = MagicMock()
mock_membership = {
    "workspaces": [
        {
            "workspace_id": "11111111-2222-3333-4444-555555555555",
            "role": "admin",
            "status": "active"
        }
    ]
}
mock_redis.get = AsyncMock(return_value=json.dumps(mock_membership))
mock_redis.setex = AsyncMock(return_value=True)
mock_redis.delete = AsyncMock(return_value=True)

redis_patcher = patch("app.db.database.redis_client", mock_redis)
redis_patcher.start()

# Mock get_temporal_client toàn cục
mock_temporal = MagicMock()
mock_temporal.start_workflow = AsyncMock(return_value=MagicMock())
temporal_patcher = patch("app.core.temporal.get_temporal_client", AsyncMock(return_value=mock_temporal))
temporal_patcher.start()

# Mock RAG DB manager partition creation
rag_patcher = patch("app.db.rag_db.rag_db_manager.create_workspace_partition", AsyncMock())
rag_patcher.start()


def create_test_databases_if_not_exists():
    """Tạo database test flae_db_test và rag_db_test nếu chúng chưa tồn tại."""
    url_to_parse = default_postgres_url.replace("+asyncpg", "")
    parsed = make_url(url_to_parse)

    user = parsed.username or "postgres"
    password = parsed.password or "postgres"
    if password:
        password = urllib.parse.unquote(password)
    host = parsed.host or "localhost"
    port = parsed.port or 5432

    conn = None
    try:
        conn = psycopg2.connect(
            dbname="postgres",
            user=user,
            password=password,
            host=host,
            port=port
        )
        conn.autocommit = True
        cur = conn.cursor()

        # Tạo flae_db_test nếu chưa có
        cur.execute(f"SELECT 1 FROM pg_database WHERE datname = '{POSTGRES_TEST_DB}'")
        if not cur.fetchone():
            cur.execute(f"CREATE DATABASE {POSTGRES_TEST_DB}")
            print(f"\n[TEST SETUP] Created test database: {POSTGRES_TEST_DB}")

        # Tạo rag_db_test nếu chưa có
        cur.execute(f"SELECT 1 FROM pg_database WHERE datname = '{RAG_TEST_DB}'")
        if not cur.fetchone():
            cur.execute(f"CREATE DATABASE {RAG_TEST_DB}")
            print(f"[TEST SETUP] Created test database: {RAG_TEST_DB}")

        cur.close()
    except Exception as e:
        print(f"\n[TEST SETUP] Warning during test database creation: {e}")
    finally:
        if conn:
            conn.close()

    # Bật extension vector cho rag_db_test
    try:
        conn = psycopg2.connect(
            dbname=RAG_TEST_DB,
            user=user,
            password=password,
            host=host,
            port=port
        )
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        cur.close()
    except Exception as e:
        print(f"[TEST SETUP] Warning enabling vector extension on {RAG_TEST_DB}: {e}")
    finally:
        if conn:
            conn.close()


def run_alembic_migrations():
    """Tự động chạy Alembic migrations trên database test."""
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../"))
    ini_path = os.path.join(base_dir, "alembic.ini")

    alembic_cfg = Config(ini_path)
    from app.core.config import settings
    alembic_cfg.set_main_option("sqlalchemy.url", settings.POSTGRES_URL)

    try:
        command.upgrade(alembic_cfg, "head")
        print("[TEST SETUP] Alembic migrations applied successfully to test database.")
    except Exception as e:
        print(f"[TEST SETUP] Error applying Alembic migrations: {e}")

    rag_ini_path = os.path.join(base_dir, "alembic-rag.ini")
    rag_alembic_cfg = Config(rag_ini_path)
    rag_alembic_cfg.set_main_option("sqlalchemy.url", settings.RAG_DATABASE_URL)
    try:
        command.upgrade(rag_alembic_cfg, "head")
        print("[TEST SETUP] RAG Alembic migrations applied successfully.")
    except Exception as e:
        print(f"[TEST SETUP] Error applying RAG Alembic migrations: {e}")


@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Fixture chạy tự động một lần trước toàn bộ test suite để setup môi trường database test."""
    # 1. Tạo database test nếu chưa tồn tại
    create_test_databases_if_not_exists()

    # 2. Chạy migrations trên test database
    run_alembic_migrations()

    yield
