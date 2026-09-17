from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator, Mapping, Sequence
from contextlib import asynccontextmanager
from types import SimpleNamespace
from uuid import UUID

import pytest

from app.evaluation.langsmith_client import LangSmithClientAdapter
from app.evaluation.luminaops import load_luminaops_dataset
from app.evaluation.luminaops_langsmith import (
    LuminaOpsDatasetMirror,
    LuminaOpsExperimentRunner,
    LuminaOpsMirrorResult,
    build_doc_id_aliases,
    build_langsmith_evaluators,
    dataset_langsmith_name,
    langsmith_credentials_configured,
    make_live_target,
    normalize_retrieve_results,
    normalize_retrieved_doc_ids,
)
from scripts import evaluate_luminaops as cli

DOC_UUID_HANDBOOK = "11111111-1111-4111-8111-111111111111"
DOC_UUID_BENEFITS = "22222222-2222-4222-8222-222222222222"


class FakeClient:
    def __init__(self) -> None:
        self.datasets: set[str] = set()
        self.examples: list[dict[str, object]] = []

    def has_dataset(self, *, dataset_name: str) -> bool:
        return dataset_name in self.datasets

    def create_dataset(
        self,
        dataset_name: str,
        *,
        description: str,
        metadata: dict[str, str],
    ) -> object:
        self.datasets.add(dataset_name)
        return object()

    def upsert_example(
        self,
        *,
        example_id: str,
        dataset_name: str,
        inputs: dict[str, object],
        outputs: dict[str, object],
        metadata: dict[str, str],
    ) -> None:
        UUID(example_id)
        self.examples.append(
            {
                "example_id": example_id,
                "dataset_name": dataset_name,
                "inputs": inputs,
                "outputs": outputs,
                "metadata": metadata,
            }
        )


def test_langsmith_credentials_accepts_either_supported_key() -> None:
    assert langsmith_credentials_configured({"LANGSMITH_API_KEY": "key"})
    assert langsmith_credentials_configured({"LANGCHAIN_API_KEY": "key"})
    assert not langsmith_credentials_configured({"LANGSMITH_API_KEY": ""})


def test_dataset_langsmith_name() -> None:
    dataset = load_luminaops_dataset()
    assert dataset_langsmith_name(dataset) == (
        f"{dataset.dataset_name}-{dataset.version}"
    )


def test_normalize_doc_ids_via_aliases() -> None:
    dataset = load_luminaops_dataset()
    aliases = build_doc_id_aliases(dataset)
    first_document = dataset.documents[0]

    assert aliases["handbook"] == "handbook"
    assert aliases[first_document.title] == first_document.doc_id
    assert aliases[first_document.path.rsplit("/", maxsplit=1)[-1].rsplit(".", 1)[0]] == (
        first_document.doc_id
    )
    assert normalize_retrieved_doc_ids(
        aliases=aliases,
        raw_values=("handbook", "unknown-doc", first_document.title),
    ) == ("handbook",)


def test_normalize_retrieve_results_resolves_chunk_document_ids() -> None:
    output = normalize_retrieve_results(
        aliases={"handbook": "handbook", "benefits": "benefits"},
        results={
            "top_chunks": [
                {"source_document": "N/A", "source_document_id": DOC_UUID_HANDBOOK},
                {"source_document": "N/A", "source_document_id": DOC_UUID_BENEFITS},
            ],
            "top_paths": [],
        },
        latency_ms=12,
        document_external_ids={
            DOC_UUID_HANDBOOK: "handbook",
            DOC_UUID_BENEFITS: "benefits",
        },
    )

    assert output["retrieved_doc_ids"] == ("handbook", "benefits")
    assert output["latency_ms"] == 12
    assert "unmapped_raw_values" not in output
    assert "hop_evidence_doc_ids" not in output


