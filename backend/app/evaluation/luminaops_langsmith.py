"""Offline-testable LangSmith integration for the LuminaOps gold dataset."""

from __future__ import annotations

import asyncio
import os
import threading
from collections.abc import Callable, Coroutine, Mapping, Sequence
from pathlib import Path
from time import perf_counter
from typing import Protocol
from uuid import NAMESPACE_URL, uuid5

from pydantic import BaseModel, ConfigDict, Field

from app.core.logger import get_logger
from app.evaluation.luminaops import ExpectedHop, LuminaOpsDataset
from app.evaluation.luminaops_metrics import (
    score_document_coverage,
    score_forbidden_rejection,
    score_hop_recovery,
)


class _EvaluationModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class DatasetMirrorClient(Protocol):
    def has_dataset(self, *, dataset_name: str) -> bool: ...

    def create_dataset(
        self,
        dataset_name: str,
        *,
        description: str,
        metadata: dict[str, str],
    ) -> object: ...

    def upsert_example(
        self,
        *,
        example_id: str,
        dataset_name: str,
        inputs: dict[str, object],
        outputs: dict[str, object],
        metadata: dict[str, str],
    ) -> None: ...


class ExperimentClient(Protocol):
    def evaluate(
        self,
        target: object,
        *,
        data: str,
        experiment_prefix: str,
        metadata: dict[str, str],
        blocking: bool,
        evaluators: list[object] | None = None,
    ) -> object: ...


RetrieveCallable = Callable[..., Coroutine[object, object, Mapping[str, object]]]
DocumentExternalIdResolver = Callable[
    ..., Coroutine[object, object, Mapping[str, str]]
]
EvaluatorResult = dict[str, str | float | None]
Evaluator = Callable[[object, object], EvaluatorResult]

logger = get_logger(__name__)

_MISSING_DOCUMENT_NAME = "N/A"


class LuminaOpsMirrorResult(_EvaluationModel):
    dataset_name: str
    example_count: int = Field(ge=0)
    experiment_prefix: str


def langsmith_credentials_configured(
    env: Mapping[str, str] | None = None,
) -> bool:
    values = os.environ if env is None else env
    return bool(values.get("LANGSMITH_API_KEY") or values.get("LANGCHAIN_API_KEY"))


def dataset_langsmith_name(dataset: LuminaOpsDataset) -> str:
    return f"{dataset.dataset_name}-{dataset.version}"


def build_doc_id_aliases(dataset: LuminaOpsDataset) -> dict[str, str]:
    aliases: dict[str, str] = {}
    for document in dataset.documents:
        aliases[document.doc_id] = document.doc_id
        aliases[document.title] = document.doc_id
        aliases[Path(document.path).stem] = document.doc_id
    return aliases


def normalize_retrieved_doc_ids(
    *,
    aliases: Mapping[str, str],
    raw_values: Sequence[str],
) -> tuple[str, ...]:
    normalized: list[str] = []
    seen: set[str] = set()
    for raw_value in raw_values:
        canonical = aliases.get(raw_value)
        if canonical is not None and canonical not in seen:
            normalized.append(canonical)
            seen.add(canonical)
    return tuple(normalized)


def chunk_document_ids(results: Mapping[str, object]) -> tuple[str, ...]:
    """Collect the ``document_revisions.document_id`` values behind ``top_chunks``."""
    return _mapping_string_values(results.get("top_chunks"), key="source_document_id")


def unmapped_doc_id_values(
    *,
    aliases: Mapping[str, str],
    raw_values: Sequence[str],
) -> tuple[str, ...]:
    """Raw retriever values that matched no gold document alias.

    ``"N/A"`` is the retriever's placeholder for a chunk without a resolvable
    document name, so it carries no mis-ingest signal and is left out.
    """
    unmapped: list[str] = []
    for raw_value in raw_values:
        if raw_value == _MISSING_DOCUMENT_NAME or raw_value in aliases:
            continue
        if raw_value not in unmapped:
            unmapped.append(raw_value)
    return tuple(unmapped)


