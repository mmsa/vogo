"""add analytics events table

Revision ID: 80967jjh40j0
Revises: 70856iig30i9
Create Date: 2025-10-19 22:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision = "80967jjh40j0"
down_revision = "70856iig30i9"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "analytics_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("event_name", sa.String(), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), nullable=True, index=True),
        sa.Column("source", sa.String(), nullable=True),  # 'web', 'extension', 'api'
        sa.Column("created_at", sa.DateTime(), nullable=False, index=True),
        sa.Column("payload", JSONB(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for common queries
    op.create_index(
        "idx_events_name_date", "analytics_events", ["event_name", "created_at"]
    )
    op.create_index(
        "idx_events_user_date", "analytics_events", ["user_id", "created_at"]
    )


def downgrade():
    op.drop_index("idx_events_user_date", table_name="analytics_events")
    op.drop_index("idx_events_name_date", table_name="analytics_events")
    op.drop_table("analytics_events")
