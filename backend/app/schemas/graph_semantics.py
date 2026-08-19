"""Minimal graph semantic schemas retained for the ingestion workflow starter."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class GraphSemanticModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class DemoIngestionProfile(GraphSemanticModel):
    profile_version: str = Field(min_length=1, max_length=200)
    embedding_model: str = Field(min_length=1, max_length=200)
    embedding_dimension: int = Field(ge=1, le=100_000)
    embedding_policy_version: str = Field(min_length=1, max_length=200)
