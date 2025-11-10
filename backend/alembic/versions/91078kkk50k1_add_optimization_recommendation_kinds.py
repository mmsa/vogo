"""Add optimization recommendation kinds

Revision ID: 91078kkk50k1
Revises: 80967jjh40j0
Create Date: 2025-01-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '91078kkk50k1'
down_revision = '80967jjh40j0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new enum values to recommendationkind enum
    # PostgreSQL allows adding values to existing enum types
    op.execute("ALTER TYPE recommendationkind ADD VALUE IF NOT EXISTS 'add_membership'")
    op.execute("ALTER TYPE recommendationkind ADD VALUE IF NOT EXISTS 'upgrade'")


def downgrade() -> None:
    # Note: PostgreSQL doesn't support removing enum values directly
    # This would require recreating the enum type, which is complex
    # For now, we'll leave the enum values in place
    # In production, you might want to handle this differently
    pass

