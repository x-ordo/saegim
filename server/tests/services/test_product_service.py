"""
Tests for ProductService.
"""

import pytest
from decimal import Decimal
from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.services.product_service import ProductService
from src.models import Product, ProductCategory, Organization
from src.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductCategoryCreate,
    ProductCategoryUpdate,
)


@pytest.fixture
def test_category(db: Session, test_organization: Organization) -> ProductCategory:
    """Create a test category."""
    category = ProductCategory(
        organization_id=test_organization.id,
        name="Test Category",
        sort_order=0,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@pytest.fixture
def test_product(db: Session, test_organization: Organization, test_category: ProductCategory) -> Product:
    """Create a test product."""
    product = Product(
        organization_id=test_organization.id,
        name="Test Product",
        description="Test description",
        price=Decimal("10000"),
        sku="TEST-001",
        category_id=test_category.id,
        is_active=True,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


class TestListCategories:
    """Tests for ProductService.list_categories()"""

    def test_lists_categories(self, db: Session, test_organization: Organization, test_category: ProductCategory):
        """Should list categories for organization."""
        service = ProductService(db)

        result = service.list_categories(test_organization.id)

        assert len(result) >= 1
        assert any(c.name == "Test Category" for c in result)

    def test_filters_by_parent(self, db: Session, test_organization: Organization, test_category: ProductCategory):
        """Should filter by parent ID."""
        # Create child category
        child = ProductCategory(
            organization_id=test_organization.id,
            name="Child Category",
            parent_id=test_category.id,
        )
        db.add(child)
        db.commit()

        service = ProductService(db)

        result = service.list_categories(test_organization.id, parent_id=test_category.id)

        assert len(result) >= 1
        assert all(c.parent_id == test_category.id for c in result)


class TestGetCategory:
    """Tests for ProductService.get_category()"""

    def test_returns_existing_category(self, db: Session, test_organization: Organization, test_category: ProductCategory):
        """Should return existing category."""
        service = ProductService(db)

        result = service.get_category(test_category.id, test_organization.id)

        assert result.id == test_category.id
        assert result.name == "Test Category"

    def test_raises_404_for_nonexistent(self, db: Session, test_organization: Organization):
        """Should raise 404 for non-existent category."""
        service = ProductService(db)

        with pytest.raises(HTTPException) as exc:
            service.get_category(99999, test_organization.id)

        assert exc.value.status_code == 404
        assert exc.value.detail == "CATEGORY_NOT_FOUND"


class TestCreateCategory:
    """Tests for ProductService.create_category()"""

    def test_creates_category(self, db: Session, test_organization: Organization):
        """Should create category."""
        service = ProductService(db)

        payload = ProductCategoryCreate(
            name="New Category",
            sort_order=10,
        )

        result = service.create_category(payload, test_organization.id)

        assert result.name == "New Category"
        assert result.sort_order == 10
        assert result.organization_id == test_organization.id

    def test_creates_child_category(self, db: Session, test_organization: Organization, test_category: ProductCategory):
        """Should create child category with valid parent."""
        service = ProductService(db)

        payload = ProductCategoryCreate(
            name="Child Category",
            parent_id=test_category.id,
        )

        result = service.create_category(payload, test_organization.id)

        assert result.parent_id == test_category.id

    def test_rejects_invalid_parent(self, db: Session, test_organization: Organization):
        """Should reject invalid parent ID."""
        service = ProductService(db)

        payload = ProductCategoryCreate(
            name="Invalid Parent",
            parent_id=99999,
        )

        with pytest.raises(HTTPException) as exc:
            service.create_category(payload, test_organization.id)

        assert exc.value.status_code == 400
        assert "PARENT_CATEGORY_NOT_FOUND" in exc.value.detail


class TestUpdateCategory:
    """Tests for ProductService.update_category()"""

    def test_updates_category_name(self, db: Session, test_organization: Organization, test_category: ProductCategory):
        """Should update category name."""
        service = ProductService(db)

        payload = ProductCategoryUpdate(name="Updated Name")
        result = service.update_category(test_category.id, payload, test_organization.id)

        assert result.name == "Updated Name"

    def test_rejects_circular_reference(self, db: Session, test_organization: Organization, test_category: ProductCategory):
        """Should reject setting category as its own parent."""
        service = ProductService(db)

        payload = ProductCategoryUpdate(parent_id=test_category.id)

        with pytest.raises(HTTPException) as exc:
            service.update_category(test_category.id, payload, test_organization.id)

        assert exc.value.status_code == 400
        assert "CIRCULAR_REFERENCE" in exc.value.detail


class TestDeleteCategory:
    """Tests for ProductService.delete_category()"""

    def test_deletes_category(self, db: Session, test_organization: Organization):
        """Should delete category."""
        category = ProductCategory(
            organization_id=test_organization.id,
            name="To Delete",
        )
        db.add(category)
        db.commit()
        db.refresh(category)
        category_id = category.id

        service = ProductService(db)

        service.delete_category(category_id, test_organization.id)

        # Verify deleted
        found = db.query(ProductCategory).filter(ProductCategory.id == category_id).first()
        assert found is None


class TestListProducts:
    """Tests for ProductService.list_products()"""

    def test_lists_products(self, db: Session, test_organization: Organization, test_product: Product):
        """Should list products for organization."""
        service = ProductService(db)

        items, total = service.list_products(test_organization.id)

        assert total >= 1
        assert any(p.name == "Test Product" for p in items)

    def test_filters_by_category(self, db: Session, test_organization: Organization, test_product: Product, test_category: ProductCategory):
        """Should filter by category."""
        service = ProductService(db)

        items, total = service.list_products(test_organization.id, category_id=test_category.id)

        assert all(p.category_id == test_category.id for p in items)

    def test_filters_by_active_status(self, db: Session, test_organization: Organization, test_product: Product):
        """Should filter by active status."""
        # Create inactive product
        inactive = Product(
            organization_id=test_organization.id,
            name="Inactive Product",
            is_active=False,
        )
        db.add(inactive)
        db.commit()

        service = ProductService(db)

        items, _ = service.list_products(test_organization.id, is_active=True)

        assert all(p.is_active for p in items)

    def test_search_by_name(self, db: Session, test_organization: Organization, test_product: Product):
        """Should search by name."""
        service = ProductService(db)

        items, total = service.list_products(test_organization.id, q="Test Product")

        assert total >= 1
        assert any("Test Product" in p.name for p in items)

    def test_search_by_sku(self, db: Session, test_organization: Organization, test_product: Product):
        """Should search by SKU."""
        service = ProductService(db)

        items, total = service.list_products(test_organization.id, q="TEST-001")

        assert total >= 1

    def test_pagination(self, db: Session, test_organization: Organization):
        """Should paginate results."""
        # Create multiple products
        for i in range(5):
            db.add(Product(
                organization_id=test_organization.id,
                name=f"Paginated Product {i}",
                is_active=True,
            ))
        db.commit()

        service = ProductService(db)

        items, total = service.list_products(test_organization.id, page=1, page_size=2)

        assert len(items) == 2
        assert total >= 5


class TestGetProduct:
    """Tests for ProductService.get_product()"""

    def test_returns_existing_product(self, db: Session, test_organization: Organization, test_product: Product):
        """Should return existing product."""
        service = ProductService(db)

        result = service.get_product(test_product.id, test_organization.id)

        assert result.id == test_product.id
        assert result.name == "Test Product"

    def test_raises_404_for_nonexistent(self, db: Session, test_organization: Organization):
        """Should raise 404 for non-existent product."""
        service = ProductService(db)

        with pytest.raises(HTTPException) as exc:
            service.get_product(99999, test_organization.id)

        assert exc.value.status_code == 404
        assert exc.value.detail == "PRODUCT_NOT_FOUND"


class TestCreateProduct:
    """Tests for ProductService.create_product()"""

    def test_creates_product(self, db: Session, test_organization: Organization, test_category: ProductCategory):
        """Should create product."""
        service = ProductService(db)

        payload = ProductCreate(
            name="New Product",
            description="New description",
            price=Decimal("15000"),
            sku="NEW-001",
            category_id=test_category.id,
            is_active=True,
        )

        result = service.create_product(payload, test_organization.id)

        assert result.name == "New Product"
        assert result.price == Decimal("15000")
        assert result.sku == "NEW-001"
        assert result.category_id == test_category.id

    def test_creates_product_without_category(self, db: Session, test_organization: Organization):
        """Should create product without category."""
        service = ProductService(db)

        payload = ProductCreate(
            name="No Category Product",
            is_active=True,
        )

        result = service.create_product(payload, test_organization.id)

        assert result.name == "No Category Product"
        assert result.category_id is None

    def test_rejects_invalid_category(self, db: Session, test_organization: Organization):
        """Should reject invalid category ID."""
        service = ProductService(db)

        payload = ProductCreate(
            name="Invalid Category",
            category_id=99999,
        )

        with pytest.raises(HTTPException) as exc:
            service.create_product(payload, test_organization.id)

        assert exc.value.status_code == 400
        assert "CATEGORY_NOT_FOUND" in exc.value.detail


class TestUpdateProduct:
    """Tests for ProductService.update_product()"""

    def test_updates_product_name(self, db: Session, test_organization: Organization, test_product: Product):
        """Should update product name."""
        service = ProductService(db)

        payload = ProductUpdate(name="Updated Name")
        result = service.update_product(test_product.id, payload, test_organization.id)

        assert result.name == "Updated Name"

    def test_updates_product_price(self, db: Session, test_organization: Organization, test_product: Product):
        """Should update product price."""
        service = ProductService(db)

        payload = ProductUpdate(price=Decimal("20000"))
        result = service.update_product(test_product.id, payload, test_organization.id)

        assert result.price == Decimal("20000")

    def test_clears_category(self, db: Session, test_organization: Organization, test_product: Product):
        """Should clear category when set to 0."""
        service = ProductService(db)

        payload = ProductUpdate(category_id=0)
        result = service.update_product(test_product.id, payload, test_organization.id)

        assert result.category_id is None


class TestDeleteProduct:
    """Tests for ProductService.delete_product()"""

    def test_deletes_product(self, db: Session, test_organization: Organization):
        """Should delete product."""
        product = Product(
            organization_id=test_organization.id,
            name="To Delete",
            is_active=True,
        )
        db.add(product)
        db.commit()
        db.refresh(product)
        product_id = product.id

        service = ProductService(db)

        service.delete_product(product_id, test_organization.id)

        # Verify deleted
        found = db.query(Product).filter(Product.id == product_id).first()
        assert found is None

    def test_raises_404_for_nonexistent(self, db: Session, test_organization: Organization):
        """Should raise 404 for non-existent product."""
        service = ProductService(db)

        with pytest.raises(HTTPException) as exc:
            service.delete_product(99999, test_organization.id)

        assert exc.value.status_code == 404
