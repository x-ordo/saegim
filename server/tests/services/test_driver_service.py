"""
Tests for DriverService.
"""

import pytest
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from src.services.driver_service import DriverService, _mask_phone
from src.models import Courier, CourierSession, Order, OrderStatus, Organization
from src.core.security import encrypt_phone

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TestMaskPhone:
    """Tests for _mask_phone helper function."""

    def test_masks_standard_korean_phone(self):
        """Should mask standard Korean phone number."""
        result = _mask_phone("+821012345678")
        assert result == "010-****-5678"

    def test_masks_local_format_phone(self):
        """Should mask local format phone number."""
        result = _mask_phone("01012345678")
        assert result == "010-****-5678"

    def test_handles_empty_phone(self):
        """Should return empty string for empty input."""
        result = _mask_phone("")
        assert result == ""

    def test_handles_none_phone(self):
        """Should return empty string for None."""
        result = _mask_phone(None)
        assert result == ""

    def test_handles_short_phone(self):
        """Should handle short phone numbers gracefully."""
        result = _mask_phone("1234")
        assert "1234" in result


@pytest.fixture
def test_courier(db: Session, test_organization: Organization) -> Courier:
    """Create a test courier with PIN."""
    courier = Courier(
        organization_id=test_organization.id,
        name="Test Driver",
        phone_encrypted=encrypt_phone("+821012345678"),
        pin_hash=pwd_context.hash("1234"),
        is_active=True,
    )
    db.add(courier)
    db.commit()
    db.refresh(courier)
    return courier


