from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Numeric, Text, func
from sqlalchemy.orm import relationship

from src.core.database import Base


class ProductCategory(Base):
    """
    Product category model.
    Supports hierarchical categories with parent-child relationship.
    """
    __tablename__ = "product_categories"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    parent_id = Column(Integer, ForeignKey("product_categories.id"), nullable=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="product_categories")
    parent = relationship("ProductCategory", remote_side=[id], backref="children")
    products = relationship("Product", back_populates="category")


class Product(Base):
    """
    Product model.
    Represents a product (e.g., flower wreath) that can be ordered.
    """
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("product_categories.id"), nullable=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=True)
    sku = Column(String(50), nullable=True)
    image_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="products")
    category = relationship("ProductCategory", back_populates="products")