def normalize_retrieve_results(
    *,
    aliases: Mapping[str, str],
    results: Mapping[str, object],
    latency_ms: int,
    document_external_ids: Mapping[str, str] | None = None,
) -> dict[str, object]:
    """Map live retriever output onto gold ``doc_id`` space.

    Gold ``doc_id`` equals the ingested ``source_external_id``, so chunk
    ``source_document_id`` values are translated through
    ``document_external_ids`` before alias normalization. The chunk display name
    is kept as a secondary channel because it is the only signal available for
    fixtures that do not carry document ids.
    """
    external_ids = document_external_ids or {}
    raw_values: list[str] = []
    for document_id in chunk_document_ids(results):
        raw_values.append(external_ids.get(document_id, document_id))
    raw_values.extend(
        _mapping_string_values(results.get("top_chunks"), key="source_document")
    )

    output: dict[str, object] = {
        "retrieved_doc_ids": normalize_retrieved_doc_ids(
            aliases=aliases,
            raw_values=raw_values,
        ),
        "latency_ms": latency_ms,
    }

    unmapped = unmapped_doc_id_values(aliases=aliases, raw_values=raw_values)
    if unmapped:
        output["unmapped_raw_values"] = unmapped

    path_doc_ids = _path_evidence_doc_ids(results.get("top_paths"))
    if path_doc_ids:
        output["hop_evidence_doc_ids"] = normalize_retrieved_doc_ids(
            aliases=aliases,
            raw_values=path_doc_ids,
        )
    return output


class LuminaOpsDatasetMirror:
    def __init__(self, client: DatasetMirrorClient) -> None:
        self._client = client

    def mirror(self, dataset: LuminaOpsDataset) -> LuminaOpsMirrorResult:
        dataset_name = dataset_langsmith_name(dataset)
        if not self._client.has_dataset(dataset_name=dataset_name):
            self._client.create_dataset(
                dataset_name,
                description=dataset.description,
                metadata={"fixture_version": dataset.version},
            )

        for question in dataset.questions:
            self._client.upsert_example(
                example_id=str(
                    uuid5(NAMESPACE_URL, f"{dataset_name}/{question.id}")
                ),
                dataset_name=dataset_name,
                inputs={
                    "question": question.question,
                    "difficulty": question.difficulty.value,
                    "question_id": question.id,
                },
                outputs=question.model_dump(mode="json"),
                metadata={
                    "fixture_version": dataset.version,
                    "question_id": question.id,
                    "difficulty": question.difficulty.value,
                },
            )

        return LuminaOpsMirrorResult(
            dataset_name=dataset_name,
            example_count=len(dataset.questions),
            experiment_prefix=f"{dataset_name}-current",
        )


class LuminaOpsExperimentRunner:
    def __init__(self, client: ExperimentClient) -> None:
        self._client = client

    def run(
        self,
        mirror_result: LuminaOpsMirrorResult,
        *,
        target: object,
        evaluators: list[object],
    ) -> str:
        self._client.evaluate(
            target,
            data=mirror_result.dataset_name,
            experiment_prefix=mirror_result.experiment_prefix,
            metadata={"retriever_variant": "current"},
            blocking=True,
            evaluators=evaluators,
        )
        return mirror_result.experiment_prefix


def build_langsmith_evaluators() -> list[Evaluator]:
    def document_coverage(run: object, example: object) -> EvaluatorResult:
        outputs = _object_outputs(run)
        reference = _object_outputs(example)
        score = score_document_coverage(
            supporting_doc_ids=_string_sequence(reference.get("supporting_doc_ids")),
            retrieved_doc_ids=_string_sequence(outputs.get("retrieved_doc_ids")),
            answerable=bool(reference.get("answerable", True)),
        )
        return {"key": "document_coverage", "score": score}

    def forbidden_rejection(run: object, example: object) -> EvaluatorResult:
        outputs = _object_outputs(run)
        reference = _object_outputs(example)
        score = score_forbidden_rejection(
            forbidden_doc_ids=_string_sequence(reference.get("forbidden_doc_ids")),
            retrieved_doc_ids=_string_sequence(outputs.get("retrieved_doc_ids")),
        )
        return {"key": "forbidden_rejection", "score": score}

    def hop_recovery(run: object, example: object) -> EvaluatorResult:
        outputs = _object_outputs(run)
        reference = _object_outputs(example)
        raw_hops = reference.get("expected_hops")
        expected_hops = (
            tuple(
                ExpectedHop.model_validate(hop)
                for hop in raw_hops
                if isinstance(hop, (Mapping, ExpectedHop))
            )
            if isinstance(raw_hops, Sequence)
            else ()
        )
        raw_evidence = outputs.get("hop_evidence_doc_ids")
        evidence = (
            _string_sequence(raw_evidence) if raw_evidence is not None else None
        )
        score = score_hop_recovery(
            expected_hops=expected_hops,
            hop_evidence_doc_ids=evidence,
        )
        return {"key": "hop_recovery", "score": score}

    return [document_coverage, forbidden_rejection, hop_recovery]


