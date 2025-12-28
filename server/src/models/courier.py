from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import relationship

from src.core.database import Base


class Courier(Base):
    """
    Courier (delivery driver) model.
    Couriers can be authenticated via PIN or Clerk.
    Phone numbers are encrypted (AES-256) for privacy.
    """
    __tablename__ = "couriers"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    phone_encrypted = Column(Text, nullable=True)  # AES-256 encrypted phone number
    pin_hash = Column(String(255), nullable=True)  # bcrypt hashed PIN
    clerk_user_id = Column(String(100), nullable=True)  # For Clerk SSO integration
    vehicle_number = Column(String(20), nullable=True)  # Vehicle plate number
    notes = Column(Text, nullable=True)  # Admin notes
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="couriers")
    sessions = relationship("CourierSession", back_populates="courier", cascade="all, delete-orphan")


class CourierSession(Base):
    """
    Courier session model for PIN-based authentication.
    Sessions are short-lived tokens that expire after a period.
    """
    __tablename__ = "courier_sessions"

    id = Column(Integer, primary_key=True, index=True)
    courier_id = Column(Integer, ForeignKey("couriers.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String(255), nullable=False, unique=True, index=True)
    device_info = Column(String(255), nullable=True)  # User agent or device identifier
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    courier = relationship("Courier", back_populates="sessions")
