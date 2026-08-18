"""
Parser service cho Knowledge Base.
Chứa các logic liên quan đến trích xuất văn bản từ PDF và tiền xử lý văn bản.
"""
import re
from app.core.logger import get_logger

logger = get_logger(__name__)


class ParserService:
    @staticmethod
    def convert_pdf_to_markdown(file_content: bytes, file_name: str) -> str:
        """
        Chuyển đổi PDF sang Markdown sử dụng pymupdf4llm (nhẹ, nhanh).
        Fallback: trả về text trích xuất cơ bản nếu pymupdf4llm không khả dụng.
        """
        try:
            import pymupdf4llm
            import pymupdf

            doc = pymupdf.open(stream=file_content, filetype="pdf")
            md_text = pymupdf4llm.to_markdown(doc)
            doc.close()

            if isinstance(md_text, str):
                logger.info(
                    f"PDF converted to markdown: {file_name}, "
                    f"{len(md_text)} chars"
                )
                return md_text
            elif isinstance(md_text, list):
                logger.info(
                    f"PDF converted to markdown (page chunks list): {file_name}, "
                    f"{len(md_text)} pages"
                )
                # Ghép text từ các dictionary của từng trang
                pages = []
                for page_dict in md_text:
                    if isinstance(page_dict, dict) and "text" in page_dict:
                        pages.append(str(page_dict["text"]))
                return "\n\n".join(pages)
            else:
                raise TypeError(
                    f"Unexpected return type from to_markdown: {type(md_text)}"
                )
        except ImportError:
            logger.warning(
                "pymupdf4llm not installed. Falling back to basic extraction."
            )
            import pymupdf

            doc = pymupdf.open(stream=file_content, filetype="pdf")
            text_parts = []
            for page in doc:
                text = page.get_text()
                if isinstance(text, str):
                    text_parts.append(text)
                else:
                    text_parts.append(str(text))
            doc.close()
            return "\n\n".join(text_parts)
        except Exception as e:
            logger.error(f"PDF conversion failed for {file_name}: {e}")
            raise

    @staticmethod
    def preprocess_text(text: str) -> str:
        """Tiền xử lý: xóa placeholder hình ảnh và link hình ảnh Markdown."""
        cleaned = re.sub(r"<!--\s*image\s*-->", "", text)
        cleaned = re.sub(r"\n?!\[.*?\]\(.*?\)\n?", "", cleaned)
        return cleaned.strip()
