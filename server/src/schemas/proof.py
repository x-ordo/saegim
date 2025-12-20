from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from src.models.proof import ProofType


class ProofItem(BaseModel):
    """Single proof item for list response."""
    id: int
    proof_type: ProofType
    proof_url: str
    uploaded_at: datetime

    class Config:
        from_attributes = True


class ProofUploadResponse(BaseModel):
    """Schema for proof upload response."""
    status: str  # "success" or "error"
    proof_id: int
    proof_type: ProofType
    message: str = "Proof uploaded successfully"


class PublicProofResponse(BaseModel):
    """
    Schema for public proof page.
    Shows proof photos with minimal order context.
    Supports multiple proofs for before/after comparison.
    """
    order_number: str
    context: Optional[str] = None
    organization_name: str
    organization_logo: Optional[str] = None
    hide_saegim: bool = False
    asset_meta: Optional[dict] = None
    proofs: List[ProofItem]
    # Backward compatibility fields
    proof_url: Optional[str] = None
    uploaded_at: Optional[datetime] = None
