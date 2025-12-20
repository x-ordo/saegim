"""proof multi with type

Revision ID: 0006
Revises: 0005
Create Date: 2025-12-21

Changes Proof from 1:1 to 1:N relationship with Order.
Adds proof_type enum: BEFORE, AFTER, RECEIPT, DAMAGE, OTHER
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create proof_type enum
    proof_type = sa.Enum("BEFORE", "AFTER", "RECEIPT", "DAMAGE", "OTHER", name="proof_type")
    proof_type.create(op.get_bind(), checkfirst=True)

    # 2. Add proof_type column (nullable first for existing rows)
    op.add_column(
        "proofs",
        sa.Column("proof_type", sa.Enum("BEFORE", "AFTER", "RECEIPT", "DAMAGE", "OTHER", name="proof_type"), nullable=True)
    )

    # 3. Set default value for existing rows
    op.execute("UPDATE proofs SET proof_type = 'AFTER' WHERE proof_type IS NULL")

    # 4. Make proof_type NOT NULL with default
    op.alter_column(
        "proofs",
        "proof_type",
        nullable=False,
        server_default="AFTER"
    )

    # 5. Drop unique constraint on order_id
    # PostgreSQL names constraints automatically as {table}_{column}_key
    op.drop_constraint("proofs_order_id_key", "proofs", type_="unique")

    # 6. Add composite index for (order_id, proof_type) queries
    op.create_index("ix_proofs_order_type", "proofs", ["order_id", "proof_type"])


def downgrade() -> None:
    # 1. Drop composite index
    op.drop_index("ix_proofs_order_type", table_name="proofs")

    # 2. Keep only the latest proof per order (by uploaded_at) before re-adding unique constraint
    op.execute("""
        DELETE FROM proofs p1
        WHERE p1.id NOT IN (
            SELECT DISTINCT ON (order_id) id
            FROM proofs
            ORDER BY order_id, uploaded_at DESC
        )
    """)

    # 3. Re-add unique constraint on order_id
    op.create_unique_constraint("proofs_order_id_key", "proofs", ["order_id"])

    # 4. Drop proof_type column
    op.drop_column("proofs", "proof_type")

    # 5. Drop enum type
    op.execute("DROP TYPE IF EXISTS proof_type")
