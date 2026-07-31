from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
from temporalio.exceptions import ApplicationError

from app.core.exceptions import InvalidArgumentError
from app.schemas.enrichment import (
    EvidenceExtractionActivityInput,
    EvidenceExtractionCandidateBatch,
    EvidenceExtractionContext,
    EvidenceExtractionResult,
)
from app.temporal.activities.enrichment import extract_evidence_activity


def _command() -> EvidenceExtractionActivityInput:
    return EvidenceExtractionActivityInput(
        workspace_id=uuid4(),
        ingestion_run_id=uuid4(),
        revision_id=uuid4(),
        chunk_id="chk_nova",
        extractor_version="evidence-v1",
        model_name="gemini-2.5-flash",
    )


@pytest.mark.asyncio
async def test_extract_activity_passes_only_references_and_returns_compact_result() -> None:
    command = _command()
    context = EvidenceExtractionContext(
        workspace_id=command.workspace_id,
        revision_id=command.revision_id,
        chunk_id=command.chunk_id,
        chunk_text="Nova is approved.",
        extractor_version=command.extractor_version,
    )
    candidates = EvidenceExtractionCandidateBatch(observations=(), assertions=())
    expected = EvidenceExtractionResult(
        revision_id=command.revision_id,
        chunk_id=command.chunk_id,
        observation_count=0,
        assertion_count=0,
        output_checksum="sha256:" + "a" * 64,
    )
    with (
        patch(
            "app.temporal.activities.enrichment.activity.heartbeat"
        ) as heartbeat,
        patch(
            "app.temporal.activities.enrichment.EvidenceService.load_current_context",
            AsyncMock(return_value=context),
        ) as load_context,
        patch(
            "app.temporal.activities.enrichment.run_evidence_extraction_agent",
            AsyncMock(return_value=(candidates, 24)),
        ) as extract,
        patch(
            "app.temporal.activities.enrichment.EvidenceService.persist_candidates",
            AsyncMock(return_value=expected),
        ) as persist,
    ):
        result = await extract_evidence_activity(command)

    assert result == expected
    assert "chunk_text" not in command.model_dump()
    load_context.assert_awaited_once_with(command)
    assert extract.await_args.kwargs["chunk"] == {
        "chunk_id": "chk_nova",
        "text": "Nova is approved.",
    }
    persist.assert_awaited_once_with(command, candidates)
    assert heartbeat.call_count == 4


@pytest.mark.asyncio
async def test_malformed_evidence_is_non_retryable() -> None:
    command = _command()
    with (
        patch("app.temporal.activities.enrichment.activity.heartbeat"),
        patch(
            "app.temporal.activities.enrichment.EvidenceService.load_current_context",
            AsyncMock(
                side_effect=InvalidArgumentError("fabricated evidence span")
            ),
        ),
    ):
        with pytest.raises(ApplicationError) as captured:
            await extract_evidence_activity(command)

    assert captured.value.type == "INVALID_EVIDENCE_OUTPUT"
    assert captured.value.non_retryable is True
