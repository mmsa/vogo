"""add_smart_add_fields

Revision ID: 50734eff10g7
Revises: 40623def90f6
Create Date: 2025-10-05 16:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "50734eff10g7"
down_revision = "40623def90f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add Smart Add fields to memberships table
    op.add_column(
        "memberships",
        sa.Column("is_catalog", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.add_column(
        "memberships", sa.Column("discovered_by_user_id", sa.Integer(), nullable=True)
    )
    op.add_column(
        "memberships",
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
    )

    # Add Smart Add validation fields to benefits table
    op.add_column(
        "benefits",
        sa.Column(
            "validation_status", sa.String(), nullable=False, server_default="approved"
        ),
    )
    op.add_column(
        "benefits", sa.Column("source_confidence", sa.Float(), nullable=True)
    )
    op.add_column(
        "benefits", sa.Column("last_checked_at", sa.DateTime(), nullable=True)
    )


def downgrade() -> None:
    # Remove benefits columns
    op.drop_column("benefits", "last_checked_at")
    op.drop_column("benefits", "source_confidence")
    op.drop_column("benefits", "validation_status")

    # Remove memberships columns
    op.drop_column("memberships", "status")
    op.drop_column("memberships", "discovered_by_user_id")
    op.drop_column("memberships", "is_catalog")

