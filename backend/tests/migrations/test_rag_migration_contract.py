import importlib
from pathlib import Path

import pytest

from rag_migrations.config import validate_rag_database_url


BACKEND_ROOT = Path(__file__).parents[2]


def test_rag_migration_refuses_the_core_database() -> None:
    core_url = "postgresql+asyncpg://postgres:postgres@localhost:5432/flae_db"

    with pytest.raises(RuntimeError, match="must target a different database"):
        validate_rag_database_url(core_url, core_url)


def test_rag_migration_accepts_a_distinct_database() -> None:
    rag_url = "postgresql+asyncpg://postgres:postgres@localhost:5432/rag_db"
    core_url = "postgresql+asyncpg://postgres:postgres@localhost:5432/flae_db"

    assert validate_rag_database_url(rag_url, core_url).endswith("/rag_db")


def test_rag_migration_refuses_core_database_name_on_another_host() -> None:
    rag_url = "postgresql+asyncpg://postgres:postgres@rag.internal:5432/flae_db"
    core_url = "postgresql+asyncpg://postgres:postgres@core.internal:5432/flae_db"

    with pytest.raises(RuntimeError, match="must target a different database"):
        validate_rag_database_url(rag_url, core_url)


def test_rag_baseline_emits_asyncpg_compatible_single_statements(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    migration = importlib.import_module(
        "rag_migrations.versions.0001_baseline_rag_schema"
    )
    statements: list[str] = []
    monkeypatch.setattr(migration.op, "execute", statements.append)

    migration.upgrade()

    assert not any(
        statement.count("CREATE TABLE IF NOT EXISTS public.") > 1
        for statement in statements
    )
    assert not any(
        statement.count("ALTER TABLE public.") > 1 for statement in statements
    )
    assert not any("END $$;" in statement and "GRANT" in statement for statement in statements)


def test_rag_baseline_enforces_owner_safe_rls_and_write_checks() -> None:
    migration = next((BACKEND_ROOT / "rag_migrations" / "versions").glob("*_baseline_rag_schema.py"))
    source = migration.read_text(encoding="utf-8")

    assert "NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS" in source
    assert "FORCE ROW LEVEL SECURITY" in source
    assert "WITH CHECK" in source
    assert "current_setting('app.current_workspace_id', true)" in source


def test_clean_rag_schema_does_not_partition_small_tables() -> None:
    migration = next((BACKEND_ROOT / "rag_migrations" / "versions").glob("*_baseline_rag_schema.py"))
    source = migration.read_text(encoding="utf-8")

    assert "PARTITION BY LIST" not in source


def test_runtime_rag_manager_contains_no_schema_ddl() -> None:
    source = (BACKEND_ROOT / "app" / "db" / "rag_db.py").read_text(encoding="utf-8")

    assert "CREATE TABLE" not in source
    assert "CREATE POLICY" not in source
    assert "ALTER TABLE" not in source


def test_runtime_rag_manager_assumes_the_non_owner_role() -> None:
    source = (BACKEND_ROOT / "app" / "db" / "rag_db.py").read_text(encoding="utf-8")

    assert "SET LOCAL ROLE" in source
    assert "RAG_DATABASE_APP_ROLE" in source