def test_normalize_retrieve_results_ignores_missing_document_names() -> None:
    """Regression for the live path that only ever reported ``"N/A"`` names."""
    output = normalize_retrieve_results(
        aliases={"handbook": "handbook"},
        results={
            "top_chunks": [{"source_document": "N/A"}, {"source_document": "N/A"}],
            "top_paths": [],
        },
        latency_ms=5,
    )

    assert output["retrieved_doc_ids"] == ()
    assert "unmapped_raw_values" not in output


def test_normalize_retrieve_results_reports_unresolved_document_ids() -> None:
    output = normalize_retrieve_results(
        aliases={"handbook": "handbook"},
        results={
            "top_chunks": [
                {"source_document": "N/A", "source_document_id": DOC_UUID_HANDBOOK},
                {"source_document": "N/A", "source_document_id": DOC_UUID_BENEFITS},
            ],
            "top_paths": [],
        },
        latency_ms=5,
        document_external_ids={DOC_UUID_HANDBOOK: "handbook"},
    )

    assert output["retrieved_doc_ids"] == ("handbook",)
    assert output["unmapped_raw_values"] == (DOC_UUID_BENEFITS,)


def test_normalize_retrieve_results_accepts_document_names_when_present() -> None:
    output = normalize_retrieve_results(
        aliases={"handbook": "handbook", "Sổ tay": "handbook"},
        results={
            "top_chunks": [{"source_document": "Sổ tay"}],
            "top_paths": [],
        },
        latency_ms=4,
    )

    assert output["retrieved_doc_ids"] == ("handbook",)


def test_normalize_retrieve_results_includes_path_evidence() -> None:
    output = normalize_retrieve_results(
        aliases={"handbook": "handbook", "benefits": "benefits"},
        results={
            "top_chunks": [{"source_document": "handbook"}],
            "top_paths": [{"evidence_doc_ids": ["benefits", "unknown"]}],
        },
        latency_ms=3,
    )

    assert output["retrieved_doc_ids"] == ("handbook",)
    assert output["hop_evidence_doc_ids"] == ("benefits",)


def test_mirror_upserts_all_questions() -> None:
    dataset = load_luminaops_dataset()
    client = FakeClient()

    result = LuminaOpsDatasetMirror(client).mirror(dataset)

    assert result.dataset_name == dataset_langsmith_name(dataset)
    assert result.example_count == len(dataset.questions)
    assert result.experiment_prefix == f"{result.dataset_name}-current"
    assert len(client.examples) == len(dataset.questions)
    sample = client.examples[0]
    assert set(sample["inputs"]) >= {"question", "difficulty", "question_id"}  # type: ignore[arg-type]
    assert set(sample["outputs"]) >= {  # type: ignore[arg-type]
        "gold_answer",
        "supporting_doc_ids",
        "expected_hops",
        "forbidden_doc_ids",
        "answerable",
    }
    assert set(sample["metadata"]) >= {  # type: ignore[arg-type]
        "fixture_version",
        "question_id",
        "difficulty",
    }


def test_langsmith_evaluators_score_run_outputs() -> None:
    run = SimpleNamespace(
        outputs={
            "retrieved_doc_ids": ("handbook",),
            "hop_evidence_doc_ids": ("handbook",),
        }
    )
    example = SimpleNamespace(
        outputs={
            "supporting_doc_ids": ["handbook", "benefits"],
            "forbidden_doc_ids": ["obsolete"],
            "answerable": True,
            "expected_hops": [
                {
                    "subject": "A",
                    "predicate": "relates_to",
                    "object": "B",
                    "evidence_doc_ids": ["handbook", "benefits"],
                }
            ],
        }
    )

    scores = [evaluator(run, example) for evaluator in build_langsmith_evaluators()]

    assert scores == [
        {"key": "document_coverage", "score": 0.5},
        {"key": "forbidden_rejection", "score": 1.0},
        {"key": "hop_recovery", "score": 0.5},
    ]


