from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache
from typing import Optional
import warnings


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

    # Security - Development defaults (MUST be overridden in production)
    JWT_SECRET: Optional[str] = None
    JWT_EXPIRES_MIN: int = 60
    ENCRYPTION_KEY: Optional[str] = None

    # Admin (Backoffice)
    ADMIN_API_KEY: Optional[str] = None
    ALLOW_ADMIN_API_KEY: bool = True

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() in ("production", "prod")

    @field_validator("JWT_SECRET", mode="after")
    @classmethod
    def validate_jwt_secret(cls, v: Optional[str], info) -> str:
        # Get APP_ENV from already validated values
        app_env = info.data.get("APP_ENV", "development")
        is_prod = app_env.lower() in ("production", "prod")

        if not v or v == "change-me-in-production":
            if is_prod:
                raise ValueError("JWT_SECRET is required in production. Set a secure random string (32+ chars).")
            warnings.warn("JWT_SECRET not set. Using insecure default for development only.", stacklevel=2)
            return "dev-only-insecure-jwt-secret-key!!"

        if len(v) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters for security.")
        return v

    @field_validator("ENCRYPTION_KEY", mode="after")
    @classmethod
    def validate_encryption_key(cls, v: Optional[str], info) -> str:
        app_env = info.data.get("APP_ENV", "development")
        is_prod = app_env.lower() in ("production", "prod")

        if not v or v == "change-me-32-byte-key-here!!!!!":
            if is_prod:
                raise ValueError("ENCRYPTION_KEY is required in production. Set a secure 32-byte key.")
            warnings.warn("ENCRYPTION_KEY not set. Using insecure default for development only.", stacklevel=2)
            return "dev-only-insecure-encryption-key!"

        if len(v) < 32:
            raise ValueError("ENCRYPTION_KEY must be exactly 32 bytes for AES-256.")
        return v

    @field_validator("ADMIN_API_KEY", mode="after")
    @classmethod
    def validate_admin_api_key(cls, v: Optional[str], info) -> str:
        app_env = info.data.get("APP_ENV", "development")
        is_prod = app_env.lower() in ("production", "prod")

        if not v or v == "dev-admin-key":
            if is_prod:
                raise ValueError("ADMIN_API_KEY is required in production.")
            warnings.warn("ADMIN_API_KEY not set. Using insecure default for development only.", stacklevel=2)
            return "dev-admin-key"

        if len(v) < 20:
            raise ValueError("ADMIN_API_KEY must be at least 20 characters for security.")
        return v

    # External Auth (OIDC/JWKS)
    AUTH_ENABLED: bool = True
    AUTH_JWKS_URL: str = ""  # e.g. https://<issuer>/.well-known/jwks.json
    AUTH_ISSUER: str = ""    # expected iss
    AUTH_AUDIENCE: str = ""  # optional, expected aud

    # Storage
    STORAGE_DRIVER: str = "local"  # "local" or "s3"
    LOCAL_UPLOAD_DIR: str = "data/uploads"

    # S3 Configuration (when STORAGE_DRIVER=s3)
    S3_BUCKET: str | None = None
    S3_REGION: str = "ap-northeast-2"
    S3_ACCESS_KEY: str | None = None
    S3_SECRET_KEY: str | None = None
    S3_ENDPOINT_URL: str | None = None  # For S3-compatible services (MinIO, etc.)
    S3_PRESIGNED_URL_EXPIRES: int = 300  # 5 minutes
    S3_MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    S3_CDN_URL: str | None = None  # Optional CDN URL for serving files

    # Token
    TOKEN_LENGTH: int = 12

    # Rate Limiting
    PUBLIC_TOKEN_RATE_LIMIT_PER_MIN: int = 60

    # Notification Retry
    NOTIFICATION_MAX_RETRIES: int = 3
    NOTIFICATION_RETRY_DELAY_SECONDS: float = 1.0  # Base delay, will be exponentially increased

    # Messaging
    # mock: no real sending, only DB log
    # kakao_i_connect: AlimTalk via Kakao i Connect Message API (Bearer token)
    # sens_sms: SMS only via NAVER Cloud SENS SMS API
    MESSAGING_PROVIDER: str = "mock"

    # Public short URL base. Prefer a short domain for SMS cost + CTR.
    # Example: https://sgm.kr  -> final: https://sgm.kr/s/ABC1234
    SHORT_URL_BASE: str = "http://localhost:3000"

    # Message templates (keep short; SMS is byte-limited)
    # Available placeholders: {brand}, {url}, {order}
    SMS_TEMPLATE_SENDER: str = "[{brand}] 인증 {url}"
    SMS_TEMPLATE_RECIPIENT: str = "[{brand}] 인증 {url}"
    ALIMTALK_TEMPLATE_SENDER: str = "{brand}\\n인증: {url}"
    ALIMTALK_TEMPLATE_RECIPIENT: str = "{brand}\\n인증: {url}"
    SMS_REMINDER_TEMPLATE: str = "[{brand}] 증빙 사진 업로드를 잊지 마세요! 주문: {order}. 업로드: {url}"

    # Kakao i Connect Message (AlimTalk) - optional
    KAKAOI_BASE_URL: Optional[str] = None  # e.g. https://api.kakaoi.ai (your tenant base url)
    KAKAOI_ACCESS_TOKEN: Optional[str] = None  # Bearer token
    KAKAO_SENDER_KEY: Optional[str] = None  # senderKey (plusfriend)
    KAKAO_TEMPLATE_PROOF_DONE: Optional[str] = None  # template_code
    KAKAO_SENDER_NO: Optional[str] = None  # optional: sender_no (registered)
    KAKAO_CID: Optional[str] = None  # optional client id for tracing (provider-specific)

    # NAVER Cloud SENS (SMS) - optional
    SENS_BASE_URL: str = "https://sens.apigw.ntruss.com"
    SENS_ACCESS_KEY: Optional[str] = None
    SENS_SECRET_KEY: Optional[str] = None
    SENS_SMS_SERVICE_ID: Optional[str] = None
    SENS_SMS_FROM: Optional[str] = None  # registered 발신번호 (digits only)
    SENS_SMS_CONTENT_TYPE: str = "COMM"  # COMM | AD
    SENS_SMS_COUNTRY_CODE: str = "82"

    # If AlimTalk fails, optionally send SMS fallback (requires SENS config)
    FALLBACK_SMS_ENABLED: bool = True

    # Error Tracking (Sentry)
    SENTRY_DSN: str | None = None
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1  # 10% of transactions
    SENTRY_PROFILES_SAMPLE_RATE: float = 0.1

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
