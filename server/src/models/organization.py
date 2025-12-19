import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime, func
from sqlalchemy.orm import relationship

from src.core.database import Base


class PlanType(str, enum.Enum):
    BASIC = "BASIC"
    PRO = "PRO"


class Organization(Base):
    """
    Organization (화원사) model.
    Represents a vendor/business that uses ProofLink.
    """
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    plan_type = Column(Enum(PlanType), default=PlanType.BASIC, nullable=False)
    logo_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    orders = relationship("Order", back_populates="organization")
