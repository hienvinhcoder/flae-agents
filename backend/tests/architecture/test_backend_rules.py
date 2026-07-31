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
