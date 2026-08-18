from pathlib import Path

from app.evaluation.company_memory import (
    DiscoveryRun,
    LangSmithExperimentRunner,
    LangSmithDatasetMirror,
    load_evaluation_dataset,
    mirror_evaluation_dataset_if_configured,
    score_discovery,
)


DATASET_PATH = Path(__file__).with_name("dataset.json")


class FakeLangSmithClient:
    def __init__(self) -> None:
        self.datasets: dict[str, str] = {}
        self.examples: dict[str, tuple[dict[str, object], dict[str, object]]] = {}
        self.experiments: list[str] = []

    def has_dataset(self, *, dataset_name: str) -> bool:
        return dataset_name in self.datasets

    def create_dataset(
        self, dataset_name: str, *, description: str, metadata: dict[str, str]
    ) -> object:
        self.datasets[dataset_name] = description
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
        del dataset_name, metadata
        self.examples[example_id] = (inputs, outputs)

    def evaluate(
        self,
        target: object,
        *,
        data: str,
        experiment_prefix: str,
        metadata: dict[str, str],
        blocking: bool,
    ) -> object:
        del target, data, metadata, blocking
        self.experiments.append(experiment_prefix)
        return object()


def test_discovery_scores_many_to_many_assignment_and_stability() -> None:
    scenario = load_evaluation_dataset(DATASET_PATH).scenario("atlas")
    run = DiscoveryRun(
        memberships=scenario.discovery.expected_memberships,
        surviving_identity_ids=scenario.discovery.stable_identity_ids,
        taxonomy_change_count=0,
    )

    metrics = score_discovery(scenario.discovery, run)

    assert metrics.assignment_precision == 1.0
    assert metrics.assignment_recall == 1.0
    assert metrics.identity_survival == 1.0
    assert metrics.taxonomy_churn == 0.0
    target_ids = [membership.target_id for membership in run.memberships]
    assert len(target_ids) > len(set(target_ids))


def test_discovery_churn_and_missed_memberships_are_measured() -> None:
    scenario = load_evaluation_dataset(DATASET_PATH).scenario("helios")
    run = DiscoveryRun(
        memberships=scenario.discovery.expected_memberships[:-1],
        surviving_identity_ids=scenario.discovery.stable_identity_ids[:-1],
        taxonomy_change_count=2,
    )

    metrics = score_discovery(scenario.discovery, run)

    assert metrics.assignment_recall < 1.0
    assert metrics.identity_survival < 1.0
    assert metrics.taxonomy_churn > 0.0


def test_langsmith_mirror_is_versioned_idempotent_and_optional() -> None:
    dataset = load_evaluation_dataset(DATASET_PATH)
    client = FakeLangSmithClient()
    mirror = LangSmithDatasetMirror(client)

    first = mirror.mirror(dataset)
    second = mirror.mirror(dataset)

    assert first.dataset_name == "flae-company-memory-2026-07-29.v1"
    assert first.example_count == 3
    assert second.example_count == 3
    assert len(client.examples) == 3
    aurora_outputs = next(
        outputs
        for _, outputs in client.examples.values()
        if outputs["scenario_id"] == "aurora"
    )
    assert aurora_outputs["distractors"]
    assert aurora_outputs["acl_negative_ids"] == ["aurora-private-legal-review"]
    assert aurora_outputs["discovery"]["expected_memberships"]
    assert first.experiment_names == (
        "flae-company-memory-2026-07-29.v1-current",
        "flae-company-memory-2026-07-29.v1-without-graph-to-text",
        "flae-company-memory-2026-07-29.v1-without-text-to-graph",
    )


def test_environment_gates_hosted_dataset_mirroring() -> None:
    client = FakeLangSmithClient()

    disabled = mirror_evaluation_dataset_if_configured(
        DATASET_PATH, environment={}, client=client
    )
    enabled = mirror_evaluation_dataset_if_configured(
        DATASET_PATH,
        environment={"LANGSMITH_API_KEY": "configured"},
        client=client,
    )

    assert disabled is None
    assert enabled is not None
    assert enabled.example_count == 3


def test_langsmith_runner_launches_current_and_two_named_ablations() -> None:
    dataset = load_evaluation_dataset(DATASET_PATH)
    client = FakeLangSmithClient()
    mirrored = LangSmithDatasetMirror(client).mirror(dataset)
    target = object()

    names = LangSmithExperimentRunner(client).run(
        mirrored,
        current_target=target,
        without_graph_to_text_target=target,
        without_text_to_graph_target=target,
    )

    assert names == mirrored.experiment_names
    assert client.experiments == list(mirrored.experiment_names)
