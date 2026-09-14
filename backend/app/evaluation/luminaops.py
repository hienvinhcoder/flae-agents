"""LuminaOps offline gold dataset for FLAE quality evaluation."""

from __future__ import annotations

from enum import StrEnum
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, model_validator


class LuminaOpsModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class Difficulty(StrEnum):
    l1_extractive = "l1_extractive"
    l2_compare = "l2_compare"
    l3_multihop = "l3_multihop"
    l4_trap = "l4_trap"


class SourceType(StrEnum):
    drive = "drive"
    notion = "notion"
    slack = "slack"
    upload = "upload"


class ChunkProbe(StrEnum):
    oversized_section = "oversized_section"
    hard_limit_unit = "hard_limit_unit"


class ChunkingProfile(LuminaOpsModel):
    """TGS-aligned chunking knobs copied from demo-app config / FLAE rag_settings."""

    fixed_size: int = Field(ge=1)
    fixed_overlap: int = Field(ge=0)
    semantic_target: int = Field(ge=1)
    semantic_overlap: int = Field(ge=0)
    semantic_pre_context_limit: int = Field(ge=0)
    semantic_hard_limit: int = Field(ge=1)


class DocumentRef(LuminaOpsModel):
    doc_id: str = Field(min_length=1, max_length=100)
    path: str = Field(min_length=1, max_length=500)
    title: str = Field(min_length=1, max_length=300)
    source_type: SourceType
    is_current: bool = True
    is_distractor: bool = False
    superseded_by: str | None = None
    min_tokens: int = Field(ge=1)
    min_fixed_chunks: int = Field(ge=1)
    min_semantic_chunks: int = Field(ge=1)
    chunk_probe: ChunkProbe | None = None


class SupportingSpan(LuminaOpsModel):
    doc_id: str = Field(min_length=1, max_length=100)
    quote: str = Field(min_length=8, max_length=800)


class ExpectedHop(LuminaOpsModel):
    subject: str = Field(min_length=1, max_length=200)
    predicate: str = Field(min_length=1, max_length=200)
    object: str = Field(min_length=1, max_length=200)
    evidence_doc_ids: tuple[str, ...] = Field(min_length=1, max_length=20)


class Question(LuminaOpsModel):
    id: str = Field(min_length=1, max_length=40)
    difficulty: Difficulty
    question: str = Field(min_length=1, max_length=1_000)
    answerable: bool
    gold_answer: str = Field(min_length=1, max_length=2_000)
    supporting_doc_ids: tuple[str, ...] = Field(max_length=50)
    supporting_spans: tuple[SupportingSpan, ...] = Field(max_length=50)
    expected_entities: tuple[str, ...] = Field(max_length=50)
    expected_hops: tuple[ExpectedHop, ...] = Field(max_length=20)
    forbidden_doc_ids: tuple[str, ...] = Field(max_length=20)
    notes: str = Field(default="", max_length=2_000)

    @model_validator(mode="after")
    def validate_question_bounds(self) -> Question:
        if len(self.supporting_doc_ids) != len(set(self.supporting_doc_ids)):
            raise ValueError(f"{self.id}: supporting_doc_ids must be unique")
        if len(self.forbidden_doc_ids) != len(set(self.forbidden_doc_ids)):
            raise ValueError(f"{self.id}: forbidden_doc_ids must be unique")
        if set(self.supporting_doc_ids) & set(self.forbidden_doc_ids):
            raise ValueError(f"{self.id}: supporting docs cannot also be forbidden")
        span_docs = {span.doc_id for span in self.supporting_spans}
        if not span_docs <= set(self.supporting_doc_ids):
            raise ValueError(f"{self.id}: span doc_id must be in supporting_doc_ids")
        hop_docs = {
            doc_id
            for hop in self.expected_hops
            for doc_id in hop.evidence_doc_ids
        }
        if not hop_docs <= set(self.supporting_doc_ids):
            raise ValueError(f"{self.id}: hop evidence must be supporting docs")
        if self.answerable and not self.supporting_spans:
            raise ValueError(f"{self.id}: answerable questions require spans")
        if not self.answerable and self.supporting_spans:
            raise ValueError(f"{self.id}: unanswerable questions cannot have spans")
        if self.difficulty == Difficulty.l3_multihop and len(self.expected_hops) < 2:
            raise ValueError(f"{self.id}: L3 requires at least two hops")
        if self.difficulty == Difficulty.l3_multihop and len(self.supporting_doc_ids) < 2:
            raise ValueError(f"{self.id}: L3 requires at least two supporting docs")
        return self


