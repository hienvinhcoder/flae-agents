"""Typed request, budget, and outcome contracts for the memory agent."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class MemoryAgentModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class MemoryAgentBudget(MemoryAgentModel):
    max_steps: int = Field(default=8, ge=2, le=20)
    max_tool_calls: int = Field(default=4, ge=1, le=10)
    max_output_tokens: int = Field(default=2_000, ge=1, le=10_000)
    timeout_ms: int = Field(default=15_000, ge=100, le=120_000)


class MemoryAgentRequest(MemoryAgentModel):
    question: str = Field(min_length=1, max_length=4_000)
    thread_id: str | None = Field(default=None, min_length=1, max_length=500)
    budget: MemoryAgentBudget = MemoryAgentBudget()


class MemoryAgentOutcome(MemoryAgentModel):
    status: Literal["complete", "incomplete", "error"]
    answer: str
    citation_ids: tuple[str, ...]
    steps_used: int = Field(ge=0)
    error_code: str | None = None
