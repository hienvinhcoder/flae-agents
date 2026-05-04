import os
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))

class Settings(BaseSettings):
    PROJECT_NAME: str = os.getenv('PROJECT_NAME', 'FASTAPI BASE FIRESTORE')
    API_PREFIX: str = ''
    BACKEND_CORS_ORIGINS: list[str] = ['*']
    
    # Firebase / GCP configuration
    GOOGLE_APPLICATION_CREDENTIALS: str = os.getenv('GOOGLE_APPLICATION_CREDENTIALS', '')
    
    model_config = SettingsConfigDict(
        env_file=os.path.join(BASE_DIR, '.env'),
        env_file_encoding='utf-8',
        extra='ignore'
    )

settings = Settings()
