"""order asset meta

Revision ID: 0007
Revises: 0006
Create Date: 2025-12-21

Adds JSONB asset_meta column to orders table for storing
asset metadata (brand, model, serial, material, repair_note, etc.)
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add asset_meta JSONB column
    op.add_column(
        "orders",
        sa.Column("asset_meta", JSONB, nullable=True)
    )

    # 2. Create GIN index for efficient JSONB queries
    op.create_index(
        "ix_orders_asset_meta",
        "orders",
        ["asset_meta"],
        postgresql_using="gin"
    )


def downgrade() -> None:
    op.drop_index("ix_orders_asset_meta", table_name="orders")
    op.drop_column("orders", "asset_meta")
