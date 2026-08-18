import asyncio
from datetime import UTC, datetime
from hashlib import sha256
from time import sleep
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.core.config import settings
from app.schemas.ingestion import (
    BaseBatchReference,
    BaseStagePlan,
    IngestionWorkflowInput,
    PrepareBaseStageInput,
    SourceRevisionReference,
)
from app.temporal.activities import ingestion


@pytest.mark.asyncio
async def test_run_sync_with_heartbeats_reports_progress_while_blocked(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    heartbeats: list[object] = []
    details = {"stage": "test", "completed": 0}
    monkeypatch.setattr(ingestion, "HEARTBEAT_INTERVAL_SECONDS", 0.001)
    monkeypatch.setattr(ingestion.activity, "heartbeat", heartbeats.append)

    def blocked_sync_call(value: str) -> str:
        sleep(0.02)
        return value

    result = await ingestion._run_sync_with_heartbeats(
        blocked_sync_call,
        "complete",
        heartbeat_details=details,
    )

    assert result == "complete"
    assert len(heartbeats) >= 2
    assert all(heartbeat == details for heartbeat in heartbeats)


@pytest.mark.asyncio
async def test_run_sync_with_heartbeats_propagates_callable_timeout_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def unexpected_heartbeat(_details: object) -> None:
        pytest.fail("completed provider call must not be treated as a poll timeout")

    monkeypatch.setattr(ingestion.activity, "heartbeat", unexpected_heartbeat)

    def provider_call() -> None:
        raise TimeoutError("provider timeout")

    with pytest.raises(TimeoutError, match="provider timeout"):
        await asyncio.wait_for(
            ingestion._run_sync_with_heartbeats(
                provider_call,
                heartbeat_details={"stage": "test", "completed": 0},
            ),
            timeout=0.2,
        )


def _source(content: bytes = b"# Architecture\n\nEvidence") -> SourceRevisionReference:
    return SourceRevisionReference(
        workspace_id=uuid4(),
        source_id=uuid4(),
        document_id=uuid4(),
        revision_id=uuid4(),
        ingestion_run_id=uuid4(),
        source_uri=f"gcs://{settings.GCS_BUCKET_NAME}/workspace/document.md",
        source_name="Architecture notes",
        source_type="gcs",
        source_modified_at=datetime(2026, 7, 29, tzinfo=UTC),
        content_checksum="sha256:" + sha256(content).hexdigest(),
        acl_checksum="sha256:" + "b" * 64,
        acl_scope="workspace",
        parser_version="markdown-v1",
        chunker_version="structure-v1",
        pipeline_version="v1",
    )


def _plan(source: SourceRevisionReference) -> BaseStagePlan:
    batch = BaseBatchReference(
        workspace_id=source.workspace_id,
        ingestion_run_id=source.ingestion_run_id,
        revision_id=source.revision_id,
        batch_id="base-000000",
        item_count=1,
        pipeline_version=source.pipeline_version,
        input_checksum=source.content_checksum,
        output_checksum="sha256:" + "c" * 64,
    )
    return BaseStagePlan(
        revision_id=source.revision_id,
        ingestion_run_id=source.ingestion_run_id,
        chunk_count=1,
        batches=(batch,),
        manifest_checksum="sha256:" + "d" * 64,
    )


@pytest.mark.asyncio
async def test_prepare_activity_heartbeats_and_returns_only_compact_references(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    content = b"# Architecture\n\nEvidence"
    source = _source(content)
    expected = _plan(source)
    heartbeats: list[object] = []
    stage = AsyncMock(return_value=expected)
    monkeypatch.setattr(ingestion.activity, "heartbeat", heartbeats.append)
    monkeypatch.setattr(
        ingestion.GCSStorageService,
        "download_file_sync",
        MagicMock(return_value=content),
    )
    monkeypatch.setattr(
        ingestion.BaseStagingService, "stage_parsed_chunks", stage
    )

    result = await ingestion.prepare_base_stage_activity(
        PrepareBaseStageInput(source=source, batch_size=20)
    )

    assert result == expected
    assert len(heartbeats) == 3
    assert "Evidence" not in result.model_dump_json()
    stage.assert_awaited_once()


@pytest.mark.asyncio
async def test_prepare_activity_cancellation_at_heartbeat_stops_before_staging(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    source = _source()
    stage = AsyncMock()
    calls = 0

    def cancel_on_parse(_details: object) -> None:
        nonlocal calls
        calls += 1
        if calls == 2:
            raise asyncio.CancelledError

    monkeypatch.setattr(ingestion.activity, "heartbeat", cancel_on_parse)
    monkeypatch.setattr(
        ingestion.GCSStorageService,
        "download_file_sync",
        MagicMock(return_value=b"# Architecture\n\nEvidence"),
    )
    monkeypatch.setattr(
        ingestion.BaseStagingService, "stage_parsed_chunks", stage
    )

    with pytest.raises(asyncio.CancelledError):
        await ingestion.prepare_base_stage_activity(
            PrepareBaseStageInput(source=source)
        )
    stage.assert_not_awaited()


def test_workflow_contract_rejects_raw_document_payloads() -> None:
    source = _source()
    with pytest.raises(ValidationError, match="content_text"):
        IngestionWorkflowInput.model_validate(
            {
                "source": source.model_dump(mode="json"),
                "content_text": "raw evidence must never enter workflow history",
            }
        )
