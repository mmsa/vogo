"""Initial schema

Revision ID: 10000000000
Revises: 
Create Date: 2025-10-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '10000000000'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    
    # Create memberships table
    op.create_table('memberships',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('provider_slug', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('provider_slug')
    )
    op.create_index(op.f('ix_memberships_id'), 'memberships', ['id'], unique=False)
    
    # Create benefits table
    op.create_table('benefits',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('membership_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('vendor_domain', sa.String(), nullable=True),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('source_url', sa.String(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['membership_id'], ['memberships.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_benefits_category'), 'benefits', ['category'], unique=False)
    op.create_index(op.f('ix_benefits_id'), 'benefits', ['id'], unique=False)
    op.create_index(op.f('ix_benefits_vendor_domain'), 'benefits', ['vendor_domain'], unique=False)
    
    # Create vendors table
    op.create_table('vendors',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('domain', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('domain')
    )
    op.create_index(op.f('ix_vendors_id'), 'vendors', ['id'], unique=False)
    
    # Create user_memberships table
    op.create_table('user_memberships',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('membership_id', sa.Integer(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['membership_id'], ['memberships.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_memberships_id'), 'user_memberships', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_memberships_id'), table_name='user_memberships')
    op.drop_table('user_memberships')
    op.drop_index(op.f('ix_vendors_id'), table_name='vendors')
    op.drop_table('vendors')
    op.drop_index(op.f('ix_benefits_vendor_domain'), table_name='benefits')
    op.drop_index(op.f('ix_benefits_id'), table_name='benefits')
    op.drop_index(op.f('ix_benefits_category'), table_name='benefits')
    op.drop_table('benefits')
    op.drop_index(op.f('ix_memberships_id'), table_name='memberships')
    op.drop_table('memberships')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_table('users')

