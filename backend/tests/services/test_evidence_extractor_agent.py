import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.messages import AIMessage

from app.services.knowledge.extraction.agent.evidence_graph import run_evidence_extraction_agent


@pytest.mark.asyncio
async def test_evidence_agent_returns_topic_free_typed_candidates() -> None:
    model = MagicMock()
    response = MagicMock(spec=AIMessage)
    response.content = json.dumps(
        {
            "observations": [
                {
                    "mention_key": "nova",
                    "raw_mention": "Nova",
                    "normalized_mention": "nova",
                    "proposed_type": "vendor",
                    "description": "Nova is an approved vendor.",
                    "evidence_start": 0,
                    "evidence_end": 4,
                    "confidence": 0.95,
                    "external_ids": [],
                    "disambiguation_attributes": [],
                }
            ],
            "assertions": [],
        }
    )
    response.response_metadata = {"token_usage": {"total_tokens": 42}}
    model.ainvoke = AsyncMock(return_value=response)

    with patch(
        "app.agents.shared.llm.ChatGoogleGenerativeAI", return_value=model
    ):
        result, tokens = await run_evidence_extraction_agent(
            chunk={"chunk_id": "chk_nova", "text": "Nova is approved."},
            model_name="gemini-2.5-flash",
            api_key="fake-key",
            entity_types=["vendor"],
            extractor_version="evidence-v1",
            glean_max=0,
        )

    assert result.observations[0].raw_mention == "Nova"
    assert result.assertions == ()
    assert "topic" not in result.model_dump_json()
    assert tokens == 42
    model.ainvoke.assert_awaited_once()


@pytest.mark.asyncio
async def test_evidence_agent_runs_every_configured_glean_pass() -> None:
    model = MagicMock()

    def response(name: str, token_count: int) -> MagicMock:
        value = MagicMock(spec=AIMessage)
        value.content = json.dumps(
            {
                "observations": [
                    {
                        "mention_key": name,
                        "raw_mention": name,
                        "normalized_mention": name.casefold(),
                        "proposed_type": "concept",
                        "description": f"{name} is source-backed.",
                        "evidence_start": 0,
                        "evidence_end": len(name),
                        "confidence": 0.9,
                    }
                ],
                "assertions": [],
            }
        )
        value.response_metadata = {"token_usage": {"total_tokens": token_count}}
        return value

    model.ainvoke = AsyncMock(
        side_effect=(response("Atlas", 10), response("Helios", 11), response("Orion", 12))
    )
    with patch(
        "app.agents.shared.llm.ChatGoogleGenerativeAI", return_value=model
    ):
        result, tokens = await run_evidence_extraction_agent(
            chunk={"chunk_id": "chunk-glean", "text": "Atlas Helios Orion"},
            model_name="fixture-model",
            api_key="fake-key",
            entity_types=["concept"],
            extractor_version="evidence-v2",
            glean_max=2,
        )

    assert tuple(item.raw_mention for item in result.observations) == (
        "Atlas",
        "Helios",
        "Orion",
    )
    assert tokens == 33
    assert model.ainvoke.await_count == 3
