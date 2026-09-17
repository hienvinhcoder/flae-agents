from __future__ import annotations

from collections.abc import Sequence


def score_document_coverage(
    *,
    supporting_doc_ids: Sequence[str],
    retrieved_doc_ids: Sequence[str],
    answerable: bool,
) -> float:
    if not answerable:
        return 1.0 if len(supporting_doc_ids) == 0 else 0.0
    if not supporting_doc_ids:
        return 1.0
    expected = set(supporting_doc_ids)
    retrieved = set(retrieved_doc_ids)
    return len(expected & retrieved) / len(expected)


def score_forbidden_rejection(
    *,
    forbidden_doc_ids: Sequence[str],
    retrieved_doc_ids: Sequence[str],
) -> float:
    if not forbidden_doc_ids:
        return 1.0
    leaked = set(forbidden_doc_ids) & set(retrieved_doc_ids)
    return 0.0 if leaked else 1.0


def score_hop_recovery(
    *,
    expected_hops: Sequence[object],
    hop_evidence_doc_ids: Sequence[str] | None,
) -> float | None:
    if hop_evidence_doc_ids is None:
        return None
    needed: set[str] = set()
    for hop in expected_hops:
        needed.update(getattr(hop, "evidence_doc_ids"))
    if not needed:
        return 1.0
    got = set(hop_evidence_doc_ids)
    return len(needed & got) / len(needed)
