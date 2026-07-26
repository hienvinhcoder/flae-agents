from lingua import Language, LanguageDetectorBuilder

# Khởi tạo detector một lần duy nhất với các ngôn ngữ cần hỗ trợ để tối ưu hiệu năng
_languages = [Language.VIETNAMESE, Language.ENGLISH, Language.JAPANESE, Language.CHINESE]
_detector = LanguageDetectorBuilder.from_languages(*_languages).build()

def detect_language(text: str) -> str:
    """
    Tự động nhận diện ngôn ngữ của đoạn văn bản.
    Hỗ trợ nhận diện: Vietnamese, English, Japanese, Chinese.
    """
    if not text or text.isspace():
        return "English"

    try:
        detected = _detector.detect_language_of(text)
        if detected:
            # Ví dụ: Language.VIETNAMESE.name -> "VIETNAMESE" -> "Vietnamese"
            return detected.name.title()
    except Exception:
        pass

    return "English"
