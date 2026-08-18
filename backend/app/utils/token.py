"""
Các hàm tiện ích liên quan đến Token và LLM encoding.
"""
import tiktoken


def get_token_count(text: str, encoding_name: str = "cl100k_base") -> int:
    """Đếm số lượng token trong đoạn văn bản sử dụng tiktoken."""
    if not text:
        return 0
    try:
        encoding = tiktoken.get_encoding(encoding_name)
        return len(encoding.encode(text))
    except Exception:
        # Fallback cơ bản nếu có lỗi xảy ra
        return len(text.split())
