"""Thin, optional adapter around the installed LangSmith client."""

from collections.abc import Callable
from typing import cast
from uuid import UUID

from langchain_core.runnables import Runnable

LangSmithTarget = (
    Callable[[dict[object, object]], dict[object, object]]
    | Callable[[dict[object, object], dict[object, object]], dict[object, object]]
    | Runnable[object, object]
    | UUID
    | str
)


class LangSmithClientAdapter:
    def __init__(self) -> None:
        from langsmith import Client

        self._client = Client()

    def has_dataset(self, *, dataset_name: str) -> bool:
        return self._client.has_dataset(dataset_name=dataset_name)

    def create_dataset(
        self, dataset_name: str, *, description: str, metadata: dict[str, str]
    ) -> object:
        return self._client.create_dataset(
            dataset_name, description=description, metadata=metadata
        )

    def upsert_example(
        self,
        *,
        example_id: str,
        dataset_name: str,
        inputs: dict[str, object],
        outputs: dict[str, object],
        metadata: dict[str, str],
    ) -> None:
        from langsmith.utils import LangSmithNotFoundError

        example_uuid = UUID(example_id)
        try:
            self._client.read_example(example_uuid)
        except LangSmithNotFoundError:
            self._client.create_example(
                example_id=example_uuid,
                dataset_name=dataset_name,
                inputs=inputs,
                outputs=outputs,
                metadata=metadata,
            )
        else:
            self._client.update_example(
                example_uuid,
                inputs=inputs,
                outputs=outputs,
                metadata=metadata,
            )

    def evaluate(
        self,
        target: object,
        *,
        data: str,
        experiment_prefix: str,
        metadata: dict[str, str],
        blocking: bool,
    ) -> object:
        return self._client.evaluate(
            cast(LangSmithTarget, target),
            data=data,
            experiment_prefix=experiment_prefix,
            metadata=metadata,
            blocking=blocking,
        )
