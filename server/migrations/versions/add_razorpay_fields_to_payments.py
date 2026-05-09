"""Add Razorpay fields to payments

Revision ID: add_razorpay_fields
Revises: 25d55f7704f7
Create Date: 2026-05-07

"""
from alembic import op
import sqlalchemy as sa


revision = 'add_razorpay_fields'
down_revision = '25d55f7704f7'
branch_labels = None
depends_on = None


def column_exists(inspector, column_name):
    return column_name in [column['name'] for column in inspector.get_columns('payments')]


def unique_exists(inspector, constraint_name):
    return constraint_name in [
        constraint['name'] for constraint in inspector.get_unique_constraints('payments')
    ]


def foreign_key_exists(inspector, constraint_name):
    return constraint_name in [
        constraint['name'] for constraint in inspector.get_foreign_keys('payments')
    ]


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not column_exists(inspector, 'plan_id'):
        op.add_column('payments', sa.Column('plan_id', sa.Integer(), nullable=True))
    if not column_exists(inspector, 'razorpay_order_id'):
        op.add_column('payments', sa.Column('razorpay_order_id', sa.String(length=100), nullable=True))
    if not column_exists(inspector, 'razorpay_payment_id'):
        op.add_column('payments', sa.Column('razorpay_payment_id', sa.String(length=100), nullable=True))
    if not column_exists(inspector, 'razorpay_signature'):
        op.add_column('payments', sa.Column('razorpay_signature', sa.String(length=255), nullable=True))

    inspector = sa.inspect(bind)
    if not foreign_key_exists(inspector, 'fk_payments_plan_id_plans'):
        op.create_foreign_key('fk_payments_plan_id_plans', 'payments', 'plans', ['plan_id'], ['id'])
    if not unique_exists(inspector, 'uq_payments_razorpay_order_id'):
        op.create_unique_constraint('uq_payments_razorpay_order_id', 'payments', ['razorpay_order_id'])
    if not unique_exists(inspector, 'uq_payments_razorpay_payment_id'):
        op.create_unique_constraint('uq_payments_razorpay_payment_id', 'payments', ['razorpay_payment_id'])


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if foreign_key_exists(inspector, 'fk_payments_plan_id_plans'):
        op.drop_constraint('fk_payments_plan_id_plans', 'payments', type_='foreignkey')
    if unique_exists(inspector, 'uq_payments_razorpay_payment_id'):
        op.drop_constraint('uq_payments_razorpay_payment_id', 'payments', type_='unique')
    if unique_exists(inspector, 'uq_payments_razorpay_order_id'):
        op.drop_constraint('uq_payments_razorpay_order_id', 'payments', type_='unique')

    inspector = sa.inspect(bind)
    for column_name in ['razorpay_signature', 'razorpay_payment_id', 'razorpay_order_id', 'plan_id']:
        if column_exists(inspector, column_name):
            op.drop_column('payments', column_name)
