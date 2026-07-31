import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.messages import AIMessage

from app.agents.extractor.evidence_graph import run_evidence_extraction_agent


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
        "app.agents.shared.models.ChatGoogleGenerativeAI", return_value=model
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
