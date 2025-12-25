import base64
import hashlib
import re
from typing import Optional
from functools import lru_cache
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from .config import settings


# Salt version for key rotation support
_SALT_VERSION = "v2"


def _derive_salt(context: str = "default") -> bytes:
    """
    Derive a dynamic salt based on context and encryption key.

    This provides:
    1. Different salts for different contexts (e.g., "phone", "email")
    2. Salt derivation from the encryption key itself (no static salt)
    3. Version support for future key rotation

    Args:
        context: Context identifier (e.g., "phone", "email", "pii")

    Returns:
        16-byte salt for PBKDF2
    """
    # Combine encryption key + context + version for unique salt per context
    salt_input = f"{settings.ENCRYPTION_KEY}:{context}:{_SALT_VERSION}"
    return hashlib.sha256(salt_input.encode()).digest()[:16]


@lru_cache(maxsize=8)
def _get_fernet(context: str = "phone") -> Fernet:
    """
    Get Fernet instance for AES-256 encryption with context-based salt.

    Args:
        context: Encryption context for salt derivation

    Returns:
        Fernet instance for the given context
    """
    salt = _derive_salt(context)
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(settings.ENCRYPTION_KEY.encode()))
    return Fernet(key)


def encrypt_phone(phone: str) -> str:
    """
    Encrypt phone number using AES-256 (Fernet).

    Args:
        phone: E.164 format phone number (e.g., +821012345678)

    Returns:
        Base64-encoded encrypted string
    """
    if not phone:
        return ""
    fernet = _get_fernet("phone")
    encrypted = fernet.encrypt(phone.encode())
    return encrypted.decode()


def decrypt_phone(encrypted_phone: str) -> str:
    """
    Decrypt phone number.

    Args:
        encrypted_phone: Base64-encoded encrypted string

    Returns:
        Original phone number in E.164 format
    """
    if not encrypted_phone:
        return ""
    fernet = _get_fernet("phone")
    decrypted = fernet.decrypt(encrypted_phone.encode())
    return decrypted.decode()


def hash_phone(phone: str) -> str:
    """
    Create SHA-256 hash of phone number for logging purposes.
    This allows tracking notifications without storing PII in logs.

    Args:
        phone: E.164 format phone number

    Returns:
        SHA-256 hash as hex string
    """
    if not phone:
        return ""
    return hashlib.sha256(phone.encode()).hexdigest()


def normalize_phone(raw: str, default_country: str = "KR") -> str:
    """Normalize phone number into E.164.

    MVP rules (pragmatic):
    - If it starts with '+', keep and strip non-digits.
    - For KR, accept 010-xxxx-xxxx / 0xx-xxxx-xxxx and convert to +82.
    - Also accept '82XXXXXXXXX' and convert to +82...
    """

    if raw is None:
        raise ValueError("PHONE_REQUIRED")
    s = str(raw).strip()
    if not s:
        raise ValueError("PHONE_REQUIRED")

    # keep leading + if present, otherwise digits only
    if s.startswith("+"):
        digits = re.sub(r"\D", "", s)
        if not digits:
            raise ValueError("INVALID_PHONE")
        return "+" + digits

    digits = re.sub(r"\D", "", s)
    if not digits:
        raise ValueError("INVALID_PHONE")

    if default_country.upper() == "KR":
        # If already starts with country code 82
        if digits.startswith("82") and len(digits) >= 10:
            return "+" + digits

        # If local style starting with 0 (e.g., 01012345678)
        if digits.startswith("0") and len(digits) >= 9:
            return "+82" + digits[1:]

    # Fallback: treat as international without plus
    return "+" + digits
