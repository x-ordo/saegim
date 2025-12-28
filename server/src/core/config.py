from typing import Optional
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

    # Admin (Backoffice)
    ADMIN_API_KEY: str = "dev-admin-key"
    ALLOW_ADMIN_API_KEY: bool = True

    # External Auth (OIDC/JWKS)
    AUTH_ENABLED: bool = True
    AUTH_JWKS_URL: str = ""  # e.g. https://<issuer>/.well-known/jwks.json
    AUTH_ISSUER: str = ""    # expected iss
    AUTH_AUDIENCE: str = ""  # optional, expected aud

    # Storage
    STORAGE_DRIVER: str = "local"
    LOCAL_UPLOAD_DIR: str = "data/uploads"

    # Token
    TOKEN_LENGTH: int = 12

    # Rate Limiting
    PUBLIC_TOKEN_RATE_LIMIT_PER_MIN: int = 60

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
