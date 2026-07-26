import pytest
from app.services.knowalge_base.chunking_service import ChunkingService


def test_chunk_document_fixed():
    text = "Line 1\nLine 2\nLine 3\n" * 50
    file_hash = "abc123hash"
    chunks = ChunkingService.chunk_document(
        text=text,
        file_hash=file_hash,
        strategy="fixed",
        chunk_size=100,
        chunk_overlap=10,
    )

    assert len(chunks) > 0
    assert all(c["chunk_id"].startswith(file_hash) for c in chunks)
    assert all("text" in c for c in chunks)
    assert all("token_count" in c for c in chunks)


def test_chunk_document_semantic():
    text = (
        "# Title\n"
        "## Section 1\n"
        "This is paragraph 1 under section 1.\n"
        "## Section 2\n"
        "This is paragraph 2 under section 2."
    )
    file_hash = "semantic123"
    chunks = ChunkingService.chunk_document(
        text=text,
        file_hash=file_hash,
        strategy="semantic",
        chunk_size=1200,
        chunk_overlap=100,
    )

    assert len(chunks) > 0
    assert all(c["chunk_id"].startswith(file_hash) for c in chunks)
    assert any("Section" in c["text"] for c in chunks)


def test_chunk_document_defaults():
    text = "Line 1\nLine 2\nLine 3\n" * 50
    file_hash = "defaults123"
    # Chạy dispatcher không truyền tham số tùy chọn để sử dụng settings
    chunks = ChunkingService.chunk_document(
        text=text,
        file_hash=file_hash,
    )

    assert len(chunks) > 0
    assert all(c["chunk_id"].startswith(file_hash) for c in chunks)
    assert all("text" in c for c in chunks)
    assert all("token_count" in c for c in chunks)
