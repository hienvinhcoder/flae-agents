from app.evaluation.luminaops_metrics import (
    score_document_coverage,
    score_forbidden_rejection,
    score_hop_recovery,
)


def test_document_coverage_answerable_full_and_partial() -> None:
    assert score_document_coverage(
        supporting_doc_ids=("a", "b"),
        retrieved_doc_ids=("a", "b", "c"),
        answerable=True,
    ) == 1.0
    assert score_document_coverage(
        supporting_doc_ids=("a", "b"),
        retrieved_doc_ids=("a",),
        answerable=True,
    ) == 0.5


def test_document_coverage_unanswerable_requires_empty_support() -> None:
    assert score_document_coverage(
        supporting_doc_ids=(),
        retrieved_doc_ids=("x",),
        answerable=False,
    ) == 1.0


def test_forbidden_rejection() -> None:
    assert score_forbidden_rejection(
        forbidden_doc_ids=("bad",),
        retrieved_doc_ids=("good",),
    ) == 1.0
    assert score_forbidden_rejection(
        forbidden_doc_ids=("bad",),
        retrieved_doc_ids=("bad", "good"),
    ) == 0.0


class _Hop:
    def __init__(self, evidence_doc_ids: tuple[str, ...]) -> None:
        self.evidence_doc_ids = evidence_doc_ids


def test_hop_recovery_skips_without_evidence_key() -> None:
    assert score_hop_recovery(expected_hops=(_Hop(("a",)),), hop_evidence_doc_ids=None) is None


def test_hop_recovery_scores_when_evidence_present() -> None:
    assert score_hop_recovery(
        expected_hops=(_Hop(("a", "b")), _Hop(("c",))),
        hop_evidence_doc_ids=("a", "b", "c", "extra"),
    ) == 1.0
    assert score_hop_recovery(
        expected_hops=(_Hop(("a", "b")),),
        hop_evidence_doc_ids=("a",),
    ) == 0.5
