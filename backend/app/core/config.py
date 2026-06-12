import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
ROOT_DIR = os.path.abspath(os.path.join(BASE_DIR, '../'))

# Thử load .env từ backend/ hoặc root/
env_file_path = os.path.join(BASE_DIR, '.env')
if not os.path.exists(env_file_path):
    env_file_path = os.path.join(ROOT_DIR, '.env')

if os.path.exists(env_file_path):
    load_dotenv(env_file_path)


class RAGSettings:
    """Cấu hình chunking, ingestion và retrieval cho Knowledge Base (RAG)."""
    CHUNKING_STRATEGY: str = 'semantic'
    FIXED_SIZE: int = 1200
    FIXED_OVERLAP: int = 100
    SEMANTIC_TARGET: int = 900
    SEMANTIC_OVERLAP: int = 150
    SEMANTIC_PRE_CONTEXT_LIMIT: int = 50
    SEMANTIC_HARD_LIMIT: int = 500

    # Summarization Configs
    SUMMARIZATION_THRESHOLD: int = 3
    SUMMARIZATION_LENGTH: int = 300

    # Graph Retrieval Configs
    RETRIEVAL_TOP_P: int = 3
    RETRIEVAL_BFS_DEPTH: int = 3
    RETRIEVAL_TOP_K_ORPHANS_TO_BRIDGE: int = 3
    RETRIEVAL_BEAM_WIDTH: int = 20
    RETRIEVAL_MAX_NEIGHBORS: int = 30

    # Scoring Configs
    SCORING_CHUNK_ALPHA: float = 0.5
    SCORING_TEXT_CONFIRMATION_BONUS: float = 0.4
    SCORING_STRONG_RECOMMENDATION_BONUS: float = 0.3
    SCORING_WEAK_RECOMMENDATION_BONUS: float = 0.15
    SCORING_SEED_DENSITY_BONUS: float = 0.4
    SCORING_ENTITY_DEGREE_WEIGHT: float = 0.01
    SCORING_RELATION_DEGREE_WEIGHT: float = 0.01
    SCORING_TOP_REC_K: int = 4


rag_settings = RAGSettings()


class Settings(BaseSettings):
    PROJECT_NAME: str = os.getenv('PROJECT_NAME', 'FASTAPI BASE FIRESTORE')
    API_V1_STR: str = '/api/v1'
    BACKEND_CORS_ORIGINS: list[str] = ['*']
    ENVIRONMENT: str = os.getenv('ENVIRONMENT', 'local')

    # Database
    POSTGRES_URL: str = os.getenv('POSTGRES_URL', 'postgresql+asyncpg://postgres:postgres@localhost:5432/flae_db')
    RAG_DATABASE_URL: str = os.getenv('RAG_DATABASE_URL', 'postgresql+asyncpg://postgres:postgres@localhost:5432/rag_db')
    REDIS_URL: str = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

    # Temporal
    TEMPORAL_HOST: str = os.getenv('TEMPORAL_HOST', 'localhost:7233')
    TEMPORAL_NAMESPACE: str = os.getenv('TEMPORAL_NAMESPACE', 'default')

    # Firebase / GCP configuration
    GOOGLE_APPLICATION_CREDENTIALS: str = os.getenv('GOOGLE_APPLICATION_CREDENTIALS', '')
    
    # Security
    ENCRYPTION_KEY: str = os.getenv('ENCRYPTION_KEY', '') # 32 bytes base64 encoded for Fernet

    # Google Cloud Storage
    GCS_BUCKET_NAME: str = os.getenv('GCS_BUCKET_NAME', 'flae-knowledge-base')

    # RAG Ingestion (Gemini)
    GEMINI_API_KEY: str = os.getenv('GEMINI_API_KEY', '')
    GEMINI_EMBEDDING_MODEL: str = os.getenv('GEMINI_EMBEDDING_MODEL', 'gemini-embedding-001')
    GEMINI_LLM_MODEL: str = os.getenv('GEMINI_LLM_MODEL', 'gemini-2.5-flash')
    EMBEDDING_DIMENSIONS: int = int(os.getenv('EMBEDDING_DIMENSIONS', '1024'))

    # RAG Ingestion Configs
    RAG_CHUNKING_STRATEGY: str = rag_settings.CHUNKING_STRATEGY
    RAG_FIXED_SIZE: int = rag_settings.FIXED_SIZE
    RAG_FIXED_OVERLAP: int = rag_settings.FIXED_OVERLAP
    RAG_SEMANTIC_TARGET: int = rag_settings.SEMANTIC_TARGET
    RAG_SEMANTIC_OVERLAP: int = rag_settings.SEMANTIC_OVERLAP
    RAG_SEMANTIC_PRE_CONTEXT_LIMIT: int = rag_settings.SEMANTIC_PRE_CONTEXT_LIMIT
    RAG_SEMANTIC_HARD_LIMIT: int = rag_settings.SEMANTIC_HARD_LIMIT
    RAG_SUMMARIZATION_THRESHOLD: int = int(os.getenv('RAG_SUMMARIZATION_THRESHOLD', str(rag_settings.SUMMARIZATION_THRESHOLD)))
    RAG_SUMMARIZATION_LENGTH: int = int(os.getenv('RAG_SUMMARIZATION_LENGTH', str(rag_settings.SUMMARIZATION_LENGTH)))

    # Graph Retrieval Configs
    RAG_RETRIEVAL_TOP_P: int = rag_settings.RETRIEVAL_TOP_P
    RAG_RETRIEVAL_BFS_DEPTH: int = rag_settings.RETRIEVAL_BFS_DEPTH
    RAG_RETRIEVAL_TOP_K_ORPHANS_TO_BRIDGE: int = rag_settings.RETRIEVAL_TOP_K_ORPHANS_TO_BRIDGE
    RAG_RETRIEVAL_BEAM_WIDTH: int = rag_settings.RETRIEVAL_BEAM_WIDTH
    RAG_RETRIEVAL_MAX_NEIGHBORS: int = rag_settings.RETRIEVAL_MAX_NEIGHBORS

    # Scoring Configs
    RAG_SCORING_CHUNK_ALPHA: float = rag_settings.SCORING_CHUNK_ALPHA
    RAG_SCORING_TEXT_CONFIRMATION_BONUS: float = rag_settings.SCORING_TEXT_CONFIRMATION_BONUS
    RAG_SCORING_STRONG_RECOMMENDATION_BONUS: float = rag_settings.SCORING_STRONG_RECOMMENDATION_BONUS
    RAG_SCORING_WEAK_RECOMMENDATION_BONUS: float = rag_settings.SCORING_WEAK_RECOMMENDATION_BONUS
    RAG_SCORING_SEED_DENSITY_BONUS: float = rag_settings.SCORING_SEED_DENSITY_BONUS
    RAG_SCORING_ENTITY_DEGREE_WEIGHT: float = rag_settings.SCORING_ENTITY_DEGREE_WEIGHT
    RAG_SCORING_RELATION_DEGREE_WEIGHT: float = rag_settings.SCORING_RELATION_DEGREE_WEIGHT
    RAG_SCORING_TOP_REC_K: int = rag_settings.SCORING_TOP_REC_K

    # File upload limits
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv('MAX_UPLOAD_SIZE_MB', '50'))
    ALLOWED_MIME_TYPES: list[str] = [
        'application/pdf',
        'text/markdown',
        'text/plain',
        'text/x-markdown',
    ]

    model_config = SettingsConfigDict(
        env_file=env_file_path if os.path.exists(env_file_path) else None,
        env_file_encoding='utf-8',
        extra='ignore'
    )

settings = Settings()