@pytest.fixture
def test_courier_session(db: Session, test_courier: Courier) -> CourierSession:
    """Create a test courier session."""
    session = CourierSession(
        courier_id=test_courier.id,
        token="test-session-token",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


class TestLoginWithPin:
    """Tests for DriverService.login_with_pin()"""

    def test_successful_login(self, db: Session, test_courier: Courier):
        """Should return session token for valid credentials."""
        service = DriverService(db)

        result = service.login_with_pin(
            phone="010-1234-5678",
            pin="1234",
        )

        assert result.token is not None
        assert result.courier_id == test_courier.id
        assert result.courier_name == test_courier.name
        assert result.expires_at > datetime.now(timezone.utc)

    def test_login_with_international_format(self, db: Session, test_courier: Courier):
        """Should accept international phone format."""
        service = DriverService(db)

        result = service.login_with_pin(
            phone="+82-10-1234-5678",
            pin="1234",
        )

        assert result.token is not None

    def test_invalid_phone_format(self, db: Session, test_courier: Courier):
        """Should reject invalid phone format."""
        service = DriverService(db)

        with pytest.raises(HTTPException) as exc:
            service.login_with_pin(
                phone="invalid",
                pin="1234",
            )

        assert exc.value.status_code == 400
        assert exc.value.detail == "INVALID_PHONE"

    def test_wrong_pin(self, db: Session, test_courier: Courier):
        """Should reject wrong PIN."""
        service = DriverService(db)

        with pytest.raises(HTTPException) as exc:
            service.login_with_pin(
                phone="010-1234-5678",
                pin="9999",
            )

        assert exc.value.status_code == 401
        assert exc.value.detail == "INVALID_CREDENTIALS"

    def test_nonexistent_phone(self, db: Session, test_courier: Courier):
        """Should reject non-existent phone."""
        service = DriverService(db)

        with pytest.raises(HTTPException) as exc:
            service.login_with_pin(
                phone="010-9999-9999",
                pin="1234",
            )

        assert exc.value.status_code == 401
        assert exc.value.detail == "INVALID_CREDENTIALS"

    def test_inactive_courier(self, db: Session, test_courier: Courier):
        """Should reject inactive courier."""
        test_courier.is_active = False
        db.commit()

        service = DriverService(db)

        with pytest.raises(HTTPException) as exc:
            service.login_with_pin(
                phone="010-1234-5678",
                pin="1234",
            )

        assert exc.value.status_code == 401


class TestValidateSession:
    """Tests for DriverService.validate_session()"""

    def test_valid_session(self, db: Session, test_courier_session: CourierSession, test_courier: Courier):
        """Should return courier and org for valid session."""
        service = DriverService(db)

        courier, org = service.validate_session(test_courier_session.token)

        assert courier.id == test_courier.id
        assert org.id == test_courier.organization_id

    def test_expired_session(self, db: Session, test_courier_session: CourierSession):
        """Should reject expired session."""
        test_courier_session.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
        db.commit()

        service = DriverService(db)

        with pytest.raises(HTTPException) as exc:
            service.validate_session(test_courier_session.token)

        assert exc.value.status_code == 401
        assert exc.value.detail == "SESSION_EXPIRED"

    def test_invalid_session_token(self, db: Session):
        """Should reject invalid session token."""
        service = DriverService(db)

        with pytest.raises(HTTPException) as exc:
            service.validate_session("invalid-token")

        assert exc.value.status_code == 401

    def test_inactive_courier_session(self, db: Session, test_courier_session: CourierSession, test_courier: Courier):
        """Should reject session for inactive courier."""
        test_courier.is_active = False
        db.commit()

        service = DriverService(db)

        with pytest.raises(HTTPException) as exc:
            service.validate_session(test_courier_session.token)

        assert exc.value.status_code == 401
        assert exc.value.detail == "COURIER_INACTIVE"


class TestGetMe:
    """Tests for DriverService.get_me()"""

    def test_returns_courier_info(self, db: Session, test_courier: Courier, test_organization: Organization):
        """Should return courier info with masked phone."""
        service = DriverService(db)

        result = service.get_me(test_courier, test_organization)

        assert result.courier_id == test_courier.id
        assert result.name == test_courier.name
        assert result.organization_id == test_organization.id
        assert "****" in result.phone_masked  # Should be masked


class TestListDeliveries:
    """Tests for DriverService.list_deliveries()"""

    def test_lists_deliveries_for_organization(self, db: Session, test_organization: Organization, test_order: Order):
        """Should list deliveries for the organization."""
        service = DriverService(db)

        result = service.list_deliveries(test_organization.id, today_only=False)

        assert result.total >= 1
        assert any(item.id == test_order.id for item in result.items)

    def test_counts_by_status(self, db: Session, test_organization: Organization, test_order: Order):
        """Should count deliveries by status."""
        service = DriverService(db)

        result = service.list_deliveries(test_organization.id, today_only=False)

        assert isinstance(result.pending_count, int)
        assert isinstance(result.in_progress_count, int)
        assert isinstance(result.completed_count, int)

    def test_filters_by_status(self, db: Session, test_organization: Organization, test_order: Order):
        """Should filter by status."""
        service = DriverService(db)

        result = service.list_deliveries(
            test_organization.id,
            today_only=False,
            status_filter="PENDING",
        )

        for item in result.items:
            assert item.status == "PENDING"


class TestGetDeliveryDetail:
    """Tests for DriverService.get_delivery_detail()"""

    def test_returns_delivery_detail(self, db: Session, test_organization: Organization, test_order: Order):
        """Should return delivery detail."""
        service = DriverService(db)

        result = service.get_delivery_detail(test_order.id, test_organization.id)

        assert result.id == test_order.id
        assert result.order_number == test_order.order_number

    def test_raises_404_for_nonexistent_order(self, db: Session, test_organization: Organization):
        """Should raise 404 for non-existent order."""
        service = DriverService(db)

        with pytest.raises(HTTPException) as exc:
            service.get_delivery_detail(99999, test_organization.id)

        assert exc.value.status_code == 404
        assert exc.value.detail == "ORDER_NOT_FOUND"

    def test_raises_404_for_wrong_organization(self, db: Session, test_order: Order):
        """Should raise 404 for order from different organization."""
        service = DriverService(db)

        with pytest.raises(HTTPException) as exc:
            service.get_delivery_detail(test_order.id, 99999)

        assert exc.value.status_code == 404


class TestLogout:
    """Tests for DriverService.logout()"""

    def test_deletes_session(self, db: Session, test_courier_session: CourierSession):
        """Should delete the session."""
        service = DriverService(db)

        service.logout(test_courier_session.token)

        # Verify session is deleted
        found = db.query(CourierSession).filter(
            CourierSession.token == test_courier_session.token
        ).first()
        assert found is None

    def test_handles_invalid_token_gracefully(self, db: Session):
        """Should handle invalid token without error."""
        service = DriverService(db)

        # Should not raise
        service.logout("invalid-token")
