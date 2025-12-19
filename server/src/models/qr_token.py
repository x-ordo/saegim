from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from src.core.database import Base


class QRToken(Base):
    """
    QR Token model.
    Stores unique tokens for QR codes. Only token is embedded in QR (no PII).
    """
    __tablename__ = "qr_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(32), unique=True, nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), unique=True, nullable=False)
    is_valid = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    order = relationship("Order", back_populates="qr_token")
