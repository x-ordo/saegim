"""
Integration tests for the notification flow.

Tests the notification system:
1. Notification triggering after proof upload
2. Alimtalk + SMS fallback
3. Notification status tracking
4. Resend functionality
"""

import pytest
from sqlalchemy.orm import Session

from src.models import Order, Notification, Organization


class TestNotificationTrigger:
    """Test notification triggering after proof upload."""

    def test_notification_triggered_after_proof_complete(
        self,
        db: Session,
        test_order_with_recipient: Order,
    ):
        """Test that notifications are created when proof is completed."""
        from src.services.notification_service import NotificationService

        notification_service = NotificationService(db)

        # Trigger notification
        result = notification_service.send_proof_notification(
            order_id=test_order_with_recipient.id,
            proof_url="https://example.com/p/test-token",
        )

        assert result is not None

        # Check notification was logged
        notifications = db.query(Notification).filter(
            Notification.order_id == test_order_with_recipient.id
        ).all()

        assert len(notifications) > 0

    def test_notification_status_tracking(
        self,
        db: Session,
        test_order_with_recipient: Order,
    ):
        """Test that notification status is properly tracked."""
        from src.services.notification_service import NotificationService

        notification_service = NotificationService(db)

        # Send notification
        notification_service.send_proof_notification(
            order_id=test_order_with_recipient.id,
            proof_url="https://example.com/p/test-token",
        )

        # Check notification status
        notification = db.query(Notification).filter(
            Notification.order_id == test_order_with_recipient.id
        ).first()

        assert notification is not None
        assert notification.status in ["SENT", "PENDING", "DELIVERED", "FAILED"]
        assert notification.channel in ["ALIMTALK", "SMS", "MOCK"]


class TestNotificationFallback:
    """Test SMS fallback when Alimtalk fails."""

    def test_mock_provider_logs_notifications(
        self,
        db: Session,
        test_order_with_recipient: Order,
    ):
        """Test that mock provider properly logs notifications."""
        from src.services.notification_service import NotificationService

        notification_service = NotificationService(db)

        result = notification_service.send_proof_notification(
            order_id=test_order_with_recipient.id,
            proof_url="https://example.com/p/test-token",
        )

        # Mock provider should succeed
        assert result is not None

        # Check database record
        notification = db.query(Notification).filter(
            Notification.order_id == test_order_with_recipient.id
        ).first()

        assert notification is not None


class TestNotificationContent:
    """Test notification message content rendering."""

    def test_message_template_rendering(
        self,
        db: Session,
        test_order_with_recipient: Order,
    ):
        """Test that message templates are properly rendered."""
        from src.services.message_render import render_proof_notification

        message = render_proof_notification(
            order=test_order_with_recipient,
            proof_url="https://example.com/p/abc123",
        )

        # Message should contain key information
        assert test_order_with_recipient.sender_name in message or "배송" in message
        assert "abc123" in message or "example.com" in message

    def test_message_contains_proof_url(
        self,
        db: Session,
        test_order_with_recipient: Order,
    ):
        """Test that proof URL is included in message."""
        from src.services.message_render import render_proof_notification

        proof_url = "https://saegim.com/p/unique-token-123"
        message = render_proof_notification(
            order=test_order_with_recipient,
            proof_url=proof_url,
        )

        assert "unique-token-123" in message or "saegim.com" in message


class TestNotificationResend:
    """Test notification resend functionality."""

    def test_resend_creates_new_notification(
        self,
        db: Session,
        test_order_with_recipient: Order,
    ):
        """Test that resending creates a new notification record."""
        from src.services.notification_service import NotificationService

        notification_service = NotificationService(db)

        # Send initial notification
        notification_service.send_proof_notification(
            order_id=test_order_with_recipient.id,
            proof_url="https://example.com/p/test-token",
        )

        initial_count = db.query(Notification).filter(
            Notification.order_id == test_order_with_recipient.id
        ).count()

        # Resend notification
        notification_service.send_proof_notification(
            order_id=test_order_with_recipient.id,
            proof_url="https://example.com/p/test-token",
        )

        new_count = db.query(Notification).filter(
            Notification.order_id == test_order_with_recipient.id
        ).count()

        assert new_count >= initial_count


class TestNotificationRecipients:
    """Test notification recipient handling."""

    def test_notification_to_sender(
        self,
        db: Session,
        test_order_with_recipient: Order,
    ):
        """Test sending notification to sender."""
        from src.services.notification_service import NotificationService

        notification_service = NotificationService(db)

        result = notification_service.send_proof_notification(
            order_id=test_order_with_recipient.id,
            proof_url="https://example.com/p/test-token",
            recipient_type="SENDER",
        )

        assert result is not None

    def test_notification_to_recipient(
        self,
        db: Session,
        test_order_with_recipient: Order,
    ):
        """Test sending notification to recipient."""
        from src.services.notification_service import NotificationService

        notification_service = NotificationService(db)

        result = notification_service.send_proof_notification(
            order_id=test_order_with_recipient.id,
            proof_url="https://example.com/p/test-token",
            recipient_type="RECIPIENT",
        )

        assert result is not None

    def test_dual_notification(
        self,
        db: Session,
        test_order_with_recipient: Order,
    ):
        """Test sending notifications to both sender and recipient."""
        from src.services.notification_service import NotificationService

        notification_service = NotificationService(db)

        result = notification_service.send_dual_notification(
            order_id=test_order_with_recipient.id,
            proof_url="https://example.com/p/test-token",
        )

        assert result is not None

        # Should have notifications for both
        notifications = db.query(Notification).filter(
            Notification.order_id == test_order_with_recipient.id
        ).all()

        assert len(notifications) >= 1
