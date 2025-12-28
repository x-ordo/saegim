from __future__ import annotations

from typing import Optional, List

from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.models import Product, ProductCategory
from src.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductCategoryCreate,
    ProductCategoryUpdate,
)


class ProductService:
    """Product management service."""

    def __init__(self, db: Session):
        self.db = db

    # ---------------------------
    # Categories
    # ---------------------------
    def list_categories(
        self,
        organization_id: int,
        parent_id: Optional[int] = None,
    ) -> List[ProductCategory]:
        """List all categories for an organization."""
        q = self.db.query(ProductCategory).filter(
            ProductCategory.organization_id == organization_id
        )
        if parent_id is not None:
            q = q.filter(ProductCategory.parent_id == parent_id)
        return q.order_by(ProductCategory.sort_order, ProductCategory.name).all()

    def get_category(
        self,
        category_id: int,
        organization_id: int,
    ) -> ProductCategory:
        """Get a category by ID."""
        category = self.db.query(ProductCategory).filter(
            ProductCategory.id == category_id,
            ProductCategory.organization_id == organization_id,
        ).first()
        if not category:
            raise HTTPException(status_code=404, detail="CATEGORY_NOT_FOUND")
        return category

    def create_category(
        self,
        payload: ProductCategoryCreate,
        organization_id: int,
    ) -> ProductCategory:
        """Create a new category."""
        # Validate parent if provided
        if payload.parent_id:
            parent = self.db.query(ProductCategory).filter(
                ProductCategory.id == payload.parent_id,
                ProductCategory.organization_id == organization_id,
            ).first()
            if not parent:
                raise HTTPException(status_code=400, detail="PARENT_CATEGORY_NOT_FOUND")

        category = ProductCategory(
            organization_id=organization_id,
            name=payload.name.strip(),
            parent_id=payload.parent_id,
            sort_order=payload.sort_order,
        )
        self.db.add(category)
        try:
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=400, detail=f"CREATE_CATEGORY_FAILED: {e}") from e
        self.db.refresh(category)
        return category

    def update_category(
        self,
        category_id: int,
        payload: ProductCategoryUpdate,
        organization_id: int,
    ) -> ProductCategory:
        """Update a category."""
        category = self.get_category(category_id, organization_id)

        if payload.name is not None:
            category.name = payload.name.strip()
        if payload.parent_id is not None:
            # Validate parent
            if payload.parent_id != 0:
                parent = self.db.query(ProductCategory).filter(
                    ProductCategory.id == payload.parent_id,
                    ProductCategory.organization_id == organization_id,
                ).first()
                if not parent:
                    raise HTTPException(status_code=400, detail="PARENT_CATEGORY_NOT_FOUND")
                # Prevent circular reference
                if payload.parent_id == category_id:
                    raise HTTPException(status_code=400, detail="CIRCULAR_REFERENCE")
                category.parent_id = payload.parent_id
            else:
                category.parent_id = None
        if payload.sort_order is not None:
            category.sort_order = payload.sort_order

        try:
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=400, detail=f"UPDATE_CATEGORY_FAILED: {e}") from e
        self.db.refresh(category)
        return category

    def delete_category(
        self,
        category_id: int,
        organization_id: int,
    ) -> None:
        """Delete a category. Products will have their category_id set to NULL."""
        category = self.get_category(category_id, organization_id)
        try:
            self.db.delete(category)
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=400, detail=f"DELETE_CATEGORY_FAILED: {e}") from e

    # ---------------------------
    # Products
    # ---------------------------
    def list_products(
        self,
        organization_id: int,
        category_id: Optional[int] = None,
        is_active: Optional[bool] = None,
        q: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[List[Product], int]:
        """List products with optional filters and pagination."""
        query = self.db.query(Product).filter(
            Product.organization_id == organization_id
        )

        if category_id is not None:
            query = query.filter(Product.category_id == category_id)

        if is_active is not None:
            query = query.filter(Product.is_active == is_active)

        if q:
            like = f"%{q.strip()}%"
            query = query.filter(
                Product.name.ilike(like) | Product.sku.ilike(like)
            )

        # Count total
        total = query.count()

        # Paginate
        offset = (page - 1) * page_size
        products = query.order_by(Product.created_at.desc()).offset(offset).limit(page_size).all()

        return products, total

    def get_product(
        self,
        product_id: int,
        organization_id: int,
    ) -> Product:
        """Get a product by ID."""
        product = self.db.query(Product).filter(
            Product.id == product_id,
            Product.organization_id == organization_id,
        ).first()
        if not product:
            raise HTTPException(status_code=404, detail="PRODUCT_NOT_FOUND")
        return product

    def create_product(
        self,
        payload: ProductCreate,
        organization_id: int,
    ) -> Product:
        """Create a new product."""
        # Validate category if provided
        if payload.category_id:
            category = self.db.query(ProductCategory).filter(
                ProductCategory.id == payload.category_id,
                ProductCategory.organization_id == organization_id,
            ).first()
            if not category:
                raise HTTPException(status_code=400, detail="CATEGORY_NOT_FOUND")

        product = Product(
            organization_id=organization_id,
            name=payload.name.strip(),
            description=payload.description.strip() if payload.description else None,
            price=payload.price,
            sku=payload.sku.strip() if payload.sku else None,
            category_id=payload.category_id,
            image_url=payload.image_url.strip() if payload.image_url else None,
            is_active=payload.is_active,
        )
        self.db.add(product)
        try:
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=400, detail=f"CREATE_PRODUCT_FAILED: {e}") from e
        self.db.refresh(product)
        return product

    def update_product(
        self,
        product_id: int,
        payload: ProductUpdate,
        organization_id: int,
    ) -> Product:
        """Update a product."""
        product = self.get_product(product_id, organization_id)

        if payload.name is not None:
            product.name = payload.name.strip()
        if payload.description is not None:
            product.description = payload.description.strip() if payload.description else None
        if payload.price is not None:
            product.price = payload.price
        if payload.sku is not None:
            product.sku = payload.sku.strip() if payload.sku else None
        if payload.category_id is not None:
            if payload.category_id != 0:
                category = self.db.query(ProductCategory).filter(
                    ProductCategory.id == payload.category_id,
                    ProductCategory.organization_id == organization_id,
                ).first()
                if not category:
                    raise HTTPException(status_code=400, detail="CATEGORY_NOT_FOUND")
                product.category_id = payload.category_id
            else:
                product.category_id = None
        if payload.image_url is not None:
            product.image_url = payload.image_url.strip() if payload.image_url else None
        if payload.is_active is not None:
            product.is_active = payload.is_active

        try:
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=400, detail=f"UPDATE_PRODUCT_FAILED: {e}") from e
        self.db.refresh(product)
        return product

    def delete_product(
        self,
        product_id: int,
        organization_id: int,
    ) -> None:
        """Delete a product."""
        product = self.get_product(product_id, organization_id)
        try:
            self.db.delete(product)
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=400, detail=f"DELETE_PRODUCT_FAILED: {e}") from e
