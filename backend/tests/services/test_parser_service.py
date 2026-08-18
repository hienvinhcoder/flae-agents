import pytest
from unittest.mock import MagicMock, patch
from app.services.knowledge.ingestion.parser import ParserService


def test_convert_pdf_to_markdown_returns_str_when_to_markdown_returns_str():
    dummy_pdf = b"%PDF-1.4..."
    file_name = "test.pdf"

    # Mock pymupdf and pymupdf4llm
    mock_doc = MagicMock()
    mock_to_markdown = MagicMock(return_value="## Header\nThis is a test.")

    with patch("pymupdf.open", return_value=mock_doc) as mock_open:
        with patch("pymupdf4llm.to_markdown", mock_to_markdown):
            result = ParserService.convert_pdf_to_markdown(dummy_pdf, file_name)

            assert isinstance(result, str)
            assert result == "## Header\nThis is a test."
            mock_open.assert_called_once_with(stream=dummy_pdf, filetype="pdf")
            mock_to_markdown.assert_called_once_with(mock_doc)
            mock_doc.close.assert_called_once()


def test_convert_pdf_to_markdown_handles_list_from_to_markdown():
    dummy_pdf = b"%PDF-1.4..."
    file_name = "test.pdf"

    mock_doc = MagicMock()
    # Mock to_markdown returning a list of dicts (e.g. from page_chunks=True)
    mock_to_markdown = MagicMock(
        return_value=[
            {"text": "Page 1 content"},
            {"text": "Page 2 content"},
        ]
    )

    with patch("pymupdf.open", return_value=mock_doc) as mock_open:
        with patch("pymupdf4llm.to_markdown", mock_to_markdown):
            result = ParserService.convert_pdf_to_markdown(dummy_pdf, file_name)

            assert isinstance(result, str)
            assert result == "Page 1 content\n\nPage 2 content"
            mock_open.assert_called_once_with(stream=dummy_pdf, filetype="pdf")
            mock_doc.close.assert_called_once()


def test_convert_pdf_to_markdown_fallback_on_import_error():
    dummy_pdf = b"%PDF-1.4..."
    file_name = "test.pdf"

    mock_doc = MagicMock()
    mock_page1 = MagicMock()
    mock_page1.get_text.return_value = "Page 1 Text"
    mock_page2 = MagicMock()
    mock_page2.get_text.return_value = "Page 2 Text"

    # doc is iterable returning pages
    mock_doc.__iter__.return_value = [mock_page1, mock_page2]

    # Dùng patch.dict trên sys.modules để mô phỏng pymupdf4llm không được cài đặt
    with patch.dict("sys.modules", {"pymupdf4llm": None}):
        with patch("pymupdf.open", return_value=mock_doc) as mock_open:
            result = ParserService.convert_pdf_to_markdown(dummy_pdf, file_name)

            assert isinstance(result, str)
            assert result == "Page 1 Text\n\nPage 2 Text"
            mock_open.assert_called_once_with(stream=dummy_pdf, filetype="pdf")
            mock_doc.close.assert_called_once()


def test_preprocess_text():
    text_with_placeholders = (
        "Hello World\n<!-- image -->\n"
        "![Alt text](http://example.com/image.png)\nEnd of text."
    )
    result = ParserService.preprocess_text(text_with_placeholders)
    assert "<!-- image -->" not in result
    assert "![Alt text]" not in result
    assert "Hello World" in result
    assert "End of text." in result
