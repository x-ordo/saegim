# Server Tests

## Prerequisites

Tests require PostgreSQL with JSONB support. SQLite is not supported.

### Option 1: Docker (Recommended)

```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Create test database
docker-compose exec postgres psql -U prooflink -c "CREATE DATABASE prooflink_test;"

# Run tests
cd server
source venv/bin/activate
pytest
```

### Option 2: Local PostgreSQL

```bash
# Set test database URL
export TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/prooflink_test"

# Run tests
cd server
source venv/bin/activate
pytest
```

## Test Structure

```
tests/
├── conftest.py          # Pytest fixtures
├── api/                 # API endpoint tests
│   └── test_public.py   # Public API tests
└── services/            # Service layer tests
    ├── test_token_service.py
    ├── test_driver_service.py
    ├── test_courier_service.py
    └── test_product_service.py
```

## Running Tests

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/services/test_token_service.py

# Run with coverage
pytest --cov=src --cov-report=html

# Run only fast tests (exclude slow/integration)
pytest -m "not slow and not integration"
```

## Test Coverage

Target: 80%+ coverage for core services.
