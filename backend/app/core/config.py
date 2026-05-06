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

    
    # Firebase / GCP configuration
    GOOGLE_APPLICATION_CREDENTIALS: str = os.getenv('GOOGLE_APPLICATION_CREDENTIALS', '')
    
    # OAuth Configurations
    HARAVAN_CLIENT_ID: str = os.getenv('HARAVAN_CLIENT_ID', '')
    HARAVAN_CLIENT_SECRET: str = os.getenv('HARAVAN_CLIENT_SECRET', '')
    KIOTVIET_CLIENT_ID: str = os.getenv('KIOTVIET_CLIENT_ID', '')
    KIOTVIET_CLIENT_SECRET: str = os.getenv('KIOTVIET_CLIENT_SECRET', '')
    
    # Security
    ENCRYPTION_KEY: str = os.getenv('ENCRYPTION_KEY', '') # 32 bytes base64 encoded for Fernet

    model_config = SettingsConfigDict(
        env_file=os.path.join(BASE_DIR, '.env'),
        env_file_encoding='utf-8',
        extra='ignore'
    )

settings = Settings()
