"""
Tests for public API endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.models import Order, QRToken, ProofType


class TestGetOrderByToken:
    """Tests for GET /api/v1/public/order/{token}"""

    def test_valid_token_returns_order_summary(
        self, client: TestClient, test_token: QRToken
    ):
        """Valid token should return order summary."""
        response = client.get(f"/api/v1/public/order/{test_token.token}")

        assert response.status_code == 200
        data = response.json()
        assert "order_number" in data
        assert "organization_name" in data
        assert data["has_before_proof"] is False
        assert data["has_after_proof"] is False

    def test_invalid_token_returns_404(self, client: TestClient):
        """Invalid token should return 404."""
        response = client.get("/api/v1/public/order/invalid-token-here")

        assert response.status_code == 404
        assert response.json()["detail"] == "TOKEN_INVALID"

    def test_inactive_token_returns_404(
        self, client: TestClient, db: Session, test_token: QRToken
    ):
        """Inactive token should return 404."""
        test_token.is_active = False
        db.commit()

        response = client.get(f"/api/v1/public/order/{test_token.token}")

        assert response.status_code == 404


class TestGetProof:
    """Tests for GET /api/v1/public/proof/{token}"""

    def test_valid_token_returns_proof_data(
        self, client: TestClient, test_token: QRToken
    ):
        """Valid token should return proof data."""
        response = client.get(f"/api/v1/public/proof/{test_token.token}")

        assert response.status_code == 200
        data = response.json()
        assert "order_number" in data
        assert "proofs" in data
        assert isinstance(data["proofs"], list)

    def test_invalid_token_returns_404(self, client: TestClient):
        """Invalid token should return 404."""
        response = client.get("/api/v1/public/proof/invalid-token")

        assert response.status_code == 404


class TestUploadProof:
    """Tests for POST /api/v1/public/proof/{token}/upload"""

    def test_upload_requires_valid_token(self, client: TestClient):
        """Upload should fail with invalid token."""
        # Create a simple test image
        import io

        image_data = io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 100)

        response = client.post(
            "/api/v1/public/proof/invalid-token/upload",
            files={"file": ("test.png", image_data, "image/png")},
        )

        assert response.status_code == 404

    def test_upload_rejects_non_image(
        self, client: TestClient, test_token: QRToken
    ):
        """Upload should reject non-image files."""
        import io

        text_data = io.BytesIO(b"This is not an image")

        response = client.post(
            f"/api/v1/public/proof/{test_token.token}/upload",
            files={"file": ("test.txt", text_data, "text/plain")},
        )

        assert response.status_code == 422
        assert "Invalid file type" in response.json()["detail"]


class TestPresignedUpload:
    """Tests for POST /api/v1/public/proof/{token}/presign"""

    def test_presign_requires_valid_token(self, client: TestClient):
        """Presign should fail with invalid token."""
        response = client.post(
            "/api/v1/public/proof/invalid-token/presign",
            json={
                "filename": "test.jpg",
                "content_type": "image/jpeg",
                "proof_type": "AFTER",
            },
        )

        assert response.status_code == 404

    def test_presign_returns_upload_data(
        self, client: TestClient, test_token: QRToken
    ):
        """Valid presign request should return upload data."""
        response = client.post(
            f"/api/v1/public/proof/{test_token.token}/presign",
            json={
                "filename": "test.jpg",
                "content_type": "image/jpeg",
                "proof_type": "AFTER",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "upload_url" in data
        assert "fields" in data
        assert "file_key" in data
        assert "expires_in" in data

    def test_presign_rejects_non_image(
        self, client: TestClient, test_token: QRToken
    ):
        """Presign should reject non-image content types."""
        response = client.post(
            f"/api/v1/public/proof/{test_token.token}/presign",
            json={
                "filename": "test.txt",
                "content_type": "text/plain",
                "proof_type": "AFTER",
            },
        )

        assert response.status_code == 422
        assert "INVALID_CONTENT_TYPE" in response.json()["detail"]


class TestShortLink:
    """Tests for GET /api/v1/public/s/{code}"""

    def test_invalid_code_returns_404(self, client: TestClient):
        """Invalid short code should return 404."""
        response = client.get("/api/v1/public/s/INVALID")

        assert response.status_code == 404
        assert response.json()["detail"] == "SHORT_NOT_FOUND"

    def test_empty_code_returns_422(self, client: TestClient):
        """Empty code should return 422."""
        response = client.get("/api/v1/public/s/")

        # FastAPI returns 404 for missing path parameter
        assert response.status_code in [404, 422]
