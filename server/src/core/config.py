from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    APP_ENV: str = "development"
    APP_BASE_URL: str = "http://localhost:8000"
    WEB_BASE_URL: str = "http://localhost:3000"

    # Database
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "prooflink"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"

    # Security
    JWT_SECRET: str = "change-me-in-production"
    JWT_EXPIRES_MIN: int = 60
    ENCRYPTION_KEY: str = "change-me-32-byte-key-here!!!!!"  # Must be 32 bytes for AES-256

    # Storage
    STORAGE_DRIVER: str = "local"
    LOCAL_UPLOAD_DIR: str = "data/uploads"

    # Token
    TOKEN_LENGTH: int = 12

    # Rate Limiting
    PUBLIC_TOKEN_RATE_LIMIT_PER_MIN: int = 60

    # Messaging (v1.5)
    MESSAGING_PROVIDER: str = "mock"
    KAKAO_SENDER_KEY: str = ""
    KAKAO_TEMPLATE_PROOF_DONE: str = ""
    SMS_SENDER_ID: str = ""
    FALLBACK_SMS_ENABLED: bool = True

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
