"""add_ai_analyst_audit_log

Revision ID: ai_analyst_001
Revises: 43641e22d5f3
Create Date: 2026-01-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'ai_analyst_001'
down_revision: Union[str, None] = '43641e22d5f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('ai_analyst_queries',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('query_text', sa.Text(), nullable=False),
    sa.Column('context_filters', postgresql.JSON(astext_type=sa.Text()), nullable=True),
    sa.Column('response_text', sa.Text(), nullable=False),
    sa.Column('model_used', sa.String(length=50), nullable=False),
    sa.Column('tokens_used', sa.Integer(), nullable=False),
    sa.Column('response_time_ms', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['app_users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    # Create index for querying by user
    op.create_index('ix_ai_analyst_queries_user_id', 'ai_analyst_queries', ['user_id'])
    op.create_index('ix_ai_analyst_queries_created_at', 'ai_analyst_queries', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_ai_analyst_queries_created_at', table_name='ai_analyst_queries')
    op.drop_index('ix_ai_analyst_queries_user_id', table_name='ai_analyst_queries')
    op.drop_table('ai_analyst_queries')
