from collections import Counter

from app.evaluation.luminaops import (
    ChunkProbe,
    Difficulty,
    assert_spans_verbatim,
    load_luminaops_dataset,
    read_document_text,
)
from app.services.knowledge.ingestion.chunking import ChunkingService
from app.utils.token import get_token_count

OVERSIZE_MARKER = "ADR014-OVERSIZE-PROBE"
HARD_LIMIT_MARKER = "DOCK-PROBE-KM-D01-NO-OVERLAP"
NEXT_AFTER_HARD_LIMIT = "KHANG-MINH-NEXT-SECTION-MARKER"


def test_luminaops_gold_schema_and_verbatim_spans() -> None:
    dataset = load_luminaops_dataset()
    assert dataset.dataset_name == "flae-luminaops"
    assert dataset.version == "2026-09-11.v2"
    assert dataset.chunking.fixed_size == 1200
    assert dataset.chunking.fixed_overlap == 100
    assert dataset.chunking.semantic_target == 900
    assert dataset.chunking.semantic_overlap == 150
    assert dataset.chunking.semantic_hard_limit == 500
    assert len(dataset.documents) == 12
    assert len(dataset.questions) == 24
    counts = Counter(question.difficulty for question in dataset.questions)
    assert counts[Difficulty.l1_extractive] == 6
    assert counts[Difficulty.l2_compare] == 6
    assert counts[Difficulty.l3_multihop] == 8
    assert counts[Difficulty.l4_trap] == 4
    assert any(doc.is_distractor for doc in dataset.documents)
    assert_spans_verbatim(dataset)


def test_luminaops_current_facts_and_traps() -> None:
    dataset = load_luminaops_dataset()
    by_id = {question.id: question for question in dataset.questions}

    hq = by_id["l1-01"]
    assert "Cầu Giấy" in hq.gold_answer
    assert hq.supporting_doc_ids == ("leadership-hq-2026-06",)

    ceo = by_id["l1-02"]
    assert "Phạm Đức Long" in ceo.gold_answer

    unanswerable = by_id["l4-01"]
    assert unanswerable.answerable is False
    assert unanswerable.supporting_spans == ()

    aws_trap = by_id["l4-02"]
    assert "topic-summary-pseudo" in aws_trap.forbidden_doc_ids
    assert "Không phải sự cố AWS" in aws_trap.supporting_spans[0].quote


def test_luminaops_documents_split_under_chonkie_chunking() -> None:
    """Offline split checks use fixed + markdown (semantic needs Gemini API)."""
    dataset = load_luminaops_dataset()
    profile = dataset.chunking
    for doc in dataset.documents:
        text = read_document_text(dataset, doc.doc_id)
        tokens = get_token_count(text)
        assert tokens >= doc.min_tokens, f"{doc.doc_id}: {tokens} tokens < {doc.min_tokens}"
        assert tokens > profile.fixed_size, f"{doc.doc_id} must exceed fixed_size to split"

        fixed = ChunkingService.chunk_text_fixed(
            text, "eval", profile.fixed_size, profile.fixed_overlap
        )
        markdown = ChunkingService.chunk_text_markdown(
            text,
            "eval",
            profile.semantic_target,
        )
        assert len(fixed) >= doc.min_fixed_chunks, (
            f"{doc.doc_id}: fixed {len(fixed)} < {doc.min_fixed_chunks}"
        )
        assert len(markdown) >= doc.min_semantic_chunks, (
            f"{doc.doc_id}: markdown {len(markdown)} < {doc.min_semantic_chunks}"
        )
        if len(fixed) >= 2:
            assert all(chunk["token_count"] <= profile.fixed_size for chunk in fixed)


def test_luminaops_oversized_heading_exceeds_semantic_target() -> None:
    dataset = load_luminaops_dataset()
    doc = next(item for item in dataset.documents if item.chunk_probe == ChunkProbe.oversized_section)
    text = read_document_text(dataset, doc.doc_id)
    assert OVERSIZE_MARKER in text
    section = _heading_block(text, "Phụ lục kỹ thuật rebuild index từng tenant")
    assert get_token_count(section) > dataset.chunking.semantic_target


def test_luminaops_chonkie_keeps_section_markers_findable() -> None:
    """Hard-limit probe docs still produce chunks covering successive sections."""
    dataset = load_luminaops_dataset()
    doc = next(item for item in dataset.documents if item.chunk_probe == ChunkProbe.hard_limit_unit)
    text = read_document_text(dataset, doc.doc_id)
    assert HARD_LIMIT_MARKER in text
    assert NEXT_AFTER_HARD_LIMIT in text

    markdown = ChunkingService.chunk_text_markdown(
        text,
        "eval",
        dataset.chunking.semantic_target,
    )
    joined = "\n".join(chunk["text"] for chunk in markdown)
    assert HARD_LIMIT_MARKER in joined
    assert NEXT_AFTER_HARD_LIMIT in joined


def _heading_block(text: str, heading: str) -> str:
    marker = f"## {heading}"
    start = text.index(marker)
    rest = text[start + len(marker) :]
    nxt = rest.find("\n## ")
    body = rest if nxt < 0 else rest[:nxt]
    return f"{marker}\n{body}"
