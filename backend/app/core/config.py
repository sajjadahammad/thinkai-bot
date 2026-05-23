from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "OliveBot"
    API_V1_STR: str = "/api/v1"
    
    # DB Settings
    DATABASE_URL: str = ""
    
    # LLM Settings
    MISTRAL_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    
    # Ingestion URL (SDK target)
    INGESTION_URL: str = "http://localhost:8000/api/v1/logs/"

    # JWT Settings
    JWT_SECRET_KEY: str = "super_secret_key_change_me_in_production_1234567890"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Admin Credentials
    ADMIN_EMAIL: str = "admin@olivebot.ai"
    ADMIN_PASSWORD: str = "adminpassword123"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()

# Ensure Database URL uses asyncpg
if settings.DATABASE_URL.startswith("postgresql://"):
    settings.DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

