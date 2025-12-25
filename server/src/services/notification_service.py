import logging
import asyncio
from datetime import datetime
from typing import Optional

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from src.core.config import settings
from src.core.security import decrypt_phone, hash_phone
from src.integrations.messaging.factory import get_primary_provider, get_sms_provider
from src.models import Notification, NotificationChannel, NotificationStatus, NotificationType
from src.models.order import Order
from src.services.message_render import render
from src.services.short_link_service import ShortLinkService

logger = logging.getLogger(__name__)


async def _retry_with_backoff(
    coro_func,
    max_retries: int = 3,
    base_delay: float = 1.0,
    *args,
    **kwargs
):
    """
    Execute coroutine with exponential backoff retry.

    Args:
        coro_func: Async function to execute
        max_retries: Maximum retry attempts
        base_delay: Base delay in seconds (doubles each retry)

    Raises:
        Last exception if all retries fail
    """
    last_exception = None

    for attempt in range(max_retries + 1):
        try:
            return await coro_func(*args, **kwargs)
        except Exception as e:
            last_exception = e
            if attempt < max_retries:
                delay = base_delay * (2 ** attempt)  # Exponential backoff
                logger.warning(
                    f"Retry attempt {attempt + 1}/{max_retries} failed: {e}. "
                    f"Retrying in {delay}s..."
                )
                await asyncio.sleep(delay)
            else:
                logger.error(f"All {max_retries + 1} attempts failed: {e}")

    raise last_exception


def _clean_phone(phone: str) -> str:
    return (phone or "").replace("-", "").replace(" ", "").strip()



def _templates_for_order(order: "Order"):
    """Select messaging templates (org override first, then global defaults)."""
    org = getattr(order, "organization", None)
    alim_sender = getattr(org, "msg_alimtalk_template_sender", None) if org else None
    alim_recipient = getattr(org, "msg_alimtalk_template_recipient", None) if org else None
    sms_sender = getattr(org, "msg_sms_template_sender", None) if org else None
    sms_recipient = getattr(org, "msg_sms_template_recipient", None) if org else None

    kakao_template_code = getattr(org, "msg_kakao_template_code", None) if org else None
    fallback_override = getattr(org, "msg_fallback_sms_enabled", None) if org else None

    return {
        "alimtalk_sender": alim_sender or settings.ALIMTALK_TEMPLATE_SENDER,
        "alimtalk_recipient": alim_recipient or settings.ALIMTALK_TEMPLATE_RECIPIENT,
        "sms_sender": sms_sender or settings.SMS_TEMPLATE_SENDER,
        "sms_recipient": sms_recipient or settings.SMS_TEMPLATE_RECIPIENT,
        "kakao_template_code": kakao_template_code or settings.KAKAO_TEMPLATE_PROOF_DONE,
        "fallback_sms_enabled": settings.FALLBACK_SMS_ENABLED if fallback_override is None else bool(fallback_override),
    }

def _short_base_for_order(order: Order) -> str:
    # White-label 우선: org.brand_domain -> SHORT_URL_BASE -> WEB_BASE_URL
    org = getattr(order, "organization", None)
    domain = None
    if org is not None:
        domain = (org.brand_domain or "").strip() or None
    base = (domain or settings.SHORT_URL_BASE or settings.WEB_BASE_URL).rstrip("/")
    return base


def _brand_for_order(order: Order) -> str:
    org = getattr(order, "organization", None)
    brand = None
    if org is not None:
        brand = (org.brand_name or "").strip() or None
        if not brand:
            brand = (org.name or "").strip() or None
    return brand or "새김"


