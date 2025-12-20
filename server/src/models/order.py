import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, func, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from src.core.database import Base


class OrderStatus(str, enum.Enum):
    PENDING = "PENDING"           # Order created, no QR token yet
    TOKEN_ISSUED = "TOKEN_ISSUED" # QR token generated
    PROOF_UPLOADED = "PROOF_UPLOADED"  # Proof photo uploaded
    NOTIFIED = "NOTIFIED"         # Notifications sent
    COMPLETED = "COMPLETED"       # All done


class Order(Base):
    """
    Order model.
    Represents a delivery order with sender and recipient information.
    """
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    order_number = Column(String(100), nullable=False)
    context = Column(String(500), nullable=True)  # e.g., "OO장례식장 3호실", "Flower Basket"
    asset_meta = Column(JSONB, nullable=True)  # Asset metadata: brand, model, serial, repair_note, etc.

    # Sender (발주자/구매자) - encrypted
    sender_name = Column(String(100), nullable=False)
    sender_phone_encrypted = Column(Text, nullable=False)  # AES-256 encrypted

    # Recipient (수령인) - encrypted
    recipient_name = Column(String(100), nullable=True)
    recipient_phone_encrypted = Column(Text, nullable=True)  # AES-256 encrypted

    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="orders")
    qr_token = relationship("QRToken", back_populates="order", uselist=False)
    proofs = relationship("Proof", back_populates="order", uselist=True)
    notifications = relationship("Notification", back_populates="order")
