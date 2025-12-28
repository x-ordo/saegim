from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class DriverLoginRequest(BaseModel):
    """Schema for driver PIN login."""
    phone: str = Field(..., description="Phone number for identification")
    pin: str = Field(..., min_length=4, max_length=6, pattern=r"^\d+$")


class DriverLoginResponse(BaseModel):
    """Schema for driver login response."""
    token: str
    expires_at: datetime
    courier_id: int
    courier_name: str
    organization_id: int
    organization_name: str


class DriverMeResponse(BaseModel):
    """Schema for driver /me response."""
    courier_id: int
    name: str
    phone_masked: Optional[str] = None
    vehicle_number: Optional[str] = None
    organization_id: int
    organization_name: str


class DeliveryOrderSummary(BaseModel):
    """Schema for delivery order in list view."""
    id: int
    order_number: str
    context: Optional[str] = None
    sender_name: str
    recipient_name: Optional[str] = None
    status: str
    has_proof: bool = False
    proof_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class DeliveryListResponse(BaseModel):
    """Schema for delivery list response."""
    items: List[DeliveryOrderSummary]
    total: int
    pending_count: int
    in_progress_count: int
    completed_count: int


class DeliveryDetailResponse(BaseModel):
    """Schema for delivery detail response."""
    id: int
    order_number: str
    context: Optional[str] = None
    sender_name: str
    recipient_name: Optional[str] = None
    status: str
    token: Optional[str] = None
    upload_url: Optional[str] = None
    proofs: List["ProofItem"] = []
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProofItem(BaseModel):
    """Schema for proof item."""
    id: int
    proof_type: str
    file_url: str
    uploaded_at: datetime

    class Config:
        from_attributes = True


class DeliveryStartRequest(BaseModel):
    """Schema for starting a delivery (optional location)."""
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class DeliveryCompleteRequest(BaseModel):
    """Schema for completing a delivery."""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    notes: Optional[str] = None


class UploadHistoryItem(BaseModel):
    """Schema for upload history item."""
    order_id: int
    order_number: str
    context: Optional[str] = None
    proof_id: int
    proof_type: str
    file_url: str
    uploaded_at: datetime

    class Config:
        from_attributes = True


class UploadHistoryResponse(BaseModel):
    """Schema for upload history response."""
    items: List[UploadHistoryItem]
    total: int
