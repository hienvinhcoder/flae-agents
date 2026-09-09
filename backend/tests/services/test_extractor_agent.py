import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from langchain_core.messages import AIMessage
from app.services.knowledge.extraction.agent.graph import run_extraction_agent
from app.services.knowledge.extraction.agent.nodes import _parse_llm_output


def test_parse_llm_output():
    raw_output = (
        "entity<|#|>Google<|#|>organization<|#|>An AI and search company\n"
        "relation<|#|>Google<|#|>Gemini<|#|>develops<|#|>Google develops Gemini LLM models\n"
        "<|COMPLETE|>"
    )
    entities, relations, _, _, _ = _parse_llm_output(raw_output, "chunk_99")

    assert len(entities) == 1
    assert entities[0]["entity_name"] == "Google"
    assert entities[0]["entity_type"] == "organization"
    assert entities[0]["description"] == "An AI and search company"
    assert entities[0]["source_chunk_id"] == "chunk_99"

    assert len(relations) == 1
    assert relations[0]["source"] == "Gemini"
    assert relations[0]["target"] == "Google"
    assert relations[0]["keywords"] == "develops"
    assert relations[0]["description"] == "Google develops Gemini LLM models"
    assert relations[0]["source_chunk_id"] == "chunk_99"


@pytest.mark.asyncio
async def test_run_extraction_agent_no_gleaning():
    # Mock ChatGoogleGenerativeAI
    mock_model_instance = MagicMock()

    # Mock return value of ainvoke
    mock_response = MagicMock(spec=AIMessage)
    mock_response.content = (
        "entity<|#|>OpenAI<|#|>organization<|#|>Makers of ChatGPT\n"
        "<|COMPLETE|>"
    )
    mock_response.response_metadata = {"token_usage": {"total_tokens": 150}}

    # Asynchronously returning response
    mock_model_instance.ainvoke = AsyncMock(return_value=mock_response)

    with patch("app.agents.shared.llm.ChatGoogleGenerativeAI", return_value=mock_model_instance):
        chunk = {"chunk_id": "chunk_abc", "text": "OpenAI makes ChatGPT."}

        result, tokens = await run_extraction_agent(
            chunk=chunk,
            model_name="gemini-2.5-flash",
            api_key="fake-key",
            entity_types=["organization"],
            glean_max=0  # No gleaning
        )

        assert tokens == 150
        assert len(result["entities"]) == 1
        assert result["entities"][0]["entity_name"] == "OpenAI"
        assert len(result["relations"]) == 0

        # Verify ainvoke was called exactly once
        assert mock_model_instance.ainvoke.call_count == 1


@pytest.mark.asyncio
async def test_run_extraction_agent_with_gleaning():
    mock_model_instance = MagicMock()

    # First pass response
    mock_response_1 = MagicMock(spec=AIMessage)
    mock_response_1.content = (
        "entity<|#|>Microsoft<|#|>organization<|#|>A software giant\n"
        "<|COMPLETE|>"
    )
    mock_response_1.response_metadata = {"token_usage": {"total_tokens": 100}}

    # Second pass response (gleaning)
    mock_response_2 = MagicMock(spec=AIMessage)
    mock_response_2.content = (
        "entity<|#|>Windows<|#|>product<|#|>Operating system by Microsoft\n"
        "relation<|#|>Microsoft<|#|>Windows<|#|>makes<|#|>Microsoft makes Windows OS\n"
        "<|COMPLETE|>"
    )
    mock_response_2.response_metadata = {"token_usage": {"total_tokens": 120}}

    # Mock calling ainvoke sequentially
    mock_model_instance.ainvoke = AsyncMock()
    mock_model_instance.ainvoke.side_effect = [mock_response_1, mock_response_2]

    with patch("app.agents.shared.llm.ChatGoogleGenerativeAI", return_value=mock_model_instance):
        chunk = {"chunk_id": "chunk_xyz", "text": "Microsoft developed Windows OS."}

        result, tokens = await run_extraction_agent(
            chunk=chunk,
            model_name="gemini-2.5-flash",
            api_key="fake-key",
            entity_types=["organization", "product"],
            glean_max=1  # With gleaning
        )

        assert tokens == 220 # 100 + 120
        assert len(result["entities"]) == 2
        assert result["entities"][0]["entity_name"] == "Microsoft"
        assert result["entities"][1]["entity_name"] == "Windows"

        assert len(result["relations"]) == 1
        assert result["relations"][0]["source"] == "Microsoft"
        assert result["relations"][0]["target"] == "Windows"

        # Verify ainvoke was called twice
        assert mock_model_instance.ainvoke.call_count == 2


def test_detect_language():
    from app.agents.shared.utils import detect_language

    # Test Vietnamese
    vi_text = "Hệ thống FLAE Agents hỗ trợ tự động nhận diện ngôn ngữ của tài liệu."
    assert detect_language(vi_text) == "Vietnamese"

    # Test English
    en_text = "FLAE Agents is a multi-agent platform for automating business processes."
    assert detect_language(en_text) == "English"

    # Test Japanese
    ja_text = "日本語のテキストをテストします。自動検出ができるはずです。"
    assert detect_language(ja_text) == "Japanese"

    # Test Chinese
    zh_text = "测试中文文本。系统应该能够正确检测到中文。"
    assert detect_language(zh_text) == "Chinese"

    # Test empty or whitespace
    assert detect_language("") == "English"
    assert detect_language("   ") == "English"
