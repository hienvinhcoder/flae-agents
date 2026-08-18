from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory


BACKEND_ROOT = Path(__file__).parents[2]


def test_discovery_snapshot_migration_remains_in_chain_and_has_invalidation() -> None:
    config = Config(str(BACKEND_ROOT / "alembic-rag.ini"))
    scripts = ScriptDirectory.from_config(config)
    assert scripts.get_revision("rag_0016").down_revision == "rag_0015"

    source = (
        BACKEND_ROOT
        / "rag_migrations"
        / "versions"
        / "0015_add_discovery_snapshots.py"
    ).read_text()
    assert '"discovery_snapshots"' in source
    assert '"discovery_snapshot_payloads"' in source
    assert "uq_discovery_snapshots_current_workspace" in source
    assert "trg_invalidate_discovery_snapshot" in source
    assert "ENABLE ROW LEVEL SECURITY" in source
    assert "FORCE ROW LEVEL SECURITY" in source
