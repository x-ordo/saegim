"""Add couriers and courier_sessions tables

Revision ID: 0009
Revises: 0008
Create Date: 2024-12-28
"""
from alembic import op
import sqlalchemy as sa


revision = "0009"
down_revision = "0008b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create couriers table
    op.create_table(
        "couriers",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("phone_encrypted", sa.Text(), nullable=True),
        sa.Column("pin_hash", sa.String(255), nullable=True),
        sa.Column("clerk_user_id", sa.String(100), nullable=True),
        sa.Column("vehicle_number", sa.String(20), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )

    # Create courier_sessions table
    op.create_table(
        "courier_sessions",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("courier_id", sa.Integer(), sa.ForeignKey("couriers.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("token", sa.String(255), nullable=False, unique=True, index=True),
        sa.Column("device_info", sa.String(255), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Create index on is_active for filtering
    op.create_index("ix_couriers_is_active", "couriers", ["is_active"])


def downgrade() -> None:
    op.drop_index("ix_couriers_is_active", table_name="couriers")
    op.drop_table("courier_sessions")
    op.drop_table("couriers")
