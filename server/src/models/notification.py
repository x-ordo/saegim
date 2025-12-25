import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import relationship

from src.core.database import Base


class NotificationType(str, enum.Enum):
    SENDER = "SENDER"         # To buyer (발주자)
    RECIPIENT = "RECIPIENT"   # To recipient (수령인)
    REMINDER = "REMINDER"     # Reminder for pending proof upload


class NotificationChannel(str, enum.Enum):
    ALIMTALK = "ALIMTALK"
    SMS = "SMS"


class NotificationStatus(str, enum.Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"
    FALLBACK_SENT = "FALLBACK_SENT"  # Primary failed, fallback succeeded
    MOCK_SENT = "MOCK_SENT"  # v1: Mock mode


class Notification(Base):
    """
    Notification model.
    Tracks all notification attempts (AlimTalk + SMS fallback).
    """
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    type = Column(Enum(NotificationType), nullable=False)
    channel = Column(Enum(NotificationChannel), nullable=False)
    status = Column(Enum(NotificationStatus), default=NotificationStatus.PENDING, nullable=False)

    # Store hash of phone for logging (no PII in logs)
    phone_hash = Column(String(64), nullable=False)

    # Provider response tracking
    provider_request_id = Column(String(100), nullable=True)
    provider_response = Column(Text, nullable=True)
    message_url = Column(String(1024), nullable=True)  # short url or canonical url used in the message
    error_code = Column(String(64), nullable=True)  # provider-specific error code
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    order = relationship("Order", back_populates="notifications")
