import logging
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy.orm import Session
from fastapi import BackgroundTasks

from src.models import Notification, NotificationType, NotificationChannel, NotificationStatus
from src.core.security import hash_phone, decrypt_phone
from src.core.config import settings

if TYPE_CHECKING:
    from src.models import Order

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Service for sending notifications.
    v1: Mock mode - logs and records to DB without actual sending.
    """

    def __init__(self, db: Session):
        self.db = db

    async def send_dual_notification(
        self,
        order: "Order",
        background_tasks: BackgroundTasks,
    ) -> None:
        """
        Send notifications to both sender and recipient.
        Uses BackgroundTasks to avoid blocking the main request.
        """
        # Sender notification
        sender_phone = decrypt_phone(order.sender_phone_encrypted)
        if sender_phone:
            background_tasks.add_task(
                self._send_notification,
                order_id=order.id,
                phone=sender_phone,
                notification_type=NotificationType.SENDER,
                recipient_name=order.recipient_name,
            )

        # Recipient notification
        if order.recipient_phone_encrypted:
            recipient_phone = decrypt_phone(order.recipient_phone_encrypted)
            if recipient_phone:
                background_tasks.add_task(
                    self._send_notification,
                    order_id=order.id,
                    phone=recipient_phone,
                    notification_type=NotificationType.RECIPIENT,
                    sender_name=order.sender_name,
                )

    async def _send_notification(
        self,
        order_id: int,
        phone: str,
        notification_type: NotificationType,
        sender_name: str = None,
        recipient_name: str = None,
    ) -> None:
        """
        Send a single notification.
        v1: Mock mode - just log and record to DB.
        """
        phone_hash = hash_phone(phone)

        # Create notification record
        notification = Notification(
            order_id=order_id,
            type=notification_type,
            channel=NotificationChannel.ALIMTALK,
            status=NotificationStatus.PENDING,
            phone_hash=phone_hash,
        )
        self.db.add(notification)
        self.db.commit()

        try:
            if settings.MESSAGING_PROVIDER == "mock":
                # Mock mode: just log
                await self._mock_send(notification, notification_type, sender_name, recipient_name)
            else:
                # Real mode: call actual API (v1.5)
                await self._real_send(notification, phone)

        except Exception as e:
            logger.error(f"Notification failed for order {order_id}: {e}")
            notification.status = NotificationStatus.FAILED
            notification.error_message = str(e)
            self.db.commit()

            # Try SMS fallback
            if settings.FALLBACK_SMS_ENABLED:
                await self._send_sms_fallback(order_id, phone, notification_type)

    async def _mock_send(
        self,
        notification: Notification,
        notification_type: NotificationType,
        sender_name: str = None,
        recipient_name: str = None,
    ) -> None:
        """Mock send - log and update DB."""
        if notification_type == NotificationType.SENDER:
            message = f"[MOCK] Sender notification: '{recipient_name}님에게 보내신 선물이 배송 완료되었습니다.'"
        else:
            message = f"[MOCK] Recipient notification: '{sender_name}님이 보내신 선물이 도착했습니다.'"

        logger.info(f"Order {notification.order_id}: {message}")

        notification.status = NotificationStatus.MOCK_SENT
        notification.sent_at = datetime.utcnow()
        notification.provider_response = "Mock mode - no actual send"
        self.db.commit()

    async def _real_send(self, notification: Notification, phone: str) -> None:
        """
        Real send via Kakao AlimTalk.
        TODO: Implement in v1.5
        """
        raise NotImplementedError("Real notification sending not implemented yet")

    async def _send_sms_fallback(
        self,
        order_id: int,
        phone: str,
        notification_type: NotificationType,
    ) -> None:
        """
        Send SMS as fallback when AlimTalk fails.
        v1: Mock mode.
        """
        phone_hash = hash_phone(phone)

        fallback = Notification(
            order_id=order_id,
            type=notification_type,
            channel=NotificationChannel.SMS,
            status=NotificationStatus.PENDING,
            phone_hash=phone_hash,
        )
        self.db.add(fallback)
        self.db.commit()

        try:
            if settings.MESSAGING_PROVIDER == "mock":
                logger.info(f"[MOCK] SMS fallback for order {order_id}, type: {notification_type}")
                fallback.status = NotificationStatus.MOCK_SENT
                fallback.sent_at = datetime.utcnow()
                fallback.provider_response = "Mock SMS fallback"
            else:
                # Real SMS sending (v1.5)
                raise NotImplementedError("Real SMS sending not implemented")

        except Exception as e:
            logger.error(f"SMS fallback also failed for order {order_id}: {e}")
            fallback.status = NotificationStatus.FAILED
            fallback.error_message = str(e)

        self.db.commit()
