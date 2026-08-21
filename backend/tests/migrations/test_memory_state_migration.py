from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory


BACKEND_ROOT = Path(__file__).parents[2]


def test_memory_state_migration_is_rag_head_and_invalidates_with_graph() -> None:
    config = Config(str(BACKEND_ROOT / "alembic-rag.ini"))
    revisions = {item.revision for item in ScriptDirectory.from_config(config).walk_revisions()}
    assert "rag_0016" in revisions

    source = (
        BACKEND_ROOT
        / "rag_migrations"
        / "versions"
        / "0016_add_memory_state_projections.py"
    ).read_text()
    assert '"memory_state_rules"' in source
    assert '"memory_state_projections"' in source
    assert "uq_memory_state_projections_current_workspace" in source
    assert "trg_invalidate_memory_state_projection" in source
    assert "ENABLE ROW LEVEL SECURITY" in source
    assert "FORCE ROW LEVEL SECURITY" in source
