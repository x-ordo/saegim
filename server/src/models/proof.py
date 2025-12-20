import enum
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, func
from sqlalchemy.orm import relationship

from src.core.database import Base


class ProofType(str, enum.Enum):
    """Type of proof for asset history tracking."""
    BEFORE = "BEFORE"      # Before repair/service
    AFTER = "AFTER"        # After repair/service (delivery complete)
    RECEIPT = "RECEIPT"    # Receipt or estimate document
    DAMAGE = "DAMAGE"      # Damage documentation
    OTHER = "OTHER"        # Other supporting documents


class Proof(Base):
    """
    Proof model.
    Stores asset proof (photo) metadata. Supports multiple proofs per order
    for before/after comparisons and asset history tracking.
    """
    __tablename__ = "proofs"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    proof_type = Column(Enum(ProofType), default=ProofType.AFTER, nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)  # bytes
    mime_type = Column(String(50), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    order = relationship("Order", back_populates="proofs")
