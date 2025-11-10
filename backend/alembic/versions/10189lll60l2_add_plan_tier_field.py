"""Add plan_tier field to memberships

Revision ID: 10189lll60l2
Revises: 91078kkk50k1
Create Date: 2025-01-15 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '10189lll60l2'
down_revision = '91078kkk50k1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add plan_tier column to memberships table
    op.add_column("memberships", sa.Column("plan_tier", sa.Integer(), nullable=True))
    
    # Update existing memberships with tier information
    # This uses a helper function to calculate tiers
    op.execute("""
        UPDATE memberships 
        SET plan_tier = CASE
            WHEN LOWER(plan_name) IN ('standard', 'basic', 'free', 'starter', 'essential', 'club') THEN 1
            WHEN LOWER(plan_name) IN ('premium', 'gold', 'plus') THEN 2
            WHEN LOWER(plan_name) IN ('platinum', 'metal') THEN 3
            WHEN LOWER(plan_name) IN ('ultra', 'elite', 'centurion') THEN 4
            ELSE 1
        END
        WHERE plan_tier IS NULL AND plan_name IS NOT NULL;
    """)


def downgrade() -> None:
    op.drop_column("memberships", "plan_tier")

