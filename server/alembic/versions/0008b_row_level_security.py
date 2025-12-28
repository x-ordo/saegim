"""Add Row Level Security for multi-tenant isolation.

Revision ID: 0008b
Revises: 0008
Create Date: 2024-12-22

This migration adds PostgreSQL Row Level Security (RLS) policies
to ensure data isolation between organizations in a multi-tenant setup.

Requirements:
- PostgreSQL 9.5+ (for RLS support)
- Application must set `app.current_org_id` before queries

Usage:
    SET app.current_org_id = '<organization_uuid>';
    -- All subsequent queries will be filtered by organization

Note: RLS is bypassed for superusers and table owners.
      For admin access, use a role with BYPASSRLS privilege.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0008b"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Skip RLS setup for SQLite (used in tests)
    connection = op.get_bind()
    if connection.dialect.name != "postgresql":
        return

    # Enable RLS on orders table
    op.execute("""
        ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
    """)

    # Create policy for orders - users can only see orders from their org
    op.execute("""
        CREATE POLICY orders_org_isolation ON orders
            USING (organization_id::text = current_setting('app.current_org_id', true));
    """)

    # Enable RLS on proofs table
    op.execute("""
        ALTER TABLE proofs ENABLE ROW LEVEL SECURITY;
    """)

    # Create policy for proofs - access through order's organization
    op.execute("""
        CREATE POLICY proofs_org_isolation ON proofs
            USING (
                order_id IN (
                    SELECT id FROM orders
                    WHERE organization_id::text = current_setting('app.current_org_id', true)
                )
            );
    """)

    # Enable RLS on qr_tokens table
    op.execute("""
        ALTER TABLE qr_tokens ENABLE ROW LEVEL SECURITY;
    """)

    # Create policy for qr_tokens - access through order's organization
    op.execute("""
        CREATE POLICY qr_tokens_org_isolation ON qr_tokens
            USING (
                order_id IN (
                    SELECT id FROM orders
                    WHERE organization_id::text = current_setting('app.current_org_id', true)
                )
            );
    """)

    # Enable RLS on notifications table
    op.execute("""
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    """)

    # Create policy for notifications - access through order's organization
    op.execute("""
        CREATE POLICY notifications_org_isolation ON notifications
            USING (
                order_id IN (
                    SELECT id FROM orders
                    WHERE organization_id::text = current_setting('app.current_org_id', true)
                )
            );
    """)

    # Enable RLS on short_links table
    op.execute("""
        ALTER TABLE short_links ENABLE ROW LEVEL SECURITY;
    """)

    # Create policy for short_links - access through order's organization
    op.execute("""
        CREATE POLICY short_links_org_isolation ON short_links
            USING (
                order_id IN (
                    SELECT id FROM orders
                    WHERE organization_id::text = current_setting('app.current_org_id', true)
                )
            );
    """)

    # Note: organizations table does NOT have RLS
    # Admin users can see all organizations


def downgrade() -> None:
    # Skip for non-PostgreSQL
    connection = op.get_bind()
    if connection.dialect.name != "postgresql":
        return

    # Drop policies
    op.execute("DROP POLICY IF EXISTS short_links_org_isolation ON short_links;")
    op.execute("DROP POLICY IF EXISTS notifications_org_isolation ON notifications;")
    op.execute("DROP POLICY IF EXISTS qr_tokens_org_isolation ON qr_tokens;")
    op.execute("DROP POLICY IF EXISTS proofs_org_isolation ON proofs;")
    op.execute("DROP POLICY IF EXISTS orders_org_isolation ON orders;")

    # Disable RLS
    op.execute("ALTER TABLE short_links DISABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE qr_tokens DISABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE proofs DISABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE orders DISABLE ROW LEVEL SECURITY;")
