"""Minimal location models retained for the ingestion pipeline.

The full evidence-first agent_memory schema was removed; only the location
types needed by ingestion/chunking are kept here.
"""

from __future__ import annotations

from typing import Annotated, Literal
from urllib.parse import quote
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class PageLocation(ContractModel):
    kind: Literal["page"] = "page"
    page_number: int = Field(ge=1)
    start_offset: int | None = Field(default=None, ge=0)
    end_offset: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def validate_offsets(self) -> PageLocation:
        if self.start_offset is not None and self.end_offset is not None:
            if self.end_offset <= self.start_offset:
                raise ValueError("page location must be ordered")
        return self


class CodeLocation(ContractModel):
    kind: Literal["code"] = "code"
    path: str = Field(min_length=1, max_length=2_000)
    start_line: int = Field(ge=1)
    end_line: int = Field(ge=1)
    start_column: int | None = Field(default=None, ge=0)
    end_column: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def validate_lines(self) -> CodeLocation:
        if self.end_line < self.start_line:
            raise ValueError("code location must be ordered")
        return self


class MessageLocation(ContractModel):
    kind: Literal["message"] = "message"
    channel_external_id: str = Field(min_length=1, max_length=500)
    message_external_id: str = Field(min_length=1, max_length=500)
    message_timestamp: str = Field(min_length=1, max_length=500)
    thread_external_id: str | None = Field(default=None, max_length=500)


class SectionLocation(ContractModel):
    kind: Literal["section"] = "section"
    block_id: str | None = Field(default=None, min_length=1, max_length=500)
    heading_path: tuple[str, ...] = Field(min_length=1, max_length=32)

    @field_validator("heading_path")
    @classmethod
    def validate_heading_path(cls, value: tuple[str, ...]) -> tuple[str, ...]:
        if any(not heading.strip() or len(heading) > 500 for heading in value):
            raise ValueError("heading path entries must be non-empty and at most 500 characters")
        return value


SourceLocation = Annotated[
    PageLocation | CodeLocation | MessageLocation | SectionLocation,
    Field(discriminator="kind"),
]
