"""
Tests for CourierService.
"""

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from src.services.courier_service import CourierService, _mask_phone
from src.models import Courier, Organization
from src.schemas.courier import CourierCreate, CourierUpdate
from src.core.security import encrypt_phone

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TestMaskPhone:
    """Tests for _mask_phone helper function."""

    def test_masks_korean_phone(self):
        """Should mask Korean phone number."""
        result = _mask_phone("+821012345678")
        assert result == "010-****-5678"

    def test_masks_local_format(self):
        """Should mask local format phone."""
        result = _mask_phone("01012345678")
        assert result == "010-****-5678"

    def test_handles_empty(self):
        """Should handle empty phone."""
        assert _mask_phone("") == ""

    def test_handles_short_phone(self):
        """Should handle short phone numbers."""
        result = _mask_phone("5678")
        assert "5678" in result


class TestListCouriers:
    """Tests for CourierService.list_couriers()"""

    def test_lists_couriers_for_organization(self, db: Session, test_organization: Organization):
        """Should list couriers for organization."""
        # Create test courier
        courier = Courier(
            organization_id=test_organization.id,
            name="Test Courier",
            is_active=True,
        )
        db.add(courier)
        db.commit()

        service = CourierService(db)

        items, total = service.list_couriers(test_organization.id)

        assert total >= 1
        assert any(item.name == "Test Courier" for item in items)

    def test_filters_by_active_status(self, db: Session, test_organization: Organization):
        """Should filter by active status."""
        # Create active courier
        active = Courier(
            organization_id=test_organization.id,
            name="Active Courier",
            is_active=True,
        )
        # Create inactive courier
        inactive = Courier(
            organization_id=test_organization.id,
            name="Inactive Courier",
            is_active=False,
        )
        db.add_all([active, inactive])
        db.commit()

        service = CourierService(db)

        # Filter active only
        items, _ = service.list_couriers(test_organization.id, is_active=True)
        assert all(item.is_active for item in items)

        # Filter inactive only
        items, _ = service.list_couriers(test_organization.id, is_active=False)
        assert all(not item.is_active for item in items)

    def test_search_by_name(self, db: Session, test_organization: Organization):
        """Should search by name."""
        courier = Courier(
            organization_id=test_organization.id,
            name="UniqueSearchName",
            is_active=True,
        )
        db.add(courier)
        db.commit()

        service = CourierService(db)

        items, total = service.list_couriers(test_organization.id, q="UniqueSearch")

        assert total >= 1
        assert any("UniqueSearch" in item.name for item in items)

    def test_pagination(self, db: Session, test_organization: Organization):
        """Should paginate results."""
        # Create 5 couriers
        for i in range(5):
            db.add(Courier(
                organization_id=test_organization.id,
                name=f"Courier {i}",
                is_active=True,
            ))
        db.commit()

        service = CourierService(db)

        # Get first page with 2 items
        items, total = service.list_couriers(test_organization.id, page=1, page_size=2)

        assert len(items) == 2
        assert total >= 5


class TestGetCourier:
    """Tests for CourierService.get_courier()"""

    def test_returns_existing_courier(self, db: Session, test_organization: Organization):
        """Should return existing courier."""
        courier = Courier(
            organization_id=test_organization.id,
            name="Test Courier",
            is_active=True,
        )
        db.add(courier)
        db.commit()
        db.refresh(courier)

        service = CourierService(db)

        result = service.get_courier(courier.id, test_organization.id)

        assert result.id == courier.id
        assert result.name == "Test Courier"

    def test_raises_404_for_nonexistent(self, db: Session, test_organization: Organization):
        """Should raise 404 for non-existent courier."""
        service = CourierService(db)

        with pytest.raises(HTTPException) as exc:
            service.get_courier(99999, test_organization.id)

        assert exc.value.status_code == 404
        assert exc.value.detail == "COURIER_NOT_FOUND"

    def test_raises_404_for_wrong_organization(self, db: Session, test_organization: Organization):
        """Should raise 404 for courier from different org."""
        courier = Courier(
            organization_id=test_organization.id,
            name="Test Courier",
            is_active=True,
        )
        db.add(courier)
        db.commit()
        db.refresh(courier)

        service = CourierService(db)

        with pytest.raises(HTTPException) as exc:
            service.get_courier(courier.id, 99999)

        assert exc.value.status_code == 404


