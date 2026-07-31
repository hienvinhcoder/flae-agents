"""Safety checks shared by the RAG Alembic environment and tests."""

from sqlalchemy.engine import make_url


def validate_rag_database_url(rag_url: str, core_url: str) -> str:
    rag = make_url(rag_url)
    core = make_url(core_url)
    if not rag.database:
        raise RuntimeError("RAG_DATABASE_URL must include a database name")
    if rag.database == core.database:
        raise RuntimeError("RAG_DATABASE_URL must target a different database")
    return rag_url
