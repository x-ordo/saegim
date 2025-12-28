from __future__ import annotations

from typing import Optional, List

from fastapi import HTTPException
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from src.models import Courier
from src.core.security import encrypt_phone, decrypt_phone
from src.schemas.courier import (
    CourierCreate,
    CourierUpdate,
    CourierResponse,
)

# Password context for PIN hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _mask_phone(phone: str) -> str:
    """Mask phone number for display (e.g., 010-****-5678)."""
    if not phone:
        return ""
    # Remove + prefix if present
    digits = phone.lstrip("+")
    if len(digits) < 8:
        return "****" + digits[-4:] if len(digits) >= 4 else "****"
    # Korean phone format: 82-10-****-5678
    if digits.startswith("82"):
        digits = "0" + digits[2:]  # Convert to local format
    if len(digits) >= 11:
        return f"{digits[:3]}-****-{digits[-4:]}"
    return f"***-****-{digits[-4:]}"


def _courier_to_response(courier: Courier) -> CourierResponse:
    """Convert Courier model to response schema."""
    phone_masked = None
    if courier.phone_encrypted:
        try:
            decrypted = decrypt_phone(courier.phone_encrypted)
            phone_masked = _mask_phone(decrypted)
        except Exception:
            phone_masked = "****-****"

    return CourierResponse(
        id=courier.id,
        organization_id=courier.organization_id,
        name=courier.name,
        phone_masked=phone_masked,
        vehicle_number=courier.vehicle_number,
        notes=courier.notes,
        has_pin=bool(courier.pin_hash),
        clerk_user_id=courier.clerk_user_id,
        is_active=courier.is_active,
        created_at=courier.created_at,
        updated_at=courier.updated_at,
    )


class CourierService:
    """Courier management service."""

    def __init__(self, db: Session):
        self.db = db

    def list_couriers(
        self,
        organization_id: int,
        is_active: Optional[bool] = None,
        q: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[List[CourierResponse], int]:
        """List couriers with optional filters and pagination."""
        query = self.db.query(Courier).filter(
            Courier.organization_id == organization_id
        )

        if is_active is not None:
            query = query.filter(Courier.is_active == is_active)

        if q:
            like = f"%{q.strip()}%"
            query = query.filter(
                Courier.name.ilike(like) | Courier.vehicle_number.ilike(like)
            )

        # Count total
        total = query.count()

        # Paginate
        offset = (page - 1) * page_size
        couriers = query.order_by(Courier.created_at.desc()).offset(offset).limit(page_size).all()

        # Convert to response
        items = [_courier_to_response(c) for c in couriers]
        return items, total

    def get_courier(
        self,
        courier_id: int,
        organization_id: int,
    ) -> Courier:
        """Get a courier by ID (raw model)."""
        courier = self.db.query(Courier).filter(
            Courier.id == courier_id,
            Courier.organization_id == organization_id,
        ).first()
        if not courier:
            raise HTTPException(status_code=404, detail="COURIER_NOT_FOUND")
        return courier

    def get_courier_response(
        self,
        courier_id: int,
        organization_id: int,
    ) -> CourierResponse:
        """Get a courier by ID (response schema)."""
        courier = self.get_courier(courier_id, organization_id)
        return _courier_to_response(courier)

    def create_courier(
        self,
        payload: CourierCreate,
        organization_id: int,
    ) -> CourierResponse:
        """Create a new courier."""
        # Encrypt phone if provided
        phone_encrypted = None
        if payload.phone:
            phone_encrypted = encrypt_phone(payload.phone.strip())

        # Hash PIN if provided
        pin_hash = None
        if payload.pin:
            pin_hash = pwd_context.hash(payload.pin)

        courier = Courier(
            organization_id=organization_id,
            name=payload.name.strip(),
            phone_encrypted=phone_encrypted,
            pin_hash=pin_hash,
            vehicle_number=payload.vehicle_number.strip() if payload.vehicle_number else None,
            notes=payload.notes.strip() if payload.notes else None,
            is_active=payload.is_active,
        )
        self.db.add(courier)
        try:
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=400, detail=f"CREATE_COURIER_FAILED: {e}") from e
        self.db.refresh(courier)
        return _courier_to_response(courier)

    def update_courier(
        self,
        courier_id: int,
        payload: CourierUpdate,
        organization_id: int,
    ) -> CourierResponse:
        """Update a courier."""
        courier = self.get_courier(courier_id, organization_id)

        if payload.name is not None:
            courier.name = payload.name.strip()
        if payload.phone is not None:
            if payload.phone:
                courier.phone_encrypted = encrypt_phone(payload.phone.strip())
            else:
                courier.phone_encrypted = None
        if payload.vehicle_number is not None:
            courier.vehicle_number = payload.vehicle_number.strip() if payload.vehicle_number else None
        if payload.notes is not None:
            courier.notes = payload.notes.strip() if payload.notes else None
        if payload.is_active is not None:
            courier.is_active = payload.is_active

        try:
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=400, detail=f"UPDATE_COURIER_FAILED: {e}") from e
        self.db.refresh(courier)
        return _courier_to_response(courier)

    def update_courier_pin(
        self,
        courier_id: int,
        pin: str,
        organization_id: int,
    ) -> CourierResponse:
        """Update a courier's PIN."""
        courier = self.get_courier(courier_id, organization_id)
        courier.pin_hash = pwd_context.hash(pin)

        try:
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=400, detail=f"UPDATE_COURIER_PIN_FAILED: {e}") from e
        self.db.refresh(courier)
        return _courier_to_response(courier)

    def delete_courier(
        self,
        courier_id: int,
        organization_id: int,
    ) -> None:
        """Delete a courier (hard delete for now)."""
        courier = self.get_courier(courier_id, organization_id)
        try:
            self.db.delete(courier)
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=400, detail=f"DELETE_COURIER_FAILED: {e}") from e

    def verify_pin(
        self,
        courier: Courier,
        pin: str,
    ) -> bool:
        """Verify a courier's PIN."""
        if not courier.pin_hash:
            return False
        return pwd_context.verify(pin, courier.pin_hash)
