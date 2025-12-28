"""
Pytest fixtures for Saegim API tests.
"""

import os
import pytest
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from fastapi.testclient import TestClient

# Set test environment before importing app
os.environ["APP_ENV"] = "test"
os.environ["POSTGRES_DB"] = "prooflink_test"
os.environ["JWT_SECRET"] = "test-jwt-secret-key-at-least-32-chars!"
os.environ["ENCRYPTION_KEY"] = "12345678901234567890123456789012"  # Exactly 32 bytes
os.environ["ADMIN_API_KEY"] = "test-admin-api-key-secure"
os.environ["MESSAGING_PROVIDER"] = "mock"

from src.api.main import app
from src.core.database import Base, get_db
from src.models import (
    Organization,
    Order,
    QRToken,
    Proof,
    Notification,
    Courier,
    CourierSession,
    Product,
    ProductCategory,
)


# Test database URL (use PostgreSQL to support JSONB columns)
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://prooflink:prooflink@localhost:5432/prooflink_test"
)

# Create test engine
engine = create_engine(TEST_DATABASE_URL)

# Create test session factory
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for tests."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Override the dependency
app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Create all tables before tests, drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db() -> Generator[Session, None, None]:
    """Get a test database session."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        # Clean up after each test
        db.rollback()
        db.close()


@pytest.fixture(scope="function")
def client() -> Generator[TestClient, None, None]:
    """Get a test client."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
def test_organization(db: Session) -> Organization:
    """Create a test organization."""
    org = Organization(
        name="Test Organization",
        brand_name="TestBrand",
        slug="test-org",
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


@pytest.fixture
def test_order(db: Session, test_organization: Organization) -> Order:
    """Create a test order."""
    from src.core.security import encrypt_phone

    order = Order(
        organization_id=test_organization.id,
        order_number="TEST-001",
        sender_name="Test Sender",
        sender_phone_encrypted=encrypt_phone("+821012345678"),
        context="Test context",
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@pytest.fixture
def test_token(db: Session, test_order: Order) -> QRToken:
    """Create a test QR token."""
    import secrets

    token = QRToken(
        order_id=test_order.id,
        token=secrets.token_urlsafe(12),
        is_valid=True,
    )
    db.add(token)
    db.commit()
    db.refresh(token)
    return token


@pytest.fixture
def admin_headers() -> dict:
    """Get admin API headers."""
    return {"X-API-Key": os.environ["ADMIN_API_KEY"]}