class NotificationService:
    """Notification sending (AlimTalk + SMS fallback)."""

    def __init__(self, db: Session):
        self.db = db

    async def send_dual_notification(self, order: "Order", background_tasks: BackgroundTasks) -> None:
        """Send to sender + recipient (if phone exists)."""
        if not order:
            return

        order_id = order.id

        # Sender
        try:
            sender_phone = decrypt_phone(order.sender_phone_encrypted)
            sender_phone = _clean_phone(sender_phone)
            if sender_phone:
                background_tasks.add_task(
                    self._send_notification,
                    order_id,
                    sender_phone,
                    NotificationType.SENDER,
                )
        except Exception as e:
            logger.error(f"Sender phone decrypt failed for order {order_id}: {e}")

        # Recipient (optional)
        try:
            if order.recipient_phone_encrypted:
                recipient_phone = decrypt_phone(order.recipient_phone_encrypted)
                recipient_phone = _clean_phone(recipient_phone)
                if recipient_phone:
                    background_tasks.add_task(
                        self._send_notification,
                        order_id,
                        recipient_phone,
                        NotificationType.RECIPIENT,
                    )
        except Exception as e:
            logger.error(f"Recipient phone decrypt failed for order {order_id}: {e}")

    async def _send_notification(self, order_id: int, phone: str, notification_type: NotificationType) -> None:
        """Send a single notification with DB log."""
        phone = _clean_phone(phone)
        phone_hash = hash_phone(phone)

        order = self.db.query(Order).filter(Order.id == order_id).first()
        if not order:
            return

        token = None
        try:
            if order.qr_token is not None:
                token = order.qr_token.token
        except Exception:
            token = None

        short_url: Optional[str] = None
        if token:
            sl = ShortLinkService(self.db).get_or_create_public_proof(order_id=order_id, token=token)
            base = _short_base_for_order(order)
            short_url = f"{base}/s/{sl.code}"

        # Choose channel by provider
        provider_key = (settings.MESSAGING_PROVIDER or "mock").strip().lower()
        primary_channel = NotificationChannel.SMS if provider_key in {"sens_sms", "sens"} else NotificationChannel.ALIMTALK

        notification = Notification(
            order_id=order_id,
            type=notification_type,
            channel=primary_channel,
            phone_hash=phone_hash,
            message_url=short_url,
            status=NotificationStatus.PENDING,
        )
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)

        brand = _brand_for_order(order)
        base = _short_base_for_order(order)
        canonical_url = f"{base}/p/{token}" if token else base
        ctx = {
            "brand": brand,
            "url": short_url or canonical_url,
            "order": order.order_number,
            "context": (order.context or "").strip(),
            "sender": (order.sender_name or "").strip(),
            "recipient": (order.recipient_name or "").strip(),
        }
        templates = _templates_for_order(order)

        try:
            if settings.MESSAGING_PROVIDER == "mock":
                await self._mock_send(notification, phone, notification_type, ctx, templates)
            else:
                await self._real_send(notification, phone, notification_type, ctx, templates)

        except Exception as e:
            # Persist primary failure
            code = getattr(e, "code", None) or "SEND_FAILED"
            details = getattr(e, "details", None)
            logger.error(f"Notification failed order={order_id} type={notification_type} code={code} err={e}")
            notification.status = NotificationStatus.FAILED
            notification.error_code = str(code)
            notification.error_message = str(details or e)
            self.db.commit()

            # Fallback only when primary is AlimTalk
            if primary_channel == NotificationChannel.ALIMTALK and templates['fallback_sms_enabled']:
                await self._send_sms_fallback(order_id=order_id, phone=phone, notification_type=notification_type, ctx=ctx, templates=templates)

    async def _mock_send(self, notification: Notification, phone: str, notification_type: NotificationType, ctx: dict, templates: dict) -> None:
        """Mock send - update DB."""
        template = templates['alimtalk_sender'] if notification_type == NotificationType.SENDER else templates['alimtalk_recipient']
        message = render(template, ctx)

        logger.info(f"[MOCK] notify type={notification_type} phone={phone} msg={message}")
        notification.status = NotificationStatus.MOCK_SENT
        notification.sent_at = datetime.utcnow()
        notification.provider_response = "MOCK"
        self.db.commit()

    async def _real_send(self, notification: Notification, phone: str, notification_type: NotificationType, ctx: dict, templates: dict) -> None:
        """Real send via selected provider with retry logic."""
        provider = get_primary_provider()

        async def _do_send():
            if notification.channel == NotificationChannel.SMS:
                template = templates['sms_sender'] if notification_type == NotificationType.SENDER else templates['sms_recipient']
                content = render(template, ctx)
                return await provider.send_sms(phone=phone, content=content, from_no=settings.SENS_SMS_FROM)
            else:
                template = templates['alimtalk_sender'] if notification_type == NotificationType.SENDER else templates['alimtalk_recipient']
                message = render(template, ctx)
                return await provider.send_alimtalk(
                    phone=phone,
                    message=message,
                    sender_key=settings.KAKAO_SENDER_KEY or "",
                    template_code=(templates.get('kakao_template_code') or ""),
                    sender_no=settings.KAKAO_SENDER_NO,
                    cid=settings.KAKAO_CID,
                    fall_back_yn=False,
                )

        # Execute with retry
        res = await _retry_with_backoff(
            _do_send,
            max_retries=settings.NOTIFICATION_MAX_RETRIES,
            base_delay=settings.NOTIFICATION_RETRY_DELAY_SECONDS,
        )

        notification.status = NotificationStatus.SENT
        notification.sent_at = datetime.utcnow()
        notification.provider_request_id = res.request_id
        notification.provider_response = str(res.raw)[:4000]
        notification.retry_count = 0  # Will be updated if retries occurred
        self.db.commit()

    async def _send_sms_fallback(self, *, order_id: int, phone: str, notification_type: NotificationType, ctx: dict, templates: dict) -> None:
        """Send SMS fallback with retry (requires SENS config)."""
        phone = _clean_phone(phone)
        phone_hash = hash_phone(phone)

        fallback = Notification(
            order_id=order_id,
            type=notification_type,
            channel=NotificationChannel.SMS,
            phone_hash=phone_hash,
            message_url=ctx.get("url"),
            status=NotificationStatus.PENDING,
        )
        self.db.add(fallback)
        self.db.commit()
        self.db.refresh(fallback)

        try:
            if settings.MESSAGING_PROVIDER == "mock":
                logger.info(f"[MOCK] SMS fallback order={order_id} type={notification_type}")
                fallback.status = NotificationStatus.MOCK_SENT
                fallback.sent_at = datetime.utcnow()
                fallback.provider_response = "MOCK_SMS_FALLBACK"
            else:
                provider = get_sms_provider()
                template = templates['sms_sender'] if notification_type == NotificationType.SENDER else templates['sms_recipient']
                content = render(template, ctx)

                async def _do_fallback_send():
                    return await provider.send_sms(phone=phone, content=content, from_no=settings.SENS_SMS_FROM)

                # Execute with retry
                res = await _retry_with_backoff(
                    _do_fallback_send,
                    max_retries=settings.NOTIFICATION_MAX_RETRIES,
                    base_delay=settings.NOTIFICATION_RETRY_DELAY_SECONDS,
                )

                fallback.status = NotificationStatus.FALLBACK_SENT
                fallback.sent_at = datetime.utcnow()
                fallback.provider_request_id = res.request_id
                fallback.provider_response = str(res.raw)[:4000]
        except Exception as e:
            code = getattr(e, "code", None) or "FALLBACK_FAILED"
            details = getattr(e, "details", None)
            fallback.status = NotificationStatus.FAILED
            fallback.error_code = str(code)
            fallback.error_message = str(details or e)
            logger.error(f"SMS fallback failed after retries: order={order_id} error={e}")
        finally:
            self.db.commit()

    async def send_reminder_notification(self, order: "Order", background_tasks: BackgroundTasks) -> None:
        """Send reminder notification to sender (only) for pending proof upload."""
        if not order:
            return

        order_id = order.id

        # Reminder only to sender
        try:
            sender_phone = decrypt_phone(order.sender_phone_encrypted)
            sender_phone = _clean_phone(sender_phone)
            if sender_phone:
                background_tasks.add_task(
                    self._send_reminder,
                    order_id,
                    sender_phone,
                )
        except Exception as e:
            logger.error(f"Sender phone decrypt failed for reminder order {order_id}: {e}")
            raise

    async def _send_reminder(self, order_id: int, phone: str) -> None:
        """Send a reminder notification with DB log."""
        phone = _clean_phone(phone)
        phone_hash = hash_phone(phone)

        order = self.db.query(Order).filter(Order.id == order_id).first()
        if not order:
            return

        token = None
        try:
            if order.qr_token is not None:
                token = order.qr_token.token
        except Exception:
            token = None

        short_url: Optional[str] = None
        if token:
            sl = ShortLinkService(self.db).get_or_create_public_proof(order_id=order_id, token=token)
            base = _short_base_for_order(order)
            short_url = f"{base}/s/{sl.code}"

        # Reminder uses SMS by default (since it's a follow-up)
        provider_key = (settings.MESSAGING_PROVIDER or "mock").strip().lower()
        channel = NotificationChannel.SMS

        notification = Notification(
            order_id=order_id,
            type=NotificationType.REMINDER,
            channel=channel,
            phone_hash=phone_hash,
            message_url=short_url,
            status=NotificationStatus.PENDING,
        )
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)

        brand = _brand_for_order(order)
        base = _short_base_for_order(order)
        canonical_url = f"{base}/p/{token}" if token else base
        ctx = {
            "brand": brand,
            "url": short_url or canonical_url,
            "order": order.order_number,
            "context": (order.context or "").strip(),
            "sender": (order.sender_name or "").strip(),
            "recipient": (order.recipient_name or "").strip(),
        }

        # Reminder template (simple SMS)
        reminder_template = settings.SMS_REMINDER_TEMPLATE or (
            "[{brand}] 증빙 사진 업로드를 잊지 마세요! 주문: {order}. 업로드: {url}"
        )

        try:
            if settings.MESSAGING_PROVIDER == "mock":
                from src.services.message_render import render
                message = render(reminder_template, ctx)
                logger.info(f"[MOCK] reminder notify phone={phone} msg={message}")
                notification.status = NotificationStatus.MOCK_SENT
                notification.sent_at = datetime.utcnow()
                notification.provider_response = "MOCK_REMINDER"
            else:
                provider = get_sms_provider()
                from src.services.message_render import render
                content = render(reminder_template, ctx)

                async def _do_reminder_send():
                    return await provider.send_sms(phone=phone, content=content, from_no=settings.SENS_SMS_FROM)

                res = await _retry_with_backoff(
                    _do_reminder_send,
                    max_retries=settings.NOTIFICATION_MAX_RETRIES,
                    base_delay=settings.NOTIFICATION_RETRY_DELAY_SECONDS,
                )

                notification.status = NotificationStatus.SENT
                notification.sent_at = datetime.utcnow()
                notification.provider_request_id = res.request_id
                notification.provider_response = str(res.raw)[:4000]

            self.db.commit()

        except Exception as e:
            code = getattr(e, "code", None) or "REMINDER_FAILED"
            details = getattr(e, "details", None)
            logger.error(f"Reminder notification failed order={order_id} code={code} err={e}")
            notification.status = NotificationStatus.FAILED
            notification.error_code = str(code)
            notification.error_message = str(details or e)
            self.db.commit()
            raise
