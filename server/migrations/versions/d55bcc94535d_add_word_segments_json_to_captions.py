"""add word_segments_json to captions

Revision ID: d55bcc94535d
Revises: e00d004a7dd3
Create Date: 2026-06-09 16:57:31.675854

"""
from alembic import op
import sqlalchemy as sa


revision = 'd55bcc94535d'
down_revision = 'e00d004a7dd3'
branch_labels = None
depends_on = None


def column_exists(table, column):
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return column in [c['name'] for c in inspector.get_columns(table)]


def upgrade():
    if not column_exists('captions', 'word_segments_json'):
        with op.batch_alter_table('captions', schema=None) as batch_op:
            batch_op.add_column(sa.Column('word_segments_json', sa.Text(), nullable=True))


def downgrade():
    if column_exists('captions', 'word_segments_json'):
        with op.batch_alter_table('captions', schema=None) as batch_op:
            batch_op.drop_column('word_segments_json')
