from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class ProductCategoryBase(BaseModel):
    """Base schema for product category."""
    name: str
    parent_id: Optional[int] = None
    sort_order: int = 0


class ProductCategoryCreate(ProductCategoryBase):
    """Schema for creating a new product category."""
    pass


class ProductCategoryUpdate(BaseModel):
    """Schema for updating a product category."""
    name: Optional[str] = None
    parent_id: Optional[int] = None
    sort_order: Optional[int] = None


class ProductCategoryResponse(ProductCategoryBase):
    """Schema for product category response."""
    id: int
    organization_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProductCategoryWithChildren(ProductCategoryResponse):
    """Schema for product category with children."""
    children: List["ProductCategoryWithChildren"] = []


class ProductBase(BaseModel):
    """Base schema for product."""
    name: str
    description: Optional[str] = None
    price: Optional[Decimal] = None
    sku: Optional[str] = None
    category_id: Optional[int] = None
    image_url: Optional[str] = None
    is_active: bool = True


class ProductCreate(ProductBase):
    """Schema for creating a new product."""
    pass


class ProductUpdate(BaseModel):
    """Schema for updating a product."""
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    sku: Optional[str] = None
    category_id: Optional[int] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None


class ProductResponse(ProductBase):
    """Schema for product response."""
    id: int
    organization_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProductWithCategory(ProductResponse):
    """Schema for product with category details."""
    category: Optional[ProductCategoryResponse] = None


class ProductListResponse(BaseModel):
    """Schema for product list response with pagination."""
    items: List[ProductResponse]
    total: int
    page: int
    page_size: int
