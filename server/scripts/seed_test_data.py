#!/usr/bin/env python3
"""
Seed script for test data.
Run this after DB migration to create test organization, order, and token.

Usage:
    cd server
    python scripts/seed_test_data.py
"""
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.core.database import SessionLocal, engine, Base
from src.core.security import encrypt_phone
from src.models import Organization, Order, QRToken, OrderStatus, PlanType
from src.services.token_service import TokenService


def seed_test_data():
    """Create test data for development."""
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # Check if test org already exists
        existing_org = db.query(Organization).filter(Organization.name == "태양꽃배달").first()
        if existing_org:
            print("Test data already exists. Skipping.")
            return

        # Create test organization
        org = Organization(
            name="태양꽃배달",
            plan_type=PlanType.PRO,
            logo_url=None,  # Add logo URL if available
        )
        db.add(org)
        db.flush()  # Get the org ID

        print(f"Created organization: {org.name} (ID: {org.id})")

        # Create test order
        order = Order(
            organization_id=org.id,
            order_number="SAEGIM-001",
            context="장례식장 3호실 근조화환",
            sender_name="홍길동",
            sender_phone_encrypted=encrypt_phone("+821012345678"),
            recipient_name="김철수",
            recipient_phone_encrypted=encrypt_phone("+821087654321"),
            status=OrderStatus.TOKEN_ISSUED,
        )
        db.add(order)
        db.flush()

        print(f"Created order: {order.order_number} (ID: {order.id})")

        # Create QR token
        token_service = TokenService(db)
        qr_token = QRToken(
            token="test123token",  # Fixed token for testing
            order_id=order.id,
            is_valid=True,
        )
        db.add(qr_token)

        db.commit()

        print(f"Created QR token: {qr_token.token}")
        print()
        print("=" * 50)
        print("Test data created successfully!")
        print("=" * 50)
        print()
        print("Test URLs:")
        print(f"  Proof Landing: http://localhost:3000/proof/{qr_token.token}")
        print(f"  API Order:     http://localhost:8000/public/order/{qr_token.token}")
        print()

    except Exception as e:
        db.rollback()
        print(f"Error creating test data: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_test_data()