async def _retrieve_not_configured(
    *, workspace_id: str, query: str
) -> Mapping[str, object]:
    del workspace_id, query
    raise RuntimeError("retrieve must be provided until live wiring is configured")


async def _resolver_not_configured(
    *, workspace_id: str, document_ids: Sequence[str]
) -> Mapping[str, str]:
    del workspace_id, document_ids
    raise RuntimeError(
        "resolve_document_external_ids must be provided to score live chunks"
    )


def make_live_target(
    *,
    workspace_id: str,
    aliases: Mapping[str, str],
    retrieve: RetrieveCallable = _retrieve_not_configured,
    resolve_document_external_ids: DocumentExternalIdResolver = (
        _resolver_not_configured
    ),
) -> Callable[[dict[str, object]], dict[str, object]]:
    """Build the synchronous LangSmith target that drives the live retriever.

    The retriever and the document-id resolver share a pooled asyncpg engine.
    ``asyncio.run`` would create and close a fresh event loop per example, which
    orphans every connection the pool bound to the previous loop, so one loop is
    created lazily and reused for the whole experiment (never closed here).
    A lock serializes examples because a single loop cannot be entered
    concurrently from LangSmith's worker threads.
    """
    loop: asyncio.AbstractEventLoop | None = None
    loop_lock = threading.Lock()

    async def evaluate_question(question: str) -> dict[str, object]:
        started_at = perf_counter()
        results = await retrieve(workspace_id=workspace_id, query=question)
        latency_ms = round((perf_counter() - started_at) * 1_000)

        document_ids = chunk_document_ids(results)
        external_ids: Mapping[str, str] = {}
        if document_ids:
            external_ids = await resolve_document_external_ids(
                workspace_id=workspace_id,
                document_ids=document_ids,
            )

        output = normalize_retrieve_results(
            aliases=aliases,
            results=results,
            latency_ms=latency_ms,
            document_external_ids=external_ids,
        )
        unmapped = _string_sequence(output.get("unmapped_raw_values"))
        if unmapped:
            logger.warning(
                "LuminaOps live retrieve returned %d unmapped document value(s) "
                "for %r: %s",
                len(unmapped),
                question,
                ", ".join(unmapped),
            )
        return output

    def target(inputs: dict[str, object]) -> dict[str, object]:
        nonlocal loop
        question = inputs["question"]
        if not isinstance(question, str):
            raise TypeError("question must be a string")
        with loop_lock:
            if loop is None:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            return loop.run_until_complete(evaluate_question(question))

    return target


def _as_mapping(value: object) -> Mapping[str, object]:
    return value if isinstance(value, Mapping) else {}


def _object_outputs(value: object) -> Mapping[str, object]:
    if isinstance(value, Mapping):
        return _as_mapping(value.get("outputs"))
    return _as_mapping(getattr(value, "outputs", None))


def _string_sequence(value: object) -> tuple[str, ...]:
    if not isinstance(value, Sequence) or isinstance(value, (str, bytes)):
        return ()
    return tuple(item for item in value if isinstance(item, str))


def _mapping_string_values(value: object, *, key: str) -> tuple[str, ...]:
    if not isinstance(value, Sequence) or isinstance(value, (str, bytes)):
        return ()
    return tuple(
        item[key]
        for item in value
        if isinstance(item, Mapping) and isinstance(item.get(key), str)
    )


def _path_evidence_doc_ids(value: object) -> tuple[str, ...]:
    if not isinstance(value, Sequence) or isinstance(value, (str, bytes)):
        return ()
    raw_values: list[str] = []
    for path in value:
        if not isinstance(path, Mapping):
            continue
        raw_values.extend(_string_sequence(path.get("evidence_doc_ids")))
    return tuple(raw_values)
