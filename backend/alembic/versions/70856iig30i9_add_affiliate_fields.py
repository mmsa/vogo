"""add affiliate fields

Revision ID: 70856iig30i9
Revises: 60745hhf20h8
Create Date: 2025-10-19 22:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "70856iig30i9"
down_revision = "60745hhf20h8"
branch_labels = None
depends_on = None


def upgrade():
    # Add affiliate fields to memberships table
    op.add_column("memberships", sa.Column("affiliate_id", sa.String(), nullable=True))
    op.add_column("memberships", sa.Column("affiliate_url", sa.String(), nullable=True))
    op.add_column(
        "memberships", sa.Column("commission_type", sa.String(), nullable=True)
    )
    op.add_column("memberships", sa.Column("partner_name", sa.String(), nullable=True))
    op.add_column(
        "memberships", sa.Column("commission_notes", sa.Text(), nullable=True)
    )

    # Add affiliate fields to benefits table
    op.add_column("benefits", sa.Column("vendor_name", sa.String(), nullable=True))
    op.add_column("benefits", sa.Column("affiliate_id", sa.String(), nullable=True))
    op.add_column("benefits", sa.Column("affiliate_url", sa.String(), nullable=True))
    op.add_column("benefits", sa.Column("commission_type", sa.String(), nullable=True))
    op.add_column("benefits", sa.Column("partner_name", sa.String(), nullable=True))
    op.add_column("benefits", sa.Column("commission_notes", sa.Text(), nullable=True))


def downgrade():
    # Remove affiliate fields from benefits table
    op.drop_column("benefits", "commission_notes")
    op.drop_column("benefits", "partner_name")
    op.drop_column("benefits", "commission_type")
    op.drop_column("benefits", "affiliate_url")
    op.drop_column("benefits", "affiliate_id")
    op.drop_column("benefits", "vendor_name")

    # Remove affiliate fields from memberships table
    op.drop_column("memberships", "commission_notes")
    op.drop_column("memberships", "partner_name")
    op.drop_column("memberships", "commission_type")
    op.drop_column("memberships", "affiliate_url")
    op.drop_column("memberships", "affiliate_id")
