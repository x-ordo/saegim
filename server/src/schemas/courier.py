from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CourierBase(BaseModel):
    """Base schema for courier."""
    name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = None  # Plain phone number (will be encrypted in DB)
    vehicle_number: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True


class CourierCreate(CourierBase):
    """Schema for creating a new courier."""
    pin: Optional[str] = Field(None, min_length=4, max_length=6, pattern=r"^\d+$")


class CourierUpdate(BaseModel):
    """Schema for updating a courier."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = None
    vehicle_number: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class CourierUpdatePin(BaseModel):
    """Schema for updating courier PIN."""
    pin: str = Field(..., min_length=4, max_length=6, pattern=r"^\d+$")


class CourierResponse(BaseModel):
    """Schema for courier response."""
    id: int
    organization_id: int
    name: str
    phone_masked: Optional[str] = None  # Masked phone for display (e.g., 010-****-5678)
    vehicle_number: Optional[str] = None
    notes: Optional[str] = None
    has_pin: bool = False  # Whether PIN is set
    clerk_user_id: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CourierListResponse(BaseModel):
    """Schema for courier list response with pagination."""
    items: List[CourierResponse]
    total: int
    page: int
    page_size: int


class CourierDetailResponse(CourierResponse):
    """Schema for courier detail with additional stats."""
    today_delivery_count: int = 0
    total_delivery_count: int = 0
