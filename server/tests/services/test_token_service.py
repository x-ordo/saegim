"""
Tests for TokenService.
"""

import pytest
from sqlalchemy.orm import Session

from src.services.token_service import TokenService
from src.models import QRToken, Order, Proof, ProofType


class TestGenerateToken:
    """Tests for TokenService.generate_token()"""

    def test_generates_unique_tokens(self, db: Session):
        """Generated tokens should be unique."""
        service = TokenService(db)

        tokens = [service.generate_token() for _ in range(100)]

        assert len(set(tokens)) == 100, "Generated tokens are not unique"

    def test_token_length(self, db: Session):
        """Token should have sufficient length for security."""
        service = TokenService(db)

        token = service.generate_token()

        # URL-safe base64 encoded 12 bytes = 16 chars
        assert len(token) >= 16, "Token too short for security"


class TestCreateTokenForOrder:
    """Tests for TokenService.create_token_for_order()"""

    def test_creates_valid_token(self, db: Session, test_order: Order):
        """Should create a valid token for an order."""
        service = TokenService(db)

        qr_token = service.create_token_for_order(test_order.id)

        assert qr_token.id is not None
        assert qr_token.order_id == test_order.id
        assert qr_token.is_valid is True
        assert qr_token.token is not None

    def test_token_persists_in_db(self, db: Session, test_order: Order):
        """Created token should be persisted in database."""
        service = TokenService(db)

        qr_token = service.create_token_for_order(test_order.id)

        # Query directly from DB
        found = db.query(QRToken).filter(QRToken.id == qr_token.id).first()

        assert found is not None
        assert found.token == qr_token.token


class TestGetToken:
    """Tests for TokenService.get_token()"""

    def test_returns_existing_token(self, db: Session, test_token: QRToken):
        """Should return existing token."""
        service = TokenService(db)

        result = service.get_token(test_token.token)

        assert result is not None
        assert result.id == test_token.id

    def test_returns_none_for_invalid_token(self, db: Session):
        """Should return None for non-existent token."""
        service = TokenService(db)

        result = service.get_token("non-existent-token")

        assert result is None


class TestValidateToken:
    """Tests for TokenService.validate_token()"""

    def test_valid_token_returns_true(self, db: Session, test_token: QRToken):
        """Valid token should return True."""
        service = TokenService(db)

        result = service.validate_token(test_token.token)

        assert result is True

    def test_invalid_token_returns_false(self, db: Session):
        """Invalid token should return False."""
        service = TokenService(db)

        result = service.validate_token("invalid-token")

        assert result is False

    def test_revoked_token_returns_false(self, db: Session, test_token: QRToken):
        """Revoked token should return False."""
        service = TokenService(db)

        # Revoke the token
        test_token.is_valid = False
        db.commit()

        result = service.validate_token(test_token.token)

        assert result is False


class TestGetOrderByToken:
    """Tests for TokenService.get_order_by_token()"""

    def test_returns_order_for_valid_token(self, db: Session, test_token: QRToken, test_order: Order):
        """Should return order for valid token."""
        service = TokenService(db)

        result = service.get_order_by_token(test_token.token)

        assert result is not None
        assert result.id == test_order.id

    def test_returns_none_for_invalid_token(self, db: Session):
        """Should return None for invalid token."""
        service = TokenService(db)

        result = service.get_order_by_token("invalid-token")

        assert result is None

    def test_returns_none_for_revoked_token(self, db: Session, test_token: QRToken):
        """Should return None for revoked token."""
        service = TokenService(db)

        test_token.is_valid = False
        db.commit()

        result = service.get_order_by_token(test_token.token)

        assert result is None


class TestRevokeToken:
    """Tests for TokenService.revoke_token()"""

    def test_revokes_valid_token(self, db: Session, test_token: QRToken):
        """Should revoke a valid token."""
        service = TokenService(db)

        result = service.revoke_token(test_token.token)

        assert result is True

        # Verify in DB
        db.refresh(test_token)
        assert test_token.is_valid is False
        assert test_token.revoked_at is not None

    def test_returns_false_for_invalid_token(self, db: Session):
        """Should return False for non-existent token."""
        service = TokenService(db)

        result = service.revoke_token("invalid-token")

        assert result is False

    def test_returns_false_for_already_revoked_token(self, db: Session, test_token: QRToken):
        """Should return False for already revoked token."""
        service = TokenService(db)

        # First revoke
        service.revoke_token(test_token.token)

        # Second revoke
        result = service.revoke_token(test_token.token)

        assert result is False


class TestInvalidateTokenAfterProof:
    """Tests for TokenService.invalidate_token_after_proof()"""

    def test_invalidates_token(self, db: Session, test_token: QRToken):
        """Should invalidate token after proof upload."""
        service = TokenService(db)

        service.invalidate_token_after_proof(test_token.token)

        db.refresh(test_token)
        assert test_token.is_valid is False

    def test_handles_invalid_token_gracefully(self, db: Session):
        """Should handle invalid token without error."""
        service = TokenService(db)

        # Should not raise
        service.invalidate_token_after_proof("invalid-token")
