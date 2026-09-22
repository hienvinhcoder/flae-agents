from unittest.mock import MagicMock, patch

import numpy as np

from app.schemas.ingestion import ParsedBaseChunk
from app.services.knowledge.ingestion.chunking import ChunkingService
from app.utils.token import get_token_count


CHECKSUM = "sha256:" + "a" * 64
_PAD = (
    "Ca van hanh ShelfFlow ghi nhan vi tri ke, wave picking va doi soat xuat nhap "
    "theo tenant. Nhan su khong dung so lieu doanh thu hay sua SLA da ky. "
)


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
    assert all(chunk.token_count <= 100 for chunk in chunks)


def test_fixed_raw_respects_token_budget():
    text = "\n".join(f"line {i:03d}. {_PAD}" for i in range(40))
    chunks = ChunkingService.chunk_text_fixed(
        text, "eval", chunk_size=120, chunk_overlap=20
    )
    assert len(chunks) >= 2
    assert all(chunk["token_count"] <= 120 for chunk in chunks)
    assert all(chunk["text"].strip() for chunk in chunks)


def test_markdown_splits_by_headers_and_size():
    body = "\n".join(f"rebuild step {i:02d}. {_PAD}" for i in range(1, 25))
    text = (
        "# ADR\n\n"
        "## Decision\n\n"
        "Ship pgvector on 2026-04-01.\n\n"
        f"## Appendix rebuild\n\n{body}\n\n"
        "## Rollback\n\n"
        "Rollback Elasticsearch if needed.\n"
    )
    chunks = ChunkingService.chunk_document(
        text=text,
        content_checksum=CHECKSUM,
        strategy="markdown",
        chunk_size=900,
        chunk_overlap=150,
    )
    assert len(chunks) >= 2
    assert any("Decision" in chunk.text or "Decision" in chunk.heading_path for chunk in chunks)
    assert any("rebuild step 01" in chunk.text for chunk in chunks)
    assert any("Rollback" in chunk.text or "Rollback" in chunk.heading_path for chunk in chunks)


def test_semantic_pipeline_runs_recursive_then_semantic():
    body = "\n".join(f"rebuild step {i:02d}. {_PAD}" for i in range(1, 25))
    text = (
        "# ADR\n\n"
        "## Decision\n\n"
        "Ship pgvector on 2026-04-01.\n\n"
        f"## Appendix rebuild\n\n{body}\n"
    )

    fake_chunk = MagicMock(text="## Decision\n\nShip pgvector on 2026-04-01.", token_count=20)
    fake_doc = MagicMock(chunks=[fake_chunk])
    fake_pipe = MagicMock()
    fake_pipe.chunk_with.return_value = fake_pipe
    fake_pipe.run.return_value = fake_doc

    with patch(
        "app.services.knowledge.ingestion.chunking.Pipeline",
        return_value=fake_pipe,
    ) as pipe_ctor, patch(
        "app.services.knowledge.ingestion.chunking._gemini_embeddings",
        return_value=MagicMock(name="gemini"),
    ):
        chunks = ChunkingService.chunk_document(
            text=text,
            content_checksum=CHECKSUM,
            strategy="semantic",
            chunk_size=900,
        )

    assert pipe_ctor.called
    assert fake_pipe.chunk_with.call_count == 2
    assert fake_pipe.chunk_with.call_args_list[0].args[0] == "recursive"
    assert fake_pipe.chunk_with.call_args_list[1].args[0] == "semantic"
    assert fake_pipe.run.called
    assert len(chunks) == 1
    assert "Decision" in chunks[0].text or "Decision" in chunks[0].heading_path


def test_chunk_text_markdown_returns_dicts():
    text = "# Title\n\n## One\n\nHello world.\n\n## Two\n\nGoodbye world.\n"
    chunks = ChunkingService.chunk_text_markdown(text, "eval", chunk_size=900)
    assert len(chunks) >= 1
    assert all("chunk_id" in chunk and "text" in chunk for chunk in chunks)
    assert all(chunk["token_count"] == get_token_count(chunk["text"]) for chunk in chunks)


def test_flae_gemini_embeddings_batch():
    from app.services.knowledge.ingestion.chonkie_embeddings import FlaeGeminiEmbeddings

    emb = object.__new__(FlaeGeminiEmbeddings)
    emb._dimension = 8
    emb._model = "test-model"
    fake_vectors = [[0.1] * 8, [0.2] * 8]
    with patch(
        "app.services.knowledge.ingestion.service.IngestionService.generate_embeddings",
        return_value=(fake_vectors, 10),
    ):
        out = FlaeGeminiEmbeddings.embed_batch(emb, ["a", "b"])
    assert len(out) == 2
    assert isinstance(out[0], np.ndarray)
    assert out[0].shape == (8,)
