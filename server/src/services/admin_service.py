from __future__ import annotations

from typing import Optional
from collections import defaultdict
import csv
import io
import statistics

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import HTTPException, BackgroundTasks
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from src.core.config import settings
from src.core.security import encrypt_phone, decrypt_phone, normalize_phone
from src.models import Organization, Order, OrderStatus, QRToken, Notification, Proof
from src.models.notification import NotificationStatus, NotificationType, NotificationChannel
from src.schemas.admin import OrganizationCreate, OrderUpdate
from src.schemas.order import OrderCreate
from src.schemas.notification import NotificationLog
from src.services.token_service import TokenService
from src.services.proof_service import ProofService
from src.services.notification_service import NotificationService
from src.services.short_link_service import ShortLinkService


class AdminService:
    """Backoffice service. Keep business logic out of routers."""

    def __init__(self, db: Session):
        self.db = db
        self.token_service = TokenService(db)
        self.proof_service = ProofService(db)
        self.notification_service = NotificationService(db)

    # ---------------------------
    # Organizations
    # ---------------------------
    def list_organizations(self, scope_org_id: Optional[int] = None) -> list[Organization]:
        q = self.db.query(Organization)
        if scope_org_id is not None:
            q = q.filter(Organization.id == scope_org_id)
        return q.order_by(Organization.id.asc()).all()

    def create_organization(self, payload: OrganizationCreate) -> Organization:
        org = Organization(
            name=payload.name,
            plan_type=payload.plan_type,
            logo_url=payload.logo_url,
            brand_name=getattr(payload, 'brand_name', None),
            brand_logo_url=getattr(payload, 'brand_logo_url', None),
            brand_domain=getattr(payload, 'brand_domain', None),
            hide_saegim=bool(getattr(payload, 'hide_saegim', False) or False),
            external_org_id=payload.external_org_id,
        )
        self.db.add(org)
        try:
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=400, detail=f"CREATE_ORG_FAILED: {e}") from e
        self.db.refresh(org)
        return org

    def update_organization(self, organization_id: int, payload) -> Organization:
        """Update organization settings (scoped org).

        v1: only name/logo + white-label fields.
        """
        org = self.db.query(Organization).filter(Organization.id == organization_id).first()
        if not org:
            raise HTTPException(status_code=404, detail="ORG_NOT_FOUND")

        def norm(v):
            if v is None:
                return None
            if isinstance(v, str):
                s = v.strip()
                return s if s else None
            return v

        fields_set = getattr(payload, '__fields_set__', None) or getattr(payload, 'model_fields_set', None) or set()

        # internal
        if getattr(payload, 'name', None) is not None:
            org.name = (payload.name or '').strip() or org.name
        if getattr(payload, 'logo_url', None) is not None:
            org.logo_url = norm(payload.logo_url)

        # white-label (public)
        if getattr(payload, 'brand_name', None) is not None:
            org.brand_name = norm(payload.brand_name)
        if getattr(payload, 'brand_logo_url', None) is not None:
            org.brand_logo_url = norm(payload.brand_logo_url)
        if getattr(payload, 'brand_domain', None) is not None:
            org.brand_domain = norm(payload.brand_domain)
        if getattr(payload, 'hide_saegim', None) is not None:
            org.hide_saegim = bool(payload.hide_saegim)

        # messaging templates (org override)
        if getattr(payload, 'msg_alimtalk_template_sender', None) is not None:
            org.msg_alimtalk_template_sender = norm(payload.msg_alimtalk_template_sender)
        if getattr(payload, 'msg_alimtalk_template_recipient', None) is not None:
            org.msg_alimtalk_template_recipient = norm(payload.msg_alimtalk_template_recipient)
        if getattr(payload, 'msg_sms_template_sender', None) is not None:
            org.msg_sms_template_sender = norm(payload.msg_sms_template_sender)
        if getattr(payload, 'msg_sms_template_recipient', None) is not None:
            org.msg_sms_template_recipient = norm(payload.msg_sms_template_recipient)

        if getattr(payload, 'msg_kakao_template_code', None) is not None:
            org.msg_kakao_template_code = norm(payload.msg_kakao_template_code)

        if 'msg_fallback_sms_enabled' in fields_set:
            # None => inherit global, otherwise override
            org.msg_fallback_sms_enabled = payload.msg_fallback_sms_enabled

        try:
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=400, detail=f"UPDATE_ORG_FAILED: {e}") from e

        self.db.refresh(org)
        return org

    # ---------------------------
    # Orders
    # ---------------------------
    def list_orders(
        self,
        organization_id: Optional[int] = None,
        q: Optional[str] = None,
        status: Optional[str] = None,
        day: Optional[str] = None,
        today: bool = False,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        page: int = 1,
        limit: int = 50,
    ) -> dict:
        query = self.db.query(Order)

        if organization_id is not None:
            query = query.filter(Order.organization_id == organization_id)

        if q:
            like = f"%{q.strip()}%"
            query = query.filter(
                or_(
                    Order.order_number.ilike(like),
                    Order.sender_name.ilike(like),
                    Order.recipient_name.ilike(like),
                    Order.context.ilike(like),
                )
            )

        if status:
            try:
                st = OrderStatus(status)
            except Exception:
                # allow lower/upper input
                try:
                    st = OrderStatus(status.upper())
                except Exception as e:
                    raise HTTPException(status_code=400, detail=f"INVALID_STATUS: {status}") from e
            query = query.filter(Order.status == st)

        kst = ZoneInfo("Asia/Seoul")

        # Date filter (Asia/Seoul by default)
        if today or day:
            try:
                if today:
                    d: date = datetime.now(timezone.utc).astimezone(kst).date()
                else:
                    d = date.fromisoformat((day or "").strip())
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"INVALID_DAY: {day}") from e

            start_kst = datetime.combine(d, time.min).replace(tzinfo=kst)
            end_kst = start_kst + timedelta(days=1)
            start_utc = start_kst.astimezone(timezone.utc)
            end_utc = end_kst.astimezone(timezone.utc)
            query = query.filter(Order.created_at >= start_utc).filter(Order.created_at < end_utc)

        # Date range filter
        if start_date:
            start_kst = datetime.combine(start_date, time.min).replace(tzinfo=kst)
            start_utc = start_kst.astimezone(timezone.utc)
            query = query.filter(Order.created_at >= start_utc)

        if end_date:
            end_kst = datetime.combine(end_date, time.max).replace(tzinfo=kst)
            end_utc = end_kst.astimezone(timezone.utc)
            query = query.filter(Order.created_at <= end_utc)

        # Count total
        total = query.count()

        # Paginate
        offset = (page - 1) * limit
        items = query.order_by(Order.created_at.desc()).offset(offset).limit(limit).all()

        total_pages = (total + limit - 1) // limit

        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
        }

    def import_orders_csv(
        self,
        rows: list[dict],
        organization_id: int,
        *,
        strict: bool = False,
    ) -> tuple[list[int], list[dict]]:
        """Import many orders from parsed CSV rows.

        Args:
            rows: list of dict rows. Expected keys:
              - order_number
              - context (optional)
              - sender_name
              - sender_phone
              - recipient_name (optional)
              - recipient_phone (optional)
            strict: if True, any row error aborts whole import.

        Returns:
            (created_order_ids, errors)
        """

        org = self.db.query(Organization).filter(Organization.id == organization_id).first()
        if not org:
            raise HTTPException(status_code=404, detail="ORG_NOT_FOUND")

        created_ids: list[int] = []
        errors: list[dict] = []

        for idx, r in enumerate(rows, start=1):
            try:
                order_number = (r.get("order_number") or r.get("order_no") or "").strip()
                if not order_number:
                    raise ValueError("ORDER_NUMBER_REQUIRED")

                sender_name = (r.get("sender_name") or r.get("buyer_name") or "").strip()
                if not sender_name:
                    raise ValueError("SENDER_NAME_REQUIRED")

                sender_phone_raw = (r.get("sender_phone") or r.get("buyer_phone") or "").strip()
                if not sender_phone_raw:
                    raise ValueError("SENDER_PHONE_REQUIRED")

                sender_phone = normalize_phone(sender_phone_raw)
                sender_enc = encrypt_phone(sender_phone)

                recipient_name = (r.get("recipient_name") or r.get("receiver_name") or "").strip() or None
                recipient_phone_raw = (r.get("recipient_phone") or r.get("receiver_phone") or "").strip() or None

                recipient_enc = None
                if recipient_phone_raw:
                    recipient_phone = normalize_phone(recipient_phone_raw)
                    recipient_enc = encrypt_phone(recipient_phone)

                context = (r.get("context") or r.get("event") or "").strip() or None

                order = Order(
                    organization_id=organization_id,
                    order_number=order_number,
                    context=context,
                    sender_name=sender_name,
                    sender_phone_encrypted=sender_enc,
                    recipient_name=recipient_name,
                    recipient_phone_encrypted=recipient_enc,
                    status=OrderStatus.PENDING,
                )
                self.db.add(order)
                self.db.flush()  # assign PK
                created_ids.append(order.id)
            except Exception as e:
                err = {"row": idx, "message": str(e)}
                errors.append(err)
                if strict:
                    self.db.rollback()
                    raise HTTPException(status_code=400, detail=f"CSV_IMPORT_FAILED: row {idx}: {e}") from e

        try:
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=400, detail=f"CSV_IMPORT_COMMIT_FAILED: {e}") from e

        return created_ids, errors

    def create_order(self, payload: OrderCreate, organization_id: int) -> Order:
        org = self.db.query(Organization).filter(Organization.id == organization_id).first()
        if not org:
            raise HTTPException(status_code=404, detail="ORG_NOT_FOUND")

        order_number = (payload.order_number or "").strip()
        if not order_number:
            raise HTTPException(status_code=400, detail="ORDER_NUMBER_REQUIRED")

        # normalize + encrypt phones
        sender_phone = normalize_phone(payload.sender_phone)
        sender_enc = encrypt_phone(sender_phone)

        recipient_enc = None
        if payload.recipient_phone:
            recipient_phone = normalize_phone(payload.recipient_phone)
            recipient_enc = encrypt_phone(recipient_phone)

        order = Order(
            organization_id=organization_id,
            order_number=order_number,
            context=(payload.context.strip() if payload.context else None),
            sender_name=payload.sender_name.strip(),
            sender_phone_encrypted=sender_enc,
            recipient_name=(payload.recipient_name.strip() if payload.recipient_name else None),
            recipient_phone_encrypted=recipient_enc,
            status=OrderStatus.PENDING,
        )
        self.db.add(order)
        self.db.commit()
        self.db.refresh(order)
        return order

    def get_order_detail(self, order_id: int, scope_org_id: Optional[int] = None) -> dict:
        q = self.db.query(Order).filter(Order.id == order_id)
        if scope_org_id is not None:
            q = q.filter(Order.organization_id == scope_org_id)
        order = q.first()
        if not order:
            raise HTTPException(status_code=404, detail="ORDER_NOT_FOUND")

        org = order.organization
        qr: Optional[QRToken] = order.qr_token
        proof = order.proof

        token = qr.token if qr else None
        token_valid = bool(qr and qr.is_valid)

        upload_url = f"{settings.WEB_BASE_URL}/proof/{token}" if token else None
        public_proof_url = f"{settings.WEB_BASE_URL}/p/{token}" if token else None

        short_public_url = None
        if token:
            sl = ShortLinkService(self.db).get_or_create_public_proof(order_id=order.id, token=token)
            short_public_url = f"{settings.WEB_BASE_URL}/s/{sl.code}"

        proof_url = None
        proof_uploaded_at = None
        if proof:
            proof_url = f"{settings.APP_BASE_URL}/uploads/{proof.file_path}"
            proof_uploaded_at = proof.uploaded_at

        notifications = (
            self.db.query(Notification)
            .filter(Notification.order_id == order.id)
            .order_by(Notification.created_at.desc())
            .all()
        )
        notifications_out = [NotificationLog.model_validate(n).model_dump() for n in notifications]

        return {
            "order": order,
            "organization": org,
            "token": token,
            "token_valid": token_valid,
            "upload_url": upload_url,
            "public_proof_url": public_proof_url,
            "short_public_url": short_public_url,
            "proof_url": proof_url,
            "proof_uploaded_at": proof_uploaded_at,
            "notifications": notifications_out,
        }

    def issue_token(self, order_id: int, scope_org_id: Optional[int] = None, force: bool = False) -> dict:
        q = self.db.query(Order).filter(Order.id == order_id)
        if scope_org_id is not None:
            q = q.filter(Order.organization_id == scope_org_id)
        order = q.first()
        if not order:
            raise HTTPException(status_code=404, detail="ORDER_NOT_FOUND")

        existing = order.qr_token
        if existing and existing.is_valid and not force:
            token = existing.token
            return {
                "token": token,
                "token_valid": True,
                "upload_url": f"{settings.WEB_BASE_URL}/proof/{token}",
                "public_proof_url": f"{settings.WEB_BASE_URL}/p/{token}",
            }

        # If existing token present, delete it to satisfy (order_id) unique constraint
        if existing:
            self.db.delete(existing)
            self.db.commit()

        qr_token = self.token_service.create_token_for_order(order.id)
        order.status = OrderStatus.TOKEN_ISSUED
        self.db.commit()

        token = qr_token.token
        return {
            "token": token,
            "token_valid": True,
            "upload_url": f"{settings.WEB_BASE_URL}/proof/{token}",
            "public_proof_url": f"{settings.WEB_BASE_URL}/p/{token}",
        }

    def get_labels(
        self,
        order_ids: list[int],
        scope_org_id: int,
        ensure_tokens: bool = True,
        force: bool = False,
    ) -> list[dict]:
        """Return print-friendly label data for many orders.

        Default behavior is "safe":
        - If token exists, keep it.
        - If token missing and ensure_tokens=True, issue a token.
        - If force=True, replace token (breaks previously shared links).
        """

        if not order_ids:
            return []

        # De-dup while keeping order
        seen = set()
        ids: list[int] = []
        for oid in order_ids:
            if oid in seen:
                continue
            seen.add(oid)
            ids.append(oid)

        orders = (
            self.db.query(Order)
            .filter(Order.organization_id == scope_org_id)
            .filter(Order.id.in_(ids))
            .all()
        )
        by_id = {o.id: o for o in orders}

        out: list[dict] = []
        changed = False

        for oid in ids:
            order = by_id.get(oid)
            if not order:
                # keep response stable for the rest; caller can show error per id
                raise HTTPException(status_code=404, detail=f"ORDER_NOT_FOUND:{oid}")

            org = order.organization
            existing = order.qr_token

            if (existing is None) and ensure_tokens:
                qr_token = self.token_service.create_token_for_order(order.id)
                order.status = OrderStatus.TOKEN_ISSUED
                existing = qr_token
                changed = True

            if existing and force:
                # WARNING: This replaces token (breaks old links).
                self.db.delete(existing)
                self.db.commit()
                qr_token = self.token_service.create_token_for_order(order.id)
                order.status = OrderStatus.TOKEN_ISSUED
                existing = qr_token
                changed = True

            if not existing:
                # still no token (ensure_tokens=False)
                continue

            token = existing.token
            token_valid = bool(existing.is_valid)
            upload_url = f"{settings.WEB_BASE_URL}/proof/{token}"
            public_proof_url = f"{settings.WEB_BASE_URL}/p/{token}"

            out.append(
                {
                    "order_id": order.id,
                    "order_number": order.order_number,
                    "context": order.context,
                    "status": str(order.status),
                    "token": token,
                    "token_valid": token_valid,
                    "upload_url": upload_url,
                    "public_proof_url": public_proof_url,
                    "organization_name": (org.brand_name or org.name),
                    "organization_logo": (org.brand_logo_url or org.logo_url),
                    "hide_saegim": bool(org.hide_saegim),
                }
            )

        if changed:
            self.db.commit()

        return out

    async def resend_notification(
        self,
        order_id: int,
        background_tasks: BackgroundTasks,
        scope_org_id: Optional[int] = None,
    ) -> dict:
        q = self.db.query(Order).filter(Order.id == order_id)
        if scope_org_id is not None:
            q = q.filter(Order.organization_id == scope_org_id)
        order = q.first()
        if not order:
            raise HTTPException(status_code=404, detail="ORDER_NOT_FOUND")

        if not order.proof:
            raise HTTPException(status_code=400, detail="PROOF_NOT_UPLOADED")

        await self.notification_service.send_dual_notification(order=order, background_tasks=background_tasks)
        return {"status": "ok"}

    # ---------------------------
    # Dashboard
    # ---------------------------
    def get_dashboard(
        self,
        organization_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> dict:
        """Get dashboard KPI and recent proofs."""
        kst = ZoneInfo("Asia/Seoul")

        # Default to today if no dates provided
        if start_date is None:
            start_date = datetime.now(timezone.utc).astimezone(kst).date()
        if end_date is None:
            end_date = start_date

        # Convert to UTC datetime range
        start_kst = datetime.combine(start_date, time.min).replace(tzinfo=kst)
        end_kst = datetime.combine(end_date, time.max).replace(tzinfo=kst)
        start_utc = start_kst.astimezone(timezone.utc)
        end_utc = end_kst.astimezone(timezone.utc)

        # Query orders in date range
        orders = (
            self.db.query(Order)
            .filter(Order.organization_id == organization_id)
            .filter(Order.created_at >= start_utc)
            .filter(Order.created_at <= end_utc)
            .all()
        )

        total_orders = len(orders)
        proof_completed = sum(1 for o in orders if o.status == OrderStatus.PROOF_UPLOADED or o.status == OrderStatus.NOTIFIED or o.status == OrderStatus.COMPLETED)
        proof_pending = total_orders - proof_completed

        # Count failed notifications in date range
        failed_notifications = (
            self.db.query(Notification)
            .join(Order, Notification.order_id == Order.id)
            .filter(Order.organization_id == organization_id)
            .filter(Notification.created_at >= start_utc)
            .filter(Notification.created_at <= end_utc)
            .filter(Notification.status == NotificationStatus.FAILED)
            .count()
        )

        # Get recent proofs (last 5)
        recent_proofs_query = (
            self.db.query(Proof, Order)
            .join(Order, Proof.order_id == Order.id)
            .filter(Order.organization_id == organization_id)
            .order_by(Proof.uploaded_at.desc())
            .limit(5)
            .all()
        )

        recent_proofs = []
        for proof, order in recent_proofs_query:
            recent_proofs.append({
                "order_id": order.id,
                "order_number": order.order_number,
                "context": order.context,
                "proof_type": str(proof.proof_type) if proof.proof_type else None,
                "uploaded_at": proof.uploaded_at,
            })

        return {
            "kpi": {
                "total_orders": total_orders,
                "proof_pending": proof_pending,
                "proof_completed": proof_completed,
                "notification_failed": failed_notifications,
            },
            "recent_proofs": recent_proofs,
        }

    # ---------------------------
    # Order Update/Delete
    # ---------------------------
    def update_order(
        self,
        order_id: int,
        payload: OrderUpdate,
        scope_org_id: Optional[int] = None,
    ) -> Order:
        """Update order fields."""
        q = self.db.query(Order).filter(Order.id == order_id)
        if scope_org_id is not None:
            q = q.filter(Order.organization_id == scope_org_id)
        order = q.first()

        if not order:
            raise HTTPException(status_code=404, detail="ORDER_NOT_FOUND")

        # Update fields if provided
        if payload.order_number is not None:
            order.order_number = payload.order_number.strip()

        if payload.context is not None:
            order.context = payload.context.strip() if payload.context.strip() else None

        if payload.sender_name is not None:
            order.sender_name = payload.sender_name.strip()

        if payload.sender_phone is not None:
            sender_phone = normalize_phone(payload.sender_phone)
            order.sender_phone_encrypted = encrypt_phone(sender_phone)

        if payload.recipient_name is not None:
            order.recipient_name = payload.recipient_name.strip() if payload.recipient_name.strip() else None

        if payload.recipient_phone is not None:
            if payload.recipient_phone.strip():
                recipient_phone = normalize_phone(payload.recipient_phone)
                order.recipient_phone_encrypted = encrypt_phone(recipient_phone)
            else:
                order.recipient_phone_encrypted = None

        try:
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=400, detail=f"UPDATE_ORDER_FAILED: {e}") from e

        self.db.refresh(order)
        return order

    def delete_order(
        self,
        order_id: int,
        scope_org_id: Optional[int] = None,
    ) -> dict:
        """Soft delete an order (actually deletes for now, can change to soft delete later)."""
        q = self.db.query(Order).filter(Order.id == order_id)
        if scope_org_id is not None:
            q = q.filter(Order.organization_id == scope_org_id)
        order = q.first()

        if not order:
            raise HTTPException(status_code=404, detail="ORDER_NOT_FOUND")

        # Delete related records first
        # Delete notifications
        self.db.query(Notification).filter(Notification.order_id == order_id).delete()
        # Delete proofs
        self.db.query(Proof).filter(Proof.order_id == order_id).delete()
        # Delete QR token
        self.db.query(QRToken).filter(QRToken.order_id == order_id).delete()
        # Delete order
        self.db.delete(order)

        try:
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=400, detail=f"DELETE_ORDER_FAILED: {e}") from e

        return {"status": "ok", "deleted_order_id": order_id}

    # ---------------------------
    # Notifications List
    # ---------------------------
    def list_notifications(
        self,
        organization_id: int,
        page: int = 1,
        limit: int = 50,
        status: Optional[str] = None,
        channel: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> dict:
        """List notifications with pagination and filters."""
        kst = ZoneInfo("Asia/Seoul")

        query = (
            self.db.query(Notification, Order)
            .join(Order, Notification.order_id == Order.id)
            .filter(Order.organization_id == organization_id)
        )

        # Date filter
        if start_date:
            start_kst = datetime.combine(start_date, time.min).replace(tzinfo=kst)
            start_utc = start_kst.astimezone(timezone.utc)
            query = query.filter(Notification.created_at >= start_utc)

        if end_date:
            end_kst = datetime.combine(end_date, time.max).replace(tzinfo=kst)
            end_utc = end_kst.astimezone(timezone.utc)
            query = query.filter(Notification.created_at <= end_utc)

        # Status filter
        if status:
            try:
                st = NotificationStatus(status.upper())
                query = query.filter(Notification.status == st)
            except ValueError:
                pass  # ignore invalid status

        # Channel filter
        if channel:
            try:
                ch = NotificationChannel(channel.upper())
                query = query.filter(Notification.channel == ch)
            except ValueError:
                pass  # ignore invalid channel

        # Count total
        total = query.count()

        # Paginate
        offset = (page - 1) * limit
        results = (
            query
            .order_by(Notification.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        items = []
        for notification, order in results:
            items.append({
                "id": notification.id,
                "order_id": order.id,
                "order_number": order.order_number,
                "type": str(notification.type.value) if notification.type else None,
                "channel": str(notification.channel.value) if notification.channel else None,
                "status": str(notification.status.value) if notification.status else None,
                "message_url": notification.message_url,
                "error_message": notification.error_message,
                "created_at": notification.created_at,
                "sent_at": notification.sent_at,
            })

        total_pages = (total + limit - 1) // limit

        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
        }

    def get_notification_stats(
        self,
        organization_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> dict:
        """Get notification statistics."""
        kst = ZoneInfo("Asia/Seoul")

        query = (
            self.db.query(Notification)
            .join(Order, Notification.order_id == Order.id)
            .filter(Order.organization_id == organization_id)
        )

        if start_date:
            start_kst = datetime.combine(start_date, time.min).replace(tzinfo=kst)
            start_utc = start_kst.astimezone(timezone.utc)
            query = query.filter(Notification.created_at >= start_utc)

        if end_date:
            end_kst = datetime.combine(end_date, time.max).replace(tzinfo=kst)
            end_utc = end_kst.astimezone(timezone.utc)
            query = query.filter(Notification.created_at <= end_utc)

        notifications = query.all()

        success = sum(1 for n in notifications if n.status in [NotificationStatus.SENT, NotificationStatus.FALLBACK_SENT, NotificationStatus.MOCK_SENT])
        failed = sum(1 for n in notifications if n.status == NotificationStatus.FAILED)
        pending = sum(1 for n in notifications if n.status == NotificationStatus.PENDING)

        return {
            "success": success,
            "failed": failed,
            "pending": pending,
        }

    # ---------------------------
    # Bulk Token Generation
    # ---------------------------
    def bulk_generate_tokens(
        self,
        order_ids: list[int],
        scope_org_id: int,
        force: bool = False,
    ) -> dict:
        """Generate tokens for multiple orders at once."""
        if not order_ids:
            return {
                "total": 0,
                "success_count": 0,
                "failed_count": 0,
                "results": [],
            }

        # De-dup while keeping order
        seen = set()
        ids: list[int] = []
        for oid in order_ids:
            if oid in seen:
                continue
            seen.add(oid)
            ids.append(oid)

        orders = (
            self.db.query(Order)
            .filter(Order.organization_id == scope_org_id)
            .filter(Order.id.in_(ids))
            .all()
        )
        by_id = {o.id: o for o in orders}

        results: list[dict] = []
        success_count = 0
        failed_count = 0

        for oid in ids:
            order = by_id.get(oid)
            if not order:
                results.append({
                    "order_id": oid,
                    "order_number": "",
                    "success": False,
                    "error": "ORDER_NOT_FOUND",
                })
                failed_count += 1
                continue

            try:
                existing = order.qr_token

                # Skip if token exists and not forcing
                if existing and existing.is_valid and not force:
                    token = existing.token
                    results.append({
                        "order_id": order.id,
                        "order_number": order.order_number,
                        "success": True,
                        "token": token,
                        "token_valid": True,
                        "upload_url": f"{settings.WEB_BASE_URL}/proof/{token}",
                        "public_proof_url": f"{settings.WEB_BASE_URL}/p/{token}",
                    })
                    success_count += 1
                    continue

                # Delete existing if forcing
                if existing and force:
                    self.db.delete(existing)
                    self.db.flush()

                # Create new token
                qr_token = self.token_service.create_token_for_order(order.id)
                order.status = OrderStatus.TOKEN_ISSUED
                self.db.flush()

                token = qr_token.token
                results.append({
                    "order_id": order.id,
                    "order_number": order.order_number,
                    "success": True,
                    "token": token,
                    "token_valid": True,
                    "upload_url": f"{settings.WEB_BASE_URL}/proof/{token}",
                    "public_proof_url": f"{settings.WEB_BASE_URL}/p/{token}",
                })
                success_count += 1

            except Exception as e:
                results.append({
                    "order_id": order.id,
                    "order_number": order.order_number,
                    "success": False,
                    "error": str(e),
                })
                failed_count += 1

        try:
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=400, detail=f"BULK_TOKEN_COMMIT_FAILED: {e}") from e

        return {
            "total": len(ids),
            "success_count": success_count,
            "failed_count": failed_count,
            "results": results,
        }

    # ---------------------------
    # CSV Export
    # ---------------------------
    def export_orders_csv(
        self,
        organization_id: int,
        status: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> str:
        """Export orders to CSV format."""
        kst = ZoneInfo("Asia/Seoul")

        query = self.db.query(Order).filter(Order.organization_id == organization_id)

        # Status filter
        if status:
            try:
                st = OrderStatus(status.upper())
                query = query.filter(Order.status == st)
            except ValueError:
                pass

        # Date filter
        if start_date:
            start_kst = datetime.combine(start_date, time.min).replace(tzinfo=kst)
            start_utc = start_kst.astimezone(timezone.utc)
            query = query.filter(Order.created_at >= start_utc)

        if end_date:
            end_kst = datetime.combine(end_date, time.max).replace(tzinfo=kst)
            end_utc = end_kst.astimezone(timezone.utc)
            query = query.filter(Order.created_at <= end_utc)

        orders = query.order_by(Order.created_at.desc()).all()

        # Build CSV
        output = io.StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow([
            "order_id",
            "order_number",
            "context",
            "status",
            "sender_name",
            "sender_phone",
            "recipient_name",
            "recipient_phone",
            "has_token",
            "has_proof",
            "created_at",
        ])

        # Rows
        for order in orders:
            # Decrypt phones for export
            sender_phone = ""
            if order.sender_phone_encrypted:
                try:
                    sender_phone = decrypt_phone(order.sender_phone_encrypted)
                except Exception:
                    sender_phone = "[암호화됨]"

            recipient_phone = ""
            if order.recipient_phone_encrypted:
                try:
                    recipient_phone = decrypt_phone(order.recipient_phone_encrypted)
                except Exception:
                    recipient_phone = "[암호화됨]"

            has_token = bool(order.qr_token and order.qr_token.is_valid)
            has_proof = order.proof is not None

            # Convert created_at to KST
            created_at_kst = order.created_at.astimezone(kst).strftime("%Y-%m-%d %H:%M:%S") if order.created_at else ""

            writer.writerow([
                order.id,
                order.order_number,
                order.context or "",
                str(order.status.value) if order.status else "",
                order.sender_name or "",
                sender_phone,
                order.recipient_name or "",
                recipient_phone,
                "Y" if has_token else "N",
                "Y" if has_proof else "N",
                created_at_kst,
            ])

        return output.getvalue()

    # ---------------------------
    # Analytics
    # ---------------------------
    def get_analytics(
        self,
        organization_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> dict:
        """Get detailed analytics with trends and breakdowns."""
        kst = ZoneInfo("Asia/Seoul")

        # Default to last 30 days
        if end_date is None:
            end_date = datetime.now(timezone.utc).astimezone(kst).date()
        if start_date is None:
            start_date = end_date - timedelta(days=30)

        # Convert to UTC datetime range
        start_kst = datetime.combine(start_date, time.min).replace(tzinfo=kst)
        end_kst = datetime.combine(end_date, time.max).replace(tzinfo=kst)
        start_utc = start_kst.astimezone(timezone.utc)
        end_utc = end_kst.astimezone(timezone.utc)

        # Query orders in date range
        orders = (
            self.db.query(Order)
            .filter(Order.organization_id == organization_id)
            .filter(Order.created_at >= start_utc)
            .filter(Order.created_at <= end_utc)
            .all()
        )

        total_orders = len(orders)

        # Count proofs
        completed_statuses = [OrderStatus.PROOF_UPLOADED, OrderStatus.NOTIFIED, OrderStatus.COMPLETED]
        total_proofs = sum(1 for o in orders if o.status in completed_statuses)
        proof_completion_rate = (total_proofs / total_orders) if total_orders > 0 else 0.0

        # Query notifications in date range
        notifications = (
            self.db.query(Notification)
            .join(Order, Notification.order_id == Order.id)
            .filter(Order.organization_id == organization_id)
            .filter(Notification.created_at >= start_utc)
            .filter(Notification.created_at <= end_utc)
            .all()
        )

        total_notifications = len(notifications)
        success_statuses = [NotificationStatus.SENT, NotificationStatus.FALLBACK_SENT, NotificationStatus.MOCK_SENT]
        successful_notifications = sum(1 for n in notifications if n.status in success_statuses)
        notification_success_rate = (successful_notifications / total_notifications) if total_notifications > 0 else 0.0

        # Channel breakdown
        alimtalk_sent = sum(1 for n in notifications if n.channel == NotificationChannel.ALIMTALK and n.status in success_statuses)
        alimtalk_failed = sum(1 for n in notifications if n.channel == NotificationChannel.ALIMTALK and n.status == NotificationStatus.FAILED)
        sms_sent = sum(1 for n in notifications if n.channel == NotificationChannel.SMS and n.status in success_statuses)
        sms_failed = sum(1 for n in notifications if n.channel == NotificationChannel.SMS and n.status == NotificationStatus.FAILED)

        # Proof timing calculation
        proof_timings: list[float] = []
        for order in orders:
            if order.proof and order.qr_token:
                token_created = order.qr_token.created_at
                proof_uploaded = order.proof.uploaded_at
                if token_created and proof_uploaded:
                    delta_minutes = (proof_uploaded - token_created).total_seconds() / 60
                    if delta_minutes > 0:
                        proof_timings.append(delta_minutes)

        proof_timing_stats = {}
        if proof_timings:
            proof_timing_stats = {
                "avg_minutes": round(sum(proof_timings) / len(proof_timings), 2),
                "min_minutes": round(min(proof_timings), 2),
                "max_minutes": round(max(proof_timings), 2),
                "median_minutes": round(statistics.median(proof_timings), 2),
            }

        # Daily trends
        daily_trends: list[dict] = []
        orders_by_date: dict[str, list] = defaultdict(list)
        proofs_by_date: dict[str, int] = defaultdict(int)
        notifications_sent_by_date: dict[str, int] = defaultdict(int)
        notifications_failed_by_date: dict[str, int] = defaultdict(int)

        for order in orders:
            order_date = order.created_at.astimezone(kst).date().isoformat()
            orders_by_date[order_date].append(order)
            if order.status in completed_statuses:
                proofs_by_date[order_date] += 1

        for notification in notifications:
            notif_date = notification.created_at.astimezone(kst).date().isoformat()
            if notification.status in success_statuses:
                notifications_sent_by_date[notif_date] += 1
            elif notification.status == NotificationStatus.FAILED:
                notifications_failed_by_date[notif_date] += 1

        # Generate all dates in range
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.isoformat()
            daily_trends.append({
                "date": date_str,
                "orders": len(orders_by_date.get(date_str, [])),
                "proofs": proofs_by_date.get(date_str, 0),
                "notifications_sent": notifications_sent_by_date.get(date_str, 0),
                "notifications_failed": notifications_failed_by_date.get(date_str, 0),
            })
            current_date += timedelta(days=1)

        return {
            "total_orders": total_orders,
            "total_proofs": total_proofs,
            "proof_completion_rate": round(proof_completion_rate, 4),
            "total_notifications": total_notifications,
            "notification_success_rate": round(notification_success_rate, 4),
            "channel_breakdown": {
                "alimtalk_sent": alimtalk_sent,
                "alimtalk_failed": alimtalk_failed,
                "sms_sent": sms_sent,
                "sms_failed": sms_failed,
            },
            "proof_timing": proof_timing_stats,
            "daily_trends": daily_trends,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
        }

    # ---------------------------
    # Reminder Notifications
    # ---------------------------
    def get_pending_reminders(
        self,
        organization_id: int,
        hours_since_token: int = 24,
    ) -> dict:
        """Get orders that are eligible for reminder notifications."""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours_since_token)

        # Find orders with:
        # - Token issued (status >= TOKEN_ISSUED)
        # - No proof uploaded (status < PROOF_UPLOADED)
        # - Token issued before cutoff time
        orders = (
            self.db.query(Order)
            .join(QRToken, Order.id == QRToken.order_id)
            .filter(Order.organization_id == organization_id)
            .filter(Order.status.in_([OrderStatus.TOKEN_ISSUED, OrderStatus.PENDING]))
            .filter(QRToken.is_active == True)
            .filter(QRToken.created_at < cutoff)
            .all()
        )

        # Count existing reminders per order
        reminder_counts = {}
        for order in orders:
            reminder_count = (
                self.db.query(Notification)
                .filter(Notification.order_id == order.id)
                .filter(Notification.type == NotificationType.REMINDER)
                .count()
            )
            reminder_counts[order.id] = reminder_count

        items = []
        for order in orders:
            token_created = order.qr_token.created_at if order.qr_token else None
            hours_ago = None
            if token_created:
                delta = datetime.now(timezone.utc) - token_created.replace(tzinfo=timezone.utc)
                hours_ago = round(delta.total_seconds() / 3600, 1)

            items.append({
                "order_id": order.id,
                "order_number": order.order_number,
                "context": order.context,
                "sender_name": order.sender_name,
                "token_created_at": token_created.isoformat() if token_created else None,
                "hours_since_token": hours_ago,
                "reminder_count": reminder_counts.get(order.id, 0),
            })

        return {
            "total": len(items),
            "orders": items,
        }

    async def send_reminders(
        self,
        organization_id: int,
        background_tasks: BackgroundTasks,
        order_ids: Optional[list[int]] = None,
        hours_since_token: int = 24,
        max_reminders: int = 1,
    ) -> dict:
        """Send reminder notifications to orders pending proof upload."""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours_since_token)

        # Build query
        query = (
            self.db.query(Order)
            .join(QRToken, Order.id == QRToken.order_id)
            .filter(Order.organization_id == organization_id)
            .filter(Order.status.in_([OrderStatus.TOKEN_ISSUED, OrderStatus.PENDING]))
            .filter(QRToken.is_active == True)
            .filter(QRToken.created_at < cutoff)
        )

        if order_ids:
            query = query.filter(Order.id.in_(order_ids))

        orders = query.all()

        results: list[dict] = []
        sent_count = 0
        skipped_count = 0
        failed_count = 0

        for order in orders:
            # Check reminder count
            existing_reminders = (
                self.db.query(Notification)
                .filter(Notification.order_id == order.id)
                .filter(Notification.type == NotificationType.REMINDER)
                .count()
            )

            if existing_reminders >= max_reminders:
                results.append({
                    "order_id": order.id,
                    "order_number": order.order_number,
                    "success": False,
                    "message": f"Skipped: already sent {existing_reminders} reminder(s)",
                })
                skipped_count += 1
                continue

            try:
                # Send reminder notification
                await self.notification_service.send_reminder_notification(
                    order=order,
                    background_tasks=background_tasks,
                )
                results.append({
                    "order_id": order.id,
                    "order_number": order.order_number,
                    "success": True,
                    "message": "Reminder sent",
                })
                sent_count += 1
            except Exception as e:
                results.append({
                    "order_id": order.id,
                    "order_number": order.order_number,
                    "success": False,
                    "error": str(e),
                })
                failed_count += 1

        return {
            "total": len(orders),
            "sent_count": sent_count,
            "skipped_count": skipped_count,
            "failed_count": failed_count,
            "results": results,
        }