def test_hop_evaluator_returns_none_when_path_evidence_is_absent() -> None:
    hop_evaluator = build_langsmith_evaluators()[2]

    score = hop_evaluator(
        {"outputs": {"retrieved_doc_ids": ("handbook",)}},
        {"outputs": {"expected_hops": []}},
    )

    assert score == {"key": "hop_recovery", "score": None}


def test_client_adapter_only_forwards_evaluators_when_provided() -> None:
    calls: list[dict[str, object]] = []

    class UnderlyingClient:
        def evaluate(self, target: object, **kwargs: object) -> object:
            calls.append(kwargs)
            return object()

    adapter = LangSmithClientAdapter.__new__(LangSmithClientAdapter)
    adapter._client = UnderlyingClient()  # type: ignore[attr-defined]
    adapter.evaluate(
        lambda inputs: inputs,
        data="dataset",
        experiment_prefix="experiment",
        metadata={"variant": "current"},
        blocking=True,
    )
    adapter.evaluate(
        lambda inputs: inputs,
        data="dataset",
        experiment_prefix="experiment",
        metadata={"variant": "current"},
        blocking=True,
        evaluators=[object()],
    )

    assert "evaluators" not in calls[0]
    assert calls[1]["evaluators"]


def test_experiment_runner_calls_evaluate_with_evaluators() -> None:
    calls: list[dict[str, object]] = []

    class ExpClient:
        def evaluate(
            self,
            target: object,
            *,
            data: str,
            experiment_prefix: str,
            metadata: dict[str, str],
            blocking: bool,
            evaluators: list[object] | None = None,
        ) -> object:
            calls.append(
                {
                    "data": data,
                    "experiment_prefix": experiment_prefix,
                    "evaluators": evaluators,
                    "blocking": blocking,
                }
            )
            return object()

    mirror = LuminaOpsMirrorResult(
        dataset_name="flae-luminaops-2026-09-11.v2",
        example_count=24,
        experiment_prefix="flae-luminaops-2026-09-11.v2-current",
    )
    evaluators = build_langsmith_evaluators()

    prefix = LuminaOpsExperimentRunner(ExpClient()).run(
        mirror,
        target=lambda inputs: {"retrieved_doc_ids": [], "latency_ms": 1},
        evaluators=evaluators,
    )

    assert prefix == mirror.experiment_prefix
    assert calls[0]["data"] == mirror.dataset_name
    assert calls[0]["evaluators"] == evaluators
    assert calls[0]["blocking"] is True


def test_make_live_target_resolves_document_ids_to_gold_doc_ids() -> None:
    retrieve_calls: list[tuple[str, str]] = []
    resolver_calls: list[tuple[str, tuple[str, ...]]] = []

    async def retrieve(*, workspace_id: str, query: str) -> dict[str, object]:
        retrieve_calls.append((workspace_id, query))
        return {
            "top_chunks": [
                {"source_document": "N/A", "source_document_id": DOC_UUID_HANDBOOK}
            ],
            "top_paths": [],
        }

    async def resolve(
        *, workspace_id: str, document_ids: Sequence[str]
    ) -> Mapping[str, str]:
        resolver_calls.append((workspace_id, tuple(document_ids)))
        return {DOC_UUID_HANDBOOK: "handbook"}

    target = make_live_target(
        workspace_id="workspace-1",
        aliases={"handbook": "handbook"},
        retrieve=retrieve,
        resolve_document_external_ids=resolve,
    )

    output = target({"question": "What is the policy?"})

    assert retrieve_calls == [("workspace-1", "What is the policy?")]
    assert resolver_calls == [("workspace-1", (DOC_UUID_HANDBOOK,))]
    assert output["retrieved_doc_ids"] == ("handbook",)
    assert isinstance(output["latency_ms"], int)


