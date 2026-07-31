"""Failure-isolated, content-redacted trace boundary for memory agents."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Protocol


class MemoryTraceSink(Protocol):
    async def record(self, metadata: dict[str, object]) -> None: ...


class OptionalMemoryTraceSink:
    def __init__(
        self, writer: Callable[[dict[str, object]], Awaitable[None]] | None = None
    ) -> None:
        self._writer = writer

    async def record(self, metadata: dict[str, object]) -> None:
        if self._writer is not None:
            await self._writer(metadata)
