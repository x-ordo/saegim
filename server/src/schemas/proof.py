from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ProofUploadResponse(BaseModel):
    """Schema for proof upload response."""
    status: str  # "success" or "error"
    proof_id: int
    message: str = "Proof uploaded successfully"


class PublicProofResponse(BaseModel):
    """
    Schema for public proof page.
    Shows proof photo with minimal order context.
    """
    order_number: str
    context: Optional[str] = None
    organization_name: str
    organization_logo: Optional[str] = None
    proof_url: str
    uploaded_at: datetime
