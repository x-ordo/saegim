from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from src.models.order import OrderStatus


class AssetMeta(BaseModel):
    """Schema for asset metadata (luxury repair context)."""
    brand: Optional[str] = None
    model: Optional[str] = None
    serial: Optional[str] = None
    material: Optional[str] = None
    color: Optional[str] = None
    repair_type: Optional[str] = None
    repair_note: Optional[str] = None
    purchase_date: Optional[str] = None
    estimated_value: Optional[int] = None


class OrderCreate(BaseModel):
    """Schema for creating a new order."""
    organization_id: Optional[int] = None
    order_number: str
    context: Optional[str] = None
    asset_meta: Optional[AssetMeta] = None
    sender_name: str
    sender_phone: str  # E.164 format, will be encrypted
    recipient_name: Optional[str] = None
    recipient_phone: Optional[str] = None  # E.164 format, will be encrypted


class OrderResponse(BaseModel):
    """Schema for order response (internal use)."""
    id: int
    organization_id: Optional[int] = None
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
    hide_saegim: bool = False
    asset_meta: Optional[dict] = None
    has_before_proof: bool = False
    has_after_proof: bool = False


class OrderOut(OrderResponse):
    """Alias for admin/backoffice responses."""
    pass
