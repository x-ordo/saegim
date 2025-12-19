from slowapi import Limiter
from slowapi.util import get_remote_address

from src.core.config import settings

limiter = Limiter(key_func=get_remote_address)


def get_rate_limit() -> str:
    """Get rate limit string for public endpoints."""
    return f"{settings.PUBLIC_TOKEN_RATE_LIMIT_PER_MIN}/minute"
