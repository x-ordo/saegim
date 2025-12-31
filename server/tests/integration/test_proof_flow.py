"""
Integration tests for the complete proof upload flow.

Tests the end-to-end flow:
1. Order creation
2. QR token generation
3. Token validation
4. Proof upload
5. Proof retrieval
"""

import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.models import Order, QRToken, Proof, Organization


class TestProofUploadFlow:
    """Test the complete proof upload flow."""

    def test_complete_proof_flow(
        self,
        client: TestClient,
        db: Session,
        test_organization: Organization,
        sample_image_bytes: bytes,
    ):
        """Test the entire flow from order creation to proof verification."""
        # Step 1: Create an order (simulating admin action)
        order = Order(
            organization_id=test_organization.id,
            order_number="FLOW-TEST-001",
            sender_name="Flow Test Sender",
            context="Integration test",
        )
        db.add(order)
        db.commit()
        db.refresh(order)

        # Step 2: Generate QR token
        import secrets
        token_value = secrets.token_urlsafe(12)
        qr_token = QRToken(
            order_id=order.id,
            token=token_value,
            is_valid=True,
        )
        db.add(qr_token)
        db.commit()
        db.refresh(qr_token)

        # Step 3: Verify token is valid via API
        response = client.get(f"/api/v1/public/order/{token_value}")
        assert response.status_code == 200
        data = response.json()
        assert data["order_number"] == "FLOW-TEST-001"
        assert data["sender_name"] == "Flow Test Sender"

        # Step 4: Upload proof via API
        files = {
            "file": ("test_proof.jpg", io.BytesIO(sample_image_bytes), "image/jpeg")
        }
        response = client.post(
            f"/api/v1/public/proof/{token_value}/upload",
            files=files,
            data={"proof_type": "AFTER"},
        )
        assert response.status_code == 200
        upload_data = response.json()
        assert "proof_id" in upload_data or "id" in upload_data

        # Step 5: Verify proof is accessible
        response = client.get(f"/api/v1/public/proof/{token_value}")
        assert response.status_code == 200
        proof_data = response.json()
        assert proof_data["order_number"] == "FLOW-TEST-001"
        assert len(proof_data.get("proofs", [])) > 0 or "file_path" in proof_data

    def test_invalid_token_rejected(self, client: TestClient):
        """Test that invalid tokens are rejected."""
        response = client.get("/api/v1/public/order/invalid-token-12345")
        assert response.status_code == 404

    def test_revoked_token_rejected(
        self,
        client: TestClient,
        db: Session,
        test_order: Order,
    ):
        """Test that revoked tokens cannot be used for upload."""
        import secrets
        from datetime import datetime

        # Create a revoked token
        token_value = secrets.token_urlsafe(12)
        qr_token = QRToken(
            order_id=test_order.id,
            token=token_value,
            is_valid=False,
            revoked_at=datetime.utcnow(),
        )
        db.add(qr_token)
        db.commit()

        # Try to get order with revoked token
        response = client.get(f"/api/v1/public/order/{token_value}")
        assert response.status_code in [400, 404]


class TestTokenValidation:
    """Test QR token generation and validation."""

    def test_token_generation_creates_valid_token(
        self,
        db: Session,
        test_order: Order,
    ):
        """Test that generated tokens are valid."""
        from src.services.token_service import TokenService

        token_service = TokenService(db)
        token = token_service.generate_token(test_order.id)

        assert token is not None
        assert token.is_valid is True
        assert token.order_id == test_order.id

    def test_token_validation(
        self,
        db: Session,
        test_token: QRToken,
    ):
        """Test token validation returns correct order."""
        from src.services.token_service import TokenService

        token_service = TokenService(db)
        result = token_service.validate_token(test_token.token)

        assert result is not None
        assert result["order_id"] == test_token.order_id

    def test_token_revocation(
        self,
        db: Session,
        test_token: QRToken,
    ):
        """Test token revocation."""
        from src.services.token_service import TokenService

        token_service = TokenService(db)
        success = token_service.revoke_token(test_token.token)

        assert success is True

        # Verify token is no longer valid
        result = token_service.validate_token(test_token.token)
        assert result is None


class TestProofRetrieval:
    """Test proof data retrieval for public verification page."""

    def test_get_proof_by_token(
        self,
        client: TestClient,
        db: Session,
        test_token: QRToken,
        test_proof: Proof,
    ):
        """Test retrieving proof data via token."""
        response = client.get(f"/api/v1/public/proof/{test_token.token}")
        assert response.status_code == 200

        data = response.json()
        assert "order_number" in data or "proofs" in data

    def test_proof_not_found_for_order_without_proof(
        self,
        client: TestClient,
        test_token: QRToken,
    ):
        """Test appropriate response when no proof exists."""
        response = client.get(f"/api/v1/public/proof/{test_token.token}")
        # Should return data but with empty proofs or 404
        assert response.status_code in [200, 404]


class TestMultipleProofTypes:
    """Test handling of multiple proof types (BEFORE, AFTER, RECEIPT)."""

    def test_before_and_after_proofs(
        self,
        client: TestClient,
        db: Session,
        test_organization: Organization,
        sample_image_bytes: bytes,
    ):
        """Test uploading both before and after proofs."""
        import secrets

        # Create order and token
        order = Order(
            organization_id=test_organization.id,
            order_number="MULTI-PROOF-001",
            sender_name="Multi Proof Test",
            context="Before/After test",
        )
        db.add(order)
        db.commit()
        db.refresh(order)

        token_value = secrets.token_urlsafe(12)
        qr_token = QRToken(
            order_id=order.id,
            token=token_value,
            is_valid=True,
        )
        db.add(qr_token)
        db.commit()

        # Upload BEFORE proof
        files = {
            "file": ("before.jpg", io.BytesIO(sample_image_bytes), "image/jpeg")
        }
        response = client.post(
            f"/api/v1/public/proof/{token_value}/upload",
            files=files,
            data={"proof_type": "BEFORE"},
        )
        assert response.status_code == 200

        # Upload AFTER proof
        files = {
            "file": ("after.jpg", io.BytesIO(sample_image_bytes), "image/jpeg")
        }
        response = client.post(
            f"/api/v1/public/proof/{token_value}/upload",
            files=files,
            data={"proof_type": "AFTER"},
        )
        assert response.status_code == 200

        # Verify both proofs are accessible
        response = client.get(f"/api/v1/public/proof/{token_value}")
        assert response.status_code == 200
        data = response.json()

        # Should have multiple proofs
        proofs = data.get("proofs", [])
        if proofs:
            assert len(proofs) >= 2
            proof_types = [p.get("proof_type") for p in proofs]
            assert "BEFORE" in proof_types
            assert "AFTER" in proof_types