class TestCreateCourier:
    """Tests for CourierService.create_courier()"""

    def test_creates_courier(self, db: Session, test_organization: Organization):
        """Should create courier."""
        service = CourierService(db)

        payload = CourierCreate(
            name="New Courier",
            phone="010-1234-5678",
            pin="1234",
            vehicle_number="12가3456",
            is_active=True,
        )

        result = service.create_courier(payload, test_organization.id)

        assert result.name == "New Courier"
        assert result.vehicle_number == "12가3456"
        assert result.is_active is True
        assert result.has_pin is True
        assert "****" in result.phone_masked

    def test_creates_courier_without_phone(self, db: Session, test_organization: Organization):
        """Should create courier without phone."""
        service = CourierService(db)

        payload = CourierCreate(
            name="No Phone Courier",
            is_active=True,
        )

        result = service.create_courier(payload, test_organization.id)

        assert result.name == "No Phone Courier"
        assert result.phone_masked is None


class TestUpdateCourier:
    """Tests for CourierService.update_courier()"""

    def test_updates_courier_name(self, db: Session, test_organization: Organization):
        """Should update courier name."""
        courier = Courier(
            organization_id=test_organization.id,
            name="Old Name",
            is_active=True,
        )
        db.add(courier)
        db.commit()
        db.refresh(courier)

        service = CourierService(db)

        payload = CourierUpdate(name="New Name")
        result = service.update_courier(courier.id, payload, test_organization.id)

        assert result.name == "New Name"

    def test_updates_courier_status(self, db: Session, test_organization: Organization):
        """Should update courier active status."""
        courier = Courier(
            organization_id=test_organization.id,
            name="Test Courier",
            is_active=True,
        )
        db.add(courier)
        db.commit()
        db.refresh(courier)

        service = CourierService(db)

        payload = CourierUpdate(is_active=False)
        result = service.update_courier(courier.id, payload, test_organization.id)

        assert result.is_active is False


class TestUpdateCourierPin:
    """Tests for CourierService.update_courier_pin()"""

    def test_updates_pin(self, db: Session, test_organization: Organization):
        """Should update courier PIN."""
        courier = Courier(
            organization_id=test_organization.id,
            name="Test Courier",
            is_active=True,
        )
        db.add(courier)
        db.commit()
        db.refresh(courier)

        service = CourierService(db)

        result = service.update_courier_pin(courier.id, "9999", test_organization.id)

        assert result.has_pin is True

        # Verify PIN works
        db.refresh(courier)
        assert pwd_context.verify("9999", courier.pin_hash)


class TestDeleteCourier:
    """Tests for CourierService.delete_courier()"""

    def test_deletes_courier(self, db: Session, test_organization: Organization):
        """Should delete courier."""
        courier = Courier(
            organization_id=test_organization.id,
            name="To Delete",
            is_active=True,
        )
        db.add(courier)
        db.commit()
        db.refresh(courier)
        courier_id = courier.id

        service = CourierService(db)

        service.delete_courier(courier_id, test_organization.id)

        # Verify deleted
        found = db.query(Courier).filter(Courier.id == courier_id).first()
        assert found is None

    def test_raises_404_for_nonexistent(self, db: Session, test_organization: Organization):
        """Should raise 404 for non-existent courier."""
        service = CourierService(db)

        with pytest.raises(HTTPException) as exc:
            service.delete_courier(99999, test_organization.id)

        assert exc.value.status_code == 404


class TestVerifyPin:
    """Tests for CourierService.verify_pin()"""

    def test_verifies_correct_pin(self, db: Session, test_organization: Organization):
        """Should return True for correct PIN."""
        courier = Courier(
            organization_id=test_organization.id,
            name="Test Courier",
            pin_hash=pwd_context.hash("1234"),
            is_active=True,
        )
        db.add(courier)
        db.commit()
        db.refresh(courier)

        service = CourierService(db)

        assert service.verify_pin(courier, "1234") is True

    def test_rejects_wrong_pin(self, db: Session, test_organization: Organization):
        """Should return False for wrong PIN."""
        courier = Courier(
            organization_id=test_organization.id,
            name="Test Courier",
            pin_hash=pwd_context.hash("1234"),
            is_active=True,
        )
        db.add(courier)
        db.commit()
        db.refresh(courier)

        service = CourierService(db)

        assert service.verify_pin(courier, "9999") is False

    def test_returns_false_for_no_pin(self, db: Session, test_organization: Organization):
        """Should return False when no PIN set."""
        courier = Courier(
            organization_id=test_organization.id,
            name="Test Courier",
            pin_hash=None,
            is_active=True,
        )
        db.add(courier)
        db.commit()
        db.refresh(courier)

        service = CourierService(db)

        assert service.verify_pin(courier, "1234") is False
