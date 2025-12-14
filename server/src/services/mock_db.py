from datetime import datetime
from typing import Dict, Optional

from server.src.models.schemas import Order, QRToken, Proof

# Mock database tables
MOCK_ORDERS: Dict[int, Order] = {
    1: Order(id=1, order_number="SAEGIM-001", context="Flower Basket", created_at=datetime.utcnow()),
}

MOCK_QR_TOKENS: Dict[str, QRToken] = {
    "abcdef123456": QRToken(id=1, token="abcdef123456", order_id=1, is_valid=True, created_at=datetime.utcnow()),
}

MOCK_PROOFS: Dict[int, Proof] = {}

class MockDbService:
    def get_order_by_token(self, token: str) -> Optional[Order]:
        """Finds an order associated with a given valid token."""
        qr_token = MOCK_QR_TOKENS.get(token)
        if qr_token and qr_token.is_valid:
            return MOCK_ORDERS.get(qr_token.order_id)
        return None

    def save_proof(self, order_id: int, file_path: str) -> Proof:
        """Saves a proof record and returns it."""
        new_proof_id = len(MOCK_PROOFS) + 1
        proof = Proof(
            id=new_proof_id,
            order_id=order_id,
            file_path=file_path,
            uploaded_at=datetime.utcnow(),
        )
        MOCK_PROOFS[new_proof_id] = proof
        
        # Invalidate the token after use
        for token_str, qr_token in MOCK_QR_TOKENS.items():
            if qr_token.order_id == order_id:
                qr_token.is_valid = False
                break
                
        return proof

mock_db_service = MockDbService()
