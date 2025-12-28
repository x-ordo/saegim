from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Tuple

from fastapi import HTTPException
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from sqlalchemy import func

from src.models import Courier, CourierSession, Order, OrderStatus, Proof, QRToken, Organization
from src.core.config import settings
from src.core.security import decrypt_phone, normalize_phone
from src.schemas.driver import (
    DriverLoginResponse,
    DriverMeResponse,
    DeliveryOrderSummary,
    DeliveryListResponse,
    DeliveryDetailResponse,
    ProofItem,
    UploadHistoryItem,
    UploadHistoryResponse,
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Session token expiry (24 hours)
SESSION_EXPIRY_HOURS = 24


def _mask_phone(phone: str) -> str:
    """Mask phone number for display."""
    if not phone:
        return ""
    digits = phone.lstrip("+")
    if digits.startswith("82"):
        digits = "0" + digits[2:]
    if len(digits) >= 11:
        return f"{digits[:3]}-****-{digits[-4:]}"
    return f"***-****-{digits[-4:]}" if len(digits) >= 4 else "****"


class DriverService:
    """Service for driver (courier) app operations."""

    def __init__(self, db: Session):
        self.db = db

    def login_with_pin(
        self,
        phone: str,
        pin: str,
        device_info: Optional[str] = None,
    ) -> DriverLoginResponse:
        """Authenticate courier with phone + PIN and create session."""
        # Normalize phone
        try:
            normalized_phone = normalize_phone(phone)
        except ValueError:
            raise HTTPException(status_code=400, detail="INVALID_PHONE")

        # Find courier by phone (need to decrypt all phones - not ideal for scale)
        # For MVP, we iterate through active couriers
        couriers = self.db.query(Courier).filter(
            Courier.is_active == True,
            Courier.phone_encrypted.isnot(None),
            Courier.pin_hash.isnot(None),
        ).all()

        matched_courier: Optional[Courier] = None
        for courier in couriers:
            try:
                decrypted = decrypt_phone(courier.phone_encrypted)
                # Normalize for comparison
                try:
                    decrypted_normalized = normalize_phone(decrypted)
                except ValueError:
                    continue
                if decrypted_normalized == normalized_phone:
                    matched_courier = courier
                    break
            except Exception:
                continue

        if not matched_courier:
            raise HTTPException(status_code=401, detail="INVALID_CREDENTIALS")

        # Verify PIN
        if not pwd_context.verify(pin, matched_courier.pin_hash):
            raise HTTPException(status_code=401, detail="INVALID_CREDENTIALS")

        # Get organization
        org = self.db.query(Organization).filter(
            Organization.id == matched_courier.organization_id
        ).first()
        if not org:
            raise HTTPException(status_code=500, detail="ORG_NOT_FOUND")

        # Create session token
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=SESSION_EXPIRY_HOURS)

        session = CourierSession(
            courier_id=matched_courier.id,
            token=token,
            device_info=device_info,
            expires_at=expires_at,
        )
        self.db.add(session)
        self.db.commit()

        return DriverLoginResponse(
            token=token,
            expires_at=expires_at,
            courier_id=matched_courier.id,
            courier_name=matched_courier.name,
            organization_id=org.id,
            organization_name=org.name,
        )

    def validate_session(self, token: str) -> Tuple[Courier, Organization]:
        """Validate session token and return courier + org."""
        session = self.db.query(CourierSession).filter(
            CourierSession.token == token,
            CourierSession.expires_at > datetime.now(timezone.utc),
        ).first()

        if not session:
            raise HTTPException(status_code=401, detail="SESSION_EXPIRED")

        courier = self.db.query(Courier).filter(
            Courier.id == session.courier_id,
            Courier.is_active == True,
        ).first()

        if not courier:
            raise HTTPException(status_code=401, detail="COURIER_INACTIVE")

        org = self.db.query(Organization).filter(
            Organization.id == courier.organization_id
        ).first()

        if not org:
            raise HTTPException(status_code=500, detail="ORG_NOT_FOUND")

        return courier, org

    def get_me(self, courier: Courier, org: Organization) -> DriverMeResponse:
        """Get current courier info."""
        phone_masked = None
        if courier.phone_encrypted:
            try:
                decrypted = decrypt_phone(courier.phone_encrypted)
                phone_masked = _mask_phone(decrypted)
            except Exception:
                phone_masked = "****"

        return DriverMeResponse(
            courier_id=courier.id,
            name=courier.name,
            phone_masked=phone_masked,
            vehicle_number=courier.vehicle_number,
            organization_id=org.id,
            organization_name=org.name,
        )

    def list_deliveries(
        self,
        organization_id: int,
        today_only: bool = True,
        status_filter: Optional[str] = None,
    ) -> DeliveryListResponse:
        """List deliveries for the organization."""
        query = self.db.query(Order).filter(
            Order.organization_id == organization_id
        )

        if today_only:
            # Get today's date in server timezone (adjust as needed)
            today_start = datetime.now(timezone.utc).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            query = query.filter(Order.created_at >= today_start)

        if status_filter:
            try:
                status_enum = OrderStatus(status_filter)
                query = query.filter(Order.status == status_enum)
            except ValueError:
                pass

        orders = query.order_by(Order.created_at.desc()).all()

        # Count by status
        pending_count = sum(1 for o in orders if o.status in [OrderStatus.PENDING, OrderStatus.TOKEN_ISSUED])
        in_progress_count = sum(1 for o in orders if o.status == OrderStatus.PROOF_UPLOADED)
        completed_count = sum(1 for o in orders if o.status in [OrderStatus.NOTIFIED, OrderStatus.COMPLETED])

        items = []
        for order in orders:
            proof_count = len(order.proofs) if order.proofs else 0
            items.append(DeliveryOrderSummary(
                id=order.id,
                order_number=order.order_number,
                context=order.context,
                sender_name=order.sender_name,
                recipient_name=order.recipient_name,
                status=order.status.value,
                has_proof=proof_count > 0,
                proof_count=proof_count,
                created_at=order.created_at,
            ))

        return DeliveryListResponse(
            items=items,
            total=len(items),
            pending_count=pending_count,
            in_progress_count=in_progress_count,
            completed_count=completed_count,
        )

    def get_delivery_detail(
        self,
        order_id: int,
        organization_id: int,
    ) -> DeliveryDetailResponse:
        """Get delivery detail."""
        order = self.db.query(Order).filter(
            Order.id == order_id,
            Order.organization_id == organization_id,
        ).first()

        if not order:
            raise HTTPException(status_code=404, detail="ORDER_NOT_FOUND")

        # Get token if exists
        token_value = None
        upload_url = None
        if order.qr_token:
            token_value = order.qr_token.token
            upload_url = f"{settings.WEB_BASE_URL}/proof/{token_value}"

        # Get proofs
        proofs = []
        for proof in order.proofs:
            file_url = f"{settings.API_BASE_URL}/uploads/{proof.file_path}"
            proofs.append(ProofItem(
                id=proof.id,
                proof_type=proof.proof_type.value,
                file_url=file_url,
                uploaded_at=proof.uploaded_at,
            ))

        return DeliveryDetailResponse(
            id=order.id,
            order_number=order.order_number,
            context=order.context,
            sender_name=order.sender_name,
            recipient_name=order.recipient_name,
            status=order.status.value,
            token=token_value,
            upload_url=upload_url,
            proofs=proofs,
            created_at=order.created_at,
            updated_at=order.updated_at,
        )

    def get_delivery_by_token(
        self,
        token: str,
        organization_id: int,
    ) -> DeliveryDetailResponse:
        """Get delivery by QR token."""
        qr_token = self.db.query(QRToken).filter(
            QRToken.token == token,
        ).first()

        if not qr_token:
            raise HTTPException(status_code=404, detail="TOKEN_NOT_FOUND")

        order = self.db.query(Order).filter(
            Order.id == qr_token.order_id,
        ).first()

        if not order:
            raise HTTPException(status_code=404, detail="ORDER_NOT_FOUND")

        # Verify organization (for security)
        if order.organization_id != organization_id:
            raise HTTPException(status_code=403, detail="ORG_MISMATCH")

        return self.get_delivery_detail(order.id, organization_id)

    def get_upload_history(
        self,
        organization_id: int,
        limit: int = 50,
    ) -> UploadHistoryResponse:
        """Get recent upload history."""
        proofs = self.db.query(Proof).join(Order).filter(
            Order.organization_id == organization_id
        ).order_by(Proof.uploaded_at.desc()).limit(limit).all()

        items = []
        for proof in proofs:
            order = proof.order
            file_url = f"{settings.API_BASE_URL}/uploads/{proof.file_path}"
            items.append(UploadHistoryItem(
                order_id=order.id,
                order_number=order.order_number,
                context=order.context,
                proof_id=proof.id,
                proof_type=proof.proof_type.value,
                file_url=file_url,
                uploaded_at=proof.uploaded_at,
            ))

        return UploadHistoryResponse(
            items=items,
            total=len(items),
        )

    def logout(self, token: str) -> None:
        """Invalidate session token."""
        session = self.db.query(CourierSession).filter(
            CourierSession.token == token
        ).first()

        if session:
            self.db.delete(session)
            self.db.commit()
