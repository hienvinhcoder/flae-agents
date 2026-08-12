from app.schemas.ingestion import ParsedBaseChunk
from app.services.knowalge_base.chunking_service import ChunkingService


CHECKSUM = "sha256:" + "a" * 64


def test_chunk_document_fixed():
    text = "Line 1\nLine 2\nLine 3\n" * 50
    chunks = ChunkingService.chunk_document(
        text=text,
        content_checksum=CHECKSUM,
        strategy="fixed",
        chunk_size=100,
        chunk_overlap=10,
    )

    assert len(chunks) > 0
    assert all(isinstance(chunk, ParsedBaseChunk) for chunk in chunks)
    assert all(chunk.section_structural_key for chunk in chunks)
    assert all(chunk.text for chunk in chunks)
    assert all(chunk.token_count > 0 for chunk in chunks)


def test_chunk_document_semantic():
    text = (
        "# Title\n"
        "## Section 1\n"
        "This is paragraph 1 under section 1.\n"
        "## Section 2\n"
        "This is paragraph 2 under section 2."
    )
    chunks = ChunkingService.chunk_document(
        text=text,
        content_checksum=CHECKSUM,
        strategy="semantic",
        chunk_size=1200,
        chunk_overlap=100,
    )

    assert len(chunks) > 0
    assert all(isinstance(chunk, ParsedBaseChunk) for chunk in chunks)
    assert any("Section" in chunk.text for chunk in chunks)
    assert any("Section 2" in chunk.heading_path for chunk in chunks)


def test_chunk_document_defaults():
    text = "Line 1\nLine 2\nLine 3\n" * 50
    # Chạy dispatcher không truyền tham số tùy chọn để sử dụng settings
    chunks = ChunkingService.chunk_document(
        text=text,
        content_checksum=CHECKSUM,
    )

    assert len(chunks) > 0
    assert all(isinstance(chunk, ParsedBaseChunk) for chunk in chunks)
    assert all(chunk.text for chunk in chunks)
    assert all(chunk.token_count > 0 for chunk in chunks)