def test_make_live_target_skips_resolver_without_document_ids() -> None:
    async def retrieve(*, workspace_id: str, query: str) -> dict[str, object]:
        del workspace_id, query
        return {"top_chunks": [{"source_document": "Sổ tay"}], "top_paths": []}

    async def resolve(
        *, workspace_id: str, document_ids: Sequence[str]
    ) -> Mapping[str, str]:
        del workspace_id, document_ids
        raise AssertionError("resolver must not run without chunk document ids")

    target = make_live_target(
        workspace_id="workspace-1",
        aliases={"Sổ tay": "handbook"},
        retrieve=retrieve,
        resolve_document_external_ids=resolve,
    )

    assert target({"question": "policy?"})["retrieved_doc_ids"] == ("handbook",)


def test_make_live_target_reuses_one_event_loop_across_examples(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    loops: list[asyncio.AbstractEventLoop] = []

    async def retrieve(*, workspace_id: str, query: str) -> dict[str, object]:
        del workspace_id, query
        loops.append(asyncio.get_running_loop())
        return {"top_chunks": [{"source_document": "Sổ tay"}], "top_paths": []}

    def forbidden_run(*args: object, **kwargs: object) -> object:
        del args, kwargs
        raise AssertionError("asyncio.run closes the loop backing the asyncpg pool")

    monkeypatch.setattr(asyncio, "run", forbidden_run)

    target = make_live_target(
        workspace_id="workspace-1",
        aliases={"Sổ tay": "handbook"},
        retrieve=retrieve,
    )

    first = target({"question": "first?"})
    second = target({"question": "second?"})

    assert first["retrieved_doc_ids"] == ("handbook",)
    assert second["retrieved_doc_ids"] == ("handbook",)
    assert len(loops) == 2
    assert loops[0] is loops[1]
    assert not loops[0].is_closed()
    loops[0].close()


def test_make_live_target_requires_resolver_for_live_document_ids() -> None:
    async def retrieve(*, workspace_id: str, query: str) -> dict[str, object]:
        del workspace_id, query
        return {
            "top_chunks": [
                {"source_document": "N/A", "source_document_id": DOC_UUID_HANDBOOK}
            ],
            "top_paths": [],
        }

    target = make_live_target(
        workspace_id="workspace-1",
        aliases={"handbook": "handbook"},
        retrieve=retrieve,
    )

    with pytest.raises(RuntimeError, match="resolve_document_external_ids"):
        target({"question": "policy?"})


def test_cli_run_requires_kb_id(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LANGSMITH_API_KEY", "test-key")

    assert cli.main(["run"]) == 2


def test_cli_mirror_fails_without_credentials(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("LANGSMITH_API_KEY", raising=False)
    monkeypatch.delenv("LANGCHAIN_API_KEY", raising=False)

    assert cli.main(["mirror"]) == 1


def test_cli_mirror_does_not_build_live_target(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    dataset = load_luminaops_dataset()
    mirror_result = LuminaOpsMirrorResult(
        dataset_name="luminaops-test",
        example_count=24,
        experiment_prefix="luminaops-test-current",
    )

    monkeypatch.setenv("LANGSMITH_API_KEY", "test-key")
    monkeypatch.setattr(cli, "load_luminaops_dataset", lambda: dataset)
    monkeypatch.setattr(cli, "LangSmithClientAdapter", lambda: object())
    monkeypatch.setattr(
        cli.LuminaOpsDatasetMirror,
        "mirror",
        lambda self, value: mirror_result,
    )
    monkeypatch.setattr(
        cli,
        "build_doc_id_aliases",
        lambda value: pytest.fail("mirror must not build a live target"),
    )

    assert cli.main(["mirror"]) == 0
    assert "dataset=luminaops-test examples=24" in capsys.readouterr().out


def test_cli_run_mirrors_then_starts_live_experiment(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    dataset = load_luminaops_dataset()
    mirror_result = LuminaOpsMirrorResult(
        dataset_name="luminaops-test",
        example_count=24,
        experiment_prefix="luminaops-test-current",
    )
    calls: dict[str, object] = {}
    target = lambda inputs: inputs
    evaluators = [object()]

    monkeypatch.setenv("LANGSMITH_API_KEY", "test-key")
    monkeypatch.setattr(cli, "load_luminaops_dataset", lambda: dataset)
    monkeypatch.setattr(cli, "LangSmithClientAdapter", lambda: object())
    monkeypatch.setattr(
        cli.LuminaOpsDatasetMirror,
        "mirror",
        lambda self, value: mirror_result,
    )
    monkeypatch.setattr(cli, "build_doc_id_aliases", lambda value: {"doc": "doc"})

    def fake_make_live_target(**kwargs: object) -> object:
        calls["target_kwargs"] = kwargs
        return target

    def fake_run(
        self: object,
        result: LuminaOpsMirrorResult,
        *,
        target: object,
        evaluators: list[object],
    ) -> str:
        calls["run"] = (result, target, evaluators)
        return result.experiment_prefix

    monkeypatch.setattr(cli, "make_live_target", fake_make_live_target)
    monkeypatch.setattr(cli, "build_langsmith_evaluators", lambda: evaluators)
    monkeypatch.setattr(cli.LuminaOpsExperimentRunner, "run", fake_run)

    assert cli.main(["run", "--kb-id", "workspace-1"]) == 0
    assert calls["target_kwargs"] == {
        "workspace_id": "workspace-1",
        "aliases": {"doc": "doc"},
        "retrieve": cli._retrieve_results,
        "resolve_document_external_ids": cli._resolve_document_external_ids,
    }
    assert calls["run"] == (mirror_result, target, evaluators)
    assert "experiment_prefix=luminaops-test-current" in capsys.readouterr().out


async def test_cli_retrieve_adapter_discards_diagnostics(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_retrieve(
        workspace_id: str,
        query: str,
    ) -> tuple[dict[str, object], dict[str, object]]:
        assert (workspace_id, query) == ("workspace-1", "question")
        return {"top_chunks": [], "top_paths": []}, {"timing": 1}

    monkeypatch.setattr(cli.RetrieverService, "retrieve", fake_retrieve)

    assert await cli._retrieve_results(
        workspace_id="workspace-1",
        query="question",
    ) == {"top_chunks": [], "top_paths": []}


async def test_cli_resolver_maps_searchable_document_ids(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    executed: list[dict[str, object]] = []

    class FakeSession:
        async def execute(
            self, statement: object, params: dict[str, object]
        ) -> list[tuple[UUID, str]]:
            del statement
            executed.append(params)
            return [(UUID(DOC_UUID_HANDBOOK), "handbook")]

    @asynccontextmanager
    async def get_async_session(workspace_id: str) -> AsyncIterator[FakeSession]:
        assert workspace_id == "workspace-1"
        yield FakeSession()

    monkeypatch.setattr(
        cli,
        "rag_db_manager",
        SimpleNamespace(schema="rag", get_async_session=get_async_session),
    )

    mapping = await cli._resolve_document_external_ids(
        workspace_id="workspace-1",
        document_ids=[DOC_UUID_HANDBOOK, "not-a-uuid"],
    )

    assert mapping == {DOC_UUID_HANDBOOK: "handbook"}
    assert executed[0]["document_ids"] == [UUID(DOC_UUID_HANDBOOK)]
    assert executed[0]["workspace_id"] == "workspace-1"


async def test_cli_resolver_skips_database_without_valid_document_ids(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def unexpected_session(workspace_id: str) -> object:
        del workspace_id
        raise AssertionError("resolver must not open a session for invalid ids")

    monkeypatch.setattr(
        cli,
        "rag_db_manager",
        SimpleNamespace(schema="rag", get_async_session=unexpected_session),
    )

    assert (
        await cli._resolve_document_external_ids(
            workspace_id="workspace-1",
            document_ids=["not-a-uuid"],
        )
        == {}
    )
