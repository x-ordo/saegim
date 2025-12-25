"""
Storage service for file uploads.

Supports:
- Local file storage (development)
- S3/S3-compatible storage (production)
"""

import os
import uuid
import shutil
import logging
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional, BinaryIO
from dataclasses import dataclass

from src.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class PresignedUpload:
    """Presigned upload response for client-side uploads."""
    url: str
    fields: dict
    key: str
    expires_in: int


@dataclass
class StoredFile:
    """Stored file metadata."""
    key: str
    url: str
    size: int
    content_type: str


class StorageProvider(ABC):
    """Abstract storage provider interface."""

    @abstractmethod
    def generate_presigned_upload(
        self,
        filename: str,
        content_type: str,
        folder: str = "proofs",
    ) -> PresignedUpload:
        """Generate presigned URL for client-side upload."""
        pass

    @abstractmethod
    def get_file_url(self, key: str) -> str:
        """Get public URL for a stored file."""
        pass

    @abstractmethod
    def delete_file(self, key: str) -> bool:
        """Delete a file from storage."""
        pass

    @abstractmethod
    def file_exists(self, key: str) -> bool:
        """Check if a file exists."""
        pass


class LocalStorageProvider(StorageProvider):
    """Local filesystem storage for development."""

    def __init__(self, upload_dir: str, base_url: str):
        self.upload_dir = upload_dir
        self.base_url = base_url.rstrip("/")
        os.makedirs(upload_dir, exist_ok=True)

    def generate_presigned_upload(
        self,
        filename: str,
        content_type: str,
        folder: str = "proofs",
    ) -> PresignedUpload:
        """
        For local storage, we return a direct upload URL.
        The client will POST to our API instead of S3.
        """
        ext = os.path.splitext(filename)[1] or ".bin"
        key = f"{folder}/{datetime.utcnow().strftime('%Y/%m/%d')}/{uuid.uuid4().hex}{ext}"

        return PresignedUpload(
            url=f"{self.base_url}/api/v1/upload/local",
            fields={"key": key, "content_type": content_type},
            key=key,
            expires_in=300,
        )

    def save_file(self, key: str, file: BinaryIO, content_type: str) -> StoredFile:
        """Save file to local storage (used for direct uploads)."""
        file_path = os.path.join(self.upload_dir, key)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)

        with open(file_path, "wb") as f:
            shutil.copyfileobj(file, f)

        size = os.path.getsize(file_path)

        return StoredFile(
            key=key,
            url=self.get_file_url(key),
            size=size,
            content_type=content_type,
        )

    def get_file_url(self, key: str) -> str:
        return f"{self.base_url}/uploads/{key}"

    def delete_file(self, key: str) -> bool:
        file_path = os.path.join(self.upload_dir, key)
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to delete file {key}: {e}")
            return False

    def file_exists(self, key: str) -> bool:
        file_path = os.path.join(self.upload_dir, key)
        return os.path.exists(file_path)


class S3StorageProvider(StorageProvider):
    """AWS S3 / S3-compatible storage for production."""

    def __init__(
        self,
        bucket: str,
        region: str,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        endpoint_url: Optional[str] = None,
        cdn_url: Optional[str] = None,
        presigned_expires: int = 300,
        max_file_size: int = 10 * 1024 * 1024,
    ):
        import boto3
        from botocore.config import Config

        self.bucket = bucket
        self.region = region
        self.cdn_url = cdn_url.rstrip("/") if cdn_url else None
        self.presigned_expires = presigned_expires
        self.max_file_size = max_file_size

        # Create S3 client
        client_config = Config(
            region_name=region,
            signature_version="s3v4",
        )

        client_kwargs = {"config": client_config}

        if endpoint_url:
            client_kwargs["endpoint_url"] = endpoint_url

        if access_key and secret_key:
            client_kwargs["aws_access_key_id"] = access_key
            client_kwargs["aws_secret_access_key"] = secret_key

        self.s3_client = boto3.client("s3", **client_kwargs)

    def generate_presigned_upload(
        self,
        filename: str,
        content_type: str,
        folder: str = "proofs",
    ) -> PresignedUpload:
        """Generate presigned POST URL for client-side upload."""
        ext = os.path.splitext(filename)[1] or ".bin"
        key = f"{folder}/{datetime.utcnow().strftime('%Y/%m/%d')}/{uuid.uuid4().hex}{ext}"

        # Generate presigned POST
        presigned = self.s3_client.generate_presigned_post(
            Bucket=self.bucket,
            Key=key,
            Fields={"Content-Type": content_type},
            Conditions=[
                {"Content-Type": content_type},
                ["content-length-range", 1, self.max_file_size],
            ],
            ExpiresIn=self.presigned_expires,
        )

        return PresignedUpload(
            url=presigned["url"],
            fields=presigned["fields"],
            key=key,
            expires_in=self.presigned_expires,
        )

    def get_file_url(self, key: str) -> str:
        """Get URL for a stored file (CDN or S3 direct)."""
        if self.cdn_url:
            return f"{self.cdn_url}/{key}"

        # Generate presigned GET URL for private buckets
        return self.s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=3600,  # 1 hour for viewing
        )

    def delete_file(self, key: str) -> bool:
        try:
            self.s3_client.delete_object(Bucket=self.bucket, Key=key)
            return True
        except Exception as e:
            logger.error(f"Failed to delete S3 file {key}: {e}")
            return False

    def file_exists(self, key: str) -> bool:
        try:
            self.s3_client.head_object(Bucket=self.bucket, Key=key)
            return True
        except Exception:
            return False


# Singleton storage provider
_storage_provider: Optional[StorageProvider] = None


def get_storage_provider() -> StorageProvider:
    """Get the configured storage provider (singleton)."""
    global _storage_provider

    if _storage_provider is not None:
        return _storage_provider

    driver = settings.STORAGE_DRIVER.lower()

    if driver == "s3":
        if not settings.S3_BUCKET:
            raise ValueError("S3_BUCKET is required when STORAGE_DRIVER=s3")

        _storage_provider = S3StorageProvider(
            bucket=settings.S3_BUCKET,
            region=settings.S3_REGION,
            access_key=settings.S3_ACCESS_KEY,
            secret_key=settings.S3_SECRET_KEY,
            endpoint_url=settings.S3_ENDPOINT_URL,
            cdn_url=settings.S3_CDN_URL,
            presigned_expires=settings.S3_PRESIGNED_URL_EXPIRES,
            max_file_size=settings.S3_MAX_FILE_SIZE,
        )
        logger.info(f"Using S3 storage: bucket={settings.S3_BUCKET}")

    else:
        _storage_provider = LocalStorageProvider(
            upload_dir=settings.LOCAL_UPLOAD_DIR,
            base_url=settings.APP_BASE_URL,
        )
        logger.info(f"Using local storage: {settings.LOCAL_UPLOAD_DIR}")

    return _storage_provider


class StorageService:
    """High-level storage service for application use."""

    def __init__(self):
        self.provider = get_storage_provider()

    def create_presigned_upload(
        self,
        filename: str,
        content_type: str,
        folder: str = "proofs",
    ) -> PresignedUpload:
        """Create a presigned upload URL for client-side upload."""
        return self.provider.generate_presigned_upload(filename, content_type, folder)

    def get_file_url(self, key: str) -> str:
        """Get the URL for a stored file."""
        return self.provider.get_file_url(key)

    def delete_file(self, key: str) -> bool:
        """Delete a file from storage."""
        return self.provider.delete_file(key)

    def file_exists(self, key: str) -> bool:
        """Check if a file exists in storage."""
        return self.provider.file_exists(key)
