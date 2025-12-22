import secrets
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from src.models import QRToken, Order
from src.core.config import settings


class TokenService:
    """Service for managing QR tokens."""

    def __init__(self, db: Session):
        self.db = db

    def generate_token(self) -> str:
        """Generate a unique random token."""
        return secrets.token_urlsafe(settings.TOKEN_LENGTH)

    def create_token_for_order(self, order_id: int) -> QRToken:
        """Create a new QR token for an order."""
        token = self.generate_token()

        qr_token = QRToken(
            token=token,
            order_id=order_id,
            is_valid=True,
        )
        self.db.add(qr_token)
        self.db.commit()
        self.db.refresh(qr_token)

        return qr_token

    def get_token(self, token: str) -> Optional[QRToken]:
        """Get a QR token by its value."""
        return self.db.query(QRToken).filter(QRToken.token == token).first()

    def validate_token(self, token: str) -> bool:
        """Check if a token is valid (exists and not revoked)."""
        qr_token = self.get_token(token)
        return qr_token is not None and qr_token.is_valid

    def get_order_by_token(self, token: str) -> Optional[Order]:
        """Get the order associated with a token."""
        qr_token = self.get_token(token)
        if qr_token and qr_token.is_valid:
            return qr_token.order
        return None

    def get_proof_by_token(self, token: str) -> Optional[dict]:
        """Get proof data by token for public proof page. Returns multiple proofs."""
        qr_token = self.get_token(token)
        if not qr_token:
            return None

        order = qr_token.order
        proofs = order.proofs  # Now a list

        if not proofs:
            return None

        # Build proof items list
        proof_items = []
        for proof in proofs:
            proof_items.append({
                "id": proof.id,
                "proof_type": proof.proof_type.value,
                "proof_url": f"/uploads/{proof.file_path}",
                "uploaded_at": proof.uploaded_at,
            })

        # Sort: BEFORE first, then AFTER, then others
        type_order = {"BEFORE": 0, "AFTER": 1, "RECEIPT": 2, "DAMAGE": 3, "OTHER": 4}
        proof_items.sort(key=lambda p: type_order.get(p["proof_type"], 5))

        # Backward compatibility: first AFTER proof or first proof
        after_proof = next((p for p in proof_items if p["proof_type"] == "AFTER"), None)
        primary_proof = after_proof or proof_items[0]

        return {
            "order_number": order.order_number,
            "context": order.context,
            "organization_name": (order.organization.brand_name or order.organization.name),
            "organization_logo": (order.organization.brand_logo_url or order.organization.logo_url),
            "hide_saegim": bool(order.organization.hide_saegim),
            "asset_meta": order.asset_meta,
            "proofs": proof_items,
            # Backward compatibility
            "proof_url": primary_proof["proof_url"],
            "uploaded_at": primary_proof["uploaded_at"],
        }

    def revoke_token(self, token: str) -> bool:
        """Revoke a token (mark as invalid)."""
        qr_token = self.get_token(token)
        if qr_token and qr_token.is_valid:
            qr_token.is_valid = False
            qr_token.revoked_at = datetime.utcnow()
            self.db.commit()
            return True
        return False

    def invalidate_token_after_proof(self, token: str) -> None:
        """Mark token as used after proof upload."""
        qr_token = self.get_token(token)
        if qr_token:
            qr_token.is_valid = False
            self.db.commit()
