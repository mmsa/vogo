"""add_user_auth_fields

Revision ID: 60745hhf20h8
Revises: 50734eff10g7
Create Date: 2025-10-05 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "60745hhf20h8"
down_revision: Union[str, None] = "50734eff10g7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add password_hash column to users table
    op.add_column("users", sa.Column("password_hash", sa.String(), nullable=True))

    # Add role column to users table (default 'user')
    op.add_column(
        "users", sa.Column("role", sa.String(), server_default="user", nullable=False)
    )

    # Add is_active column to users table (default True)
    op.add_column(
        "users",
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
    )

    # Create sessions table for refresh tokens
    op.create_table(
        "sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("refresh_token_jti", sa.String(), nullable=False),
        sa.Column("user_agent", sa.String(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column("revoked", sa.Boolean(), server_default="false", nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("refresh_token_jti"),
    )

    # Create index on user_id for faster lookups
    op.create_index("ix_sessions_user_id", "sessions", ["user_id"])


def downgrade() -> None:
    # Drop sessions table
    op.drop_index("ix_sessions_user_id", table_name="sessions")
    op.drop_table("sessions")

    # Drop columns from users table
    op.drop_column("users", "is_active")
    op.drop_column("users", "role")
    op.drop_column("users", "password_hash")
