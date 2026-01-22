"""add_cascade_to_fact_rows_fk

Revision ID: 43641e22d5f3
Revises: d279475e9d58
Create Date: 2026-01-22 01:18:46.092936

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '43641e22d5f3'
down_revision: Union[str, None] = 'd279475e9d58'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the existing foreign key constraint
    op.drop_constraint('fact_rows_last_import_run_id_fkey', 'fact_rows', type_='foreignkey')
    
    # Recreate it with ON DELETE CASCADE
    op.create_foreign_key(
        'fact_rows_last_import_run_id_fkey',
        'fact_rows',
        'import_runs',
        ['last_import_run_id'],
        ['id'],
        ondelete='CASCADE'
    )


def downgrade() -> None:
    # Drop the CASCADE constraint
    op.drop_constraint('fact_rows_last_import_run_id_fkey', 'fact_rows', type_='foreignkey')
    
    # Recreate it without CASCADE (original state)
    op.create_foreign_key(
        'fact_rows_last_import_run_id_fkey',
        'fact_rows',
        'import_runs',
        ['last_import_run_id'],
        ['id']
    )
