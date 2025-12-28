"""Product management API routes.

Phase 1: Product Management
- CRUD for products
- CRUD for product categories
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from src.api.deps import AuthContext, get_auth_context, get_db
from src.services.product_service import ProductService
from src.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductListResponse,
    ProductCategoryCreate,
    ProductCategoryUpdate,
    ProductCategoryResponse,
)


router = APIRouter(prefix="/admin/products", tags=["products"])


# ---------------------------
# Categories
# ---------------------------
@router.get("/categories", response_model=List[ProductCategoryResponse])
def list_categories(
    parent_id: Optional[int] = Query(None, description="Filter by parent category"),
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """List all product categories for the organization."""
    if ctx.organization_id is None:
        raise HTTPException(status_code=403, detail="ORG_REQUIRED")
    return ProductService(db).list_categories(
        organization_id=ctx.organization_id,
        parent_id=parent_id,
    )


@router.get("/categories/{category_id}", response_model=ProductCategoryResponse)
def get_category(
    category_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Get a product category by ID."""
    if ctx.organization_id is None:
        raise HTTPException(status_code=403, detail="ORG_REQUIRED")
    return ProductService(db).get_category(
        category_id=category_id,
        organization_id=ctx.organization_id,
    )


@router.post("/categories", response_model=ProductCategoryResponse)
def create_category(
    payload: ProductCategoryCreate,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Create a new product category."""
    if ctx.organization_id is None:
        raise HTTPException(status_code=403, detail="ORG_REQUIRED")
    return ProductService(db).create_category(
        payload=payload,
        organization_id=ctx.organization_id,
    )


@router.put("/categories/{category_id}", response_model=ProductCategoryResponse)
def update_category(
    category_id: int,
    payload: ProductCategoryUpdate,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Update a product category."""
    if ctx.organization_id is None:
        raise HTTPException(status_code=403, detail="ORG_REQUIRED")
    return ProductService(db).update_category(
        category_id=category_id,
        payload=payload,
        organization_id=ctx.organization_id,
    )


@router.delete("/categories/{category_id}")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Delete a product category."""
    if ctx.organization_id is None:
        raise HTTPException(status_code=403, detail="ORG_REQUIRED")
    ProductService(db).delete_category(
        category_id=category_id,
        organization_id=ctx.organization_id,
    )
    return {"status": "ok"}


# ---------------------------
# Products
# ---------------------------
@router.get("", response_model=ProductListResponse)
def list_products(
    category_id: Optional[int] = Query(None, description="Filter by category"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    q: Optional[str] = Query(None, description="Search by name or SKU"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """List products with filtering and pagination."""
    if ctx.organization_id is None:
        raise HTTPException(status_code=403, detail="ORG_REQUIRED")
    products, total = ProductService(db).list_products(
        organization_id=ctx.organization_id,
        category_id=category_id,
        is_active=is_active,
        q=q,
        page=page,
        page_size=page_size,
    )
    return ProductListResponse(
        items=products,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Get a product by ID."""
    if ctx.organization_id is None:
        raise HTTPException(status_code=403, detail="ORG_REQUIRED")
    return ProductService(db).get_product(
        product_id=product_id,
        organization_id=ctx.organization_id,
    )


@router.post("", response_model=ProductResponse)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Create a new product."""
    if ctx.organization_id is None:
        raise HTTPException(status_code=403, detail="ORG_REQUIRED")
    return ProductService(db).create_product(
        payload=payload,
        organization_id=ctx.organization_id,
    )


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Update a product."""
    if ctx.organization_id is None:
        raise HTTPException(status_code=403, detail="ORG_REQUIRED")
    return ProductService(db).update_product(
        product_id=product_id,
        payload=payload,
        organization_id=ctx.organization_id,
    )


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    ctx: AuthContext = Depends(get_auth_context),
):
    """Delete a product."""
    if ctx.organization_id is None:
        raise HTTPException(status_code=403, detail="ORG_REQUIRED")
    ProductService(db).delete_product(
        product_id=product_id,
        organization_id=ctx.organization_id,
    )
    return {"status": "ok"}
