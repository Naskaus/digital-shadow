"""
Core configuration using pydantic-settings.
"""
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )
    
    # Database
    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/digital_shadow"
    
    # JWT
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # Google Sheets
    google_credentials_path: str = "./credentials.json"

    # AI Analyst (Claude API)
    anthropic_api_key: str = ""

    # Environment
    environment: str = "development"

    # Application
    app_title: str = "Digital Shadow"
    app_version: str = "0.2.0"
    
    @property
    def is_development(self) -> bool:
        return self.environment == "development"


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()
