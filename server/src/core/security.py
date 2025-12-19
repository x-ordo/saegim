import base64
import hashlib
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from .config import settings


def _get_fernet() -> Fernet:
    """Get Fernet instance for AES-256 encryption."""
    # Derive a proper Fernet key from the encryption key
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"prooflink_salt_v1",  # Static salt for deterministic encryption
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
    fernet = _get_fernet()
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
    fernet = _get_fernet()
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