class LuminaOpsDataset(LuminaOpsModel):
    dataset_name: str = Field(min_length=1, max_length=200)
    version: str = Field(min_length=1, max_length=100)
    company: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=2_000)
    chunking: ChunkingProfile
    documents: tuple[DocumentRef, ...] = Field(min_length=1, max_length=100)
    expected_canonical_entities: tuple[str, ...] = Field(min_length=1, max_length=200)
    questions: tuple[Question, ...] = Field(min_length=1, max_length=500)

    @model_validator(mode="after")
    def validate_dataset(self) -> LuminaOpsDataset:
        doc_ids = [doc.doc_id for doc in self.documents]
        if len(doc_ids) != len(set(doc_ids)):
            raise ValueError("document ids must be unique")
        known = set(doc_ids)
        question_ids = [item.id for item in self.questions]
        if len(question_ids) != len(set(question_ids)):
            raise ValueError("question ids must be unique")
        distractors = {doc.doc_id for doc in self.documents if doc.is_distractor}
        probes = [doc.chunk_probe for doc in self.documents if doc.chunk_probe is not None]
        if probes.count(ChunkProbe.oversized_section) != 1:
            raise ValueError("exactly one oversized_section chunk probe is required")
        if probes.count(ChunkProbe.hard_limit_unit) != 1:
            raise ValueError("exactly one hard_limit_unit chunk probe is required")
        for doc in self.documents:
            if doc.superseded_by is not None and doc.superseded_by not in known:
                raise ValueError(f"{doc.doc_id}: unknown superseded_by")
        for question in self.questions:
            missing = set(question.supporting_doc_ids) - known
            if missing:
                raise ValueError(f"{question.id}: unknown supporting docs {missing}")
            missing_forbidden = set(question.forbidden_doc_ids) - known
            if missing_forbidden:
                raise ValueError(
                    f"{question.id}: unknown forbidden docs {missing_forbidden}"
                )
            if set(question.supporting_doc_ids) & distractors:
                raise ValueError(f"{question.id}: distractor cannot support an answer")
        return self


def dataset_root() -> Path:
    for parent in Path(__file__).resolve().parents:
        candidate = parent / "docs" / "datasets" / "luminaops"
        if (candidate / "gold.json").is_file():
            return candidate
    raise FileNotFoundError("docs/datasets/luminaops/gold.json not found")


def gold_path() -> Path:
    return dataset_root() / "gold.json"


def load_luminaops_dataset(path: Path | None = None) -> LuminaOpsDataset:
    target = gold_path() if path is None else path
    return LuminaOpsDataset.model_validate_json(target.read_text(encoding="utf-8"))


def read_document_text(dataset: LuminaOpsDataset, doc_id: str) -> str:
    ref = next(doc for doc in dataset.documents if doc.doc_id == doc_id)
    return (dataset_root() / ref.path).read_text(encoding="utf-8")


def assert_spans_verbatim(dataset: LuminaOpsDataset) -> None:
    for question in dataset.questions:
        for span in question.supporting_spans:
            body = read_document_text(dataset, span.doc_id)
            if span.quote not in body:
                raise ValueError(
                    f"{question.id}: quote not found in {span.doc_id}: {span.quote!r}"
                )
