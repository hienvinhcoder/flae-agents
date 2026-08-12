from pathlib import Path
import re


BACKEND_ROOT = Path(__file__).parents[2]
APP_ROOT = BACKEND_ROOT / "app"


def test_endpoints_do_not_execute_database_queries() -> None:
    violations: list[str] = []
    for path in (APP_ROOT / "api").rglob("*.py"):
        source = path.read_text(encoding="utf-8")
        if re.search(r"\b(?:db|session)\.(?:execute|commit)\s*\(", source):
            violations.append(str(path.relative_to(BACKEND_ROOT)))

    assert violations == []


def test_endpoints_do_not_return_internal_exception_messages() -> None:
    violations: list[str] = []
    for path in (APP_ROOT / "api").rglob("*.py"):
        source = path.read_text(encoding="utf-8")
        if re.search(r"detail\s*=.*str\s*\(\s*(?:e|exc|error)\s*\)", source):
            violations.append(str(path.relative_to(BACKEND_ROOT)))

    assert violations == []


def test_global_exception_handler_uses_project_logger() -> None:
    source = (APP_ROOT / "core" / "exceptions.py").read_text(encoding="utf-8")

    assert "get_logger" in source
    assert "logging.error" not in source


def test_async_temporal_activities_isolate_sync_io() -> None:
    source = (APP_ROOT / "temporal" / "activities" / "ingestion.py").read_text(
        encoding="utf-8"
    )

    assert "asyncio.to_thread" in source


def test_backend_has_no_legacy_module_names() -> None:
    forbidden = ("knowalge_base", "sche_", "srv_")
    violations = [
        str(path.relative_to(BACKEND_ROOT))
        for path in APP_ROOT.rglob("*.py")
        if any(token in str(path.relative_to(APP_ROOT)) for token in forbidden)
    ]
    assert violations == []


def test_temporal_activities_do_not_execute_database_transactions() -> None:
    violations: list[str] = []
    for path in (APP_ROOT / "temporal" / "activities").rglob("*.py"):
        source = path.read_text(encoding="utf-8")
        if re.search(r"\b(?:db|session)\.(?:execute|commit|delete|add)\s*\(", source):
            violations.append(str(path.relative_to(BACKEND_ROOT)))
    assert violations == []


def test_rag_records_live_under_models() -> None:
    forbidden = [
        APP_ROOT / "db" / "rag_models.py",
        APP_ROOT / "db" / "rag_graph_models.py",
        APP_ROOT / "db" / "rag_staging_models.py",
        APP_ROOT / "db" / "rag_memory_state_models.py",
    ]
    assert [str(path) for path in forbidden if path.exists()] == []
