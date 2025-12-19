from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from src.models.order import OrderStatus


class OrderCreate(BaseModel):
    """Schema for creating a new order."""
    organization_id: int
    order_number: str
    context: Optional[str] = None
    sender_name: str
    sender_phone: str  # E.164 format, will be encrypted
    recipient_name: Optional[str] = None
    recipient_phone: Optional[str] = None  # E.164 format, will be encrypted


class OrderResponse(BaseModel):
    """Schema for order response (internal use)."""
    id: int
    organization_id: int
    order_number: str
    context: Optional[str] = None
    sender_name: str
    recipient_name: Optional[str] = None
    status: OrderStatus
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OrderSummary(BaseModel):
    """Schema for order summary (dashboard list view)."""
    id: int
    order_number: str
    context: Optional[str] = None
    status: OrderStatus
    created_at: datetime
    has_proof: bool = False

    class Config:
        from_attributes = True


class PublicOrderSummary(BaseModel):
    """
    Schema for public order summary (proof landing page).
    Minimal info, no PII exposed.
    """
    order_number: str
    context: Optional[str] = None
    organization_name: str
    organization_logo: Optional[str] = None
