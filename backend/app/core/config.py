import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
# Load environment variables into os.environ so that google-cloud and firebase-admin can use them
load_dotenv(os.path.join(BASE_DIR, '.env'))

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
    GEMINI_EMBEDDING_MODEL: str = os.getenv('GEMINI_EMBEDDING_MODEL', 'text-embedding-004')
    GEMINI_LLM_MODEL: str = os.getenv('GEMINI_LLM_MODEL', 'gemini-2.0-flash')
    EMBEDDING_DIMENSIONS: int = int(os.getenv('EMBEDDING_DIMENSIONS', '768'))

    # File upload limits
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv('MAX_UPLOAD_SIZE_MB', '50'))
    ALLOWED_MIME_TYPES: list[str] = [
        'application/pdf',
        'text/markdown',
        'text/plain',
        'text/x-markdown',
    ]

    model_config = SettingsConfigDict(
        env_file=os.path.join(BASE_DIR, '.env'),
        env_file_encoding='utf-8',
        extra='ignore'
    )

settings = Settings()
