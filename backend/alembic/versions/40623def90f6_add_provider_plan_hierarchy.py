"""add_provider_plan_hierarchy

Revision ID: 40623def90f6
Revises: 30504cbf80e5
Create Date: 2025-10-05 16:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "40623def90f6"
down_revision = "30504cbf80e5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add provider_name and plan_name columns to memberships table
    op.add_column("memberships", sa.Column("provider_name", sa.String(), nullable=True))
    op.add_column("memberships", sa.Column("plan_name", sa.String(), nullable=True))


def downgrade() -> None:
    # Remove the columns
    op.drop_column("memberships", "plan_name")
    op.drop_column("memberships", "provider_name")
