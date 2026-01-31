"""add contract_types table

Revision ID: contract_types_001
Revises: ai_analyst_001
Create Date: 2026-01-31

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'contract_types_001'
down_revision: Union[str, None] = 'ai_analyst_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('contract_types',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('name', sa.String(length=50), nullable=False),
    sa.Column('duration_days', sa.Integer(), nullable=False),
    sa.Column('late_cutoff_time', sa.Time(), nullable=False),
    sa.Column('first_minute_penalty_thb', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('additional_minutes_penalty_thb', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('drink_price_thb', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('staff_commission_thb', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name')
    )


def downgrade() -> None:
    op.drop_table('contract_types')
