from langchain_google_genai import ChatGoogleGenerativeAI
from app.core.config import settings

def get_gemini_llm(model_name: str | None = None, api_key: str | None = None, temperature: float = 0.1) -> ChatGoogleGenerativeAI:
    """
    Khởi tạo ChatGoogleGenerativeAI model từ settings tập trung.
    """
    model = model_name or settings.GEMINI_LLM_MODEL
    key = api_key or settings.GEMINI_API_KEY
    return ChatGoogleGenerativeAI(
        model=model,
        google_api_key=key,
        temperature=temperature
    )
