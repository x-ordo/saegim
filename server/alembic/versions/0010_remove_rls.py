"""Remove Row Level Security (tech debt cleanup).

Revision ID: 0010
Revises: 0009
Create Date: 2024-12-31

CTO Feedback: RLS was over-engineering for MVP.
- Session variable `app.current_org_id` was never set in application code
- Application-level org_id filtering is sufficient
- Tests use SQLite (RLS never tested)
- Removing to reduce complexity

Multi-tenant isolation is maintained via:
- AuthContext.organization_id in deps.py
- Manual `.filter(organization_id == ...)` in service layer
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Skip for non-PostgreSQL (SQLite in tests)
    connection = op.get_bind()
    if connection.dialect.name != "postgresql":
        return

    # Drop all RLS policies
    op.execute("DROP POLICY IF EXISTS orders_org_isolation ON orders;")
    op.execute("DROP POLICY IF EXISTS proofs_org_isolation ON proofs;")
    op.execute("DROP POLICY IF EXISTS qr_tokens_org_isolation ON qr_tokens;")
    op.execute("DROP POLICY IF EXISTS notifications_org_isolation ON notifications;")
    op.execute("DROP POLICY IF EXISTS short_links_org_isolation ON short_links;")

    # Disable RLS on all tables
    op.execute("ALTER TABLE orders DISABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE proofs DISABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE qr_tokens DISABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE short_links DISABLE ROW LEVEL SECURITY;")


def downgrade() -> None:
    # Re-enable RLS (not recommended, but provided for rollback)
    connection = op.get_bind()
    if connection.dialect.name != "postgresql":
        return

    # Enable RLS
    op.execute("ALTER TABLE orders ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE proofs ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE qr_tokens ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE short_links ENABLE ROW LEVEL SECURITY;")

    # Recreate policies
    op.execute("""
        CREATE POLICY orders_org_isolation ON orders
            USING (organization_id::text = current_setting('app.current_org_id', true));
    """)
    op.execute("""
        CREATE POLICY proofs_org_isolation ON proofs
            USING (order_id IN (SELECT id FROM orders WHERE organization_id::text = current_setting('app.current_org_id', true)));
    """)
    op.execute("""
        CREATE POLICY qr_tokens_org_isolation ON qr_tokens
            USING (order_id IN (SELECT id FROM orders WHERE organization_id::text = current_setting('app.current_org_id', true)));
    """)
    op.execute("""
        CREATE POLICY notifications_org_isolation ON notifications
            USING (order_id IN (SELECT id FROM orders WHERE organization_id::text = current_setting('app.current_org_id', true)));
    """)
    op.execute("""
        CREATE POLICY short_links_org_isolation ON short_links
            USING (order_id IN (SELECT id FROM orders WHERE organization_id::text = current_setting('app.current_org_id', true)));
    """)
