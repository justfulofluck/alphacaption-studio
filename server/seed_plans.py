from app import create_app
from extensions import db
from models.plan import Plan

DEFAULT_PLANS = [
    {
        'name': 'Trial',
        'price': 0,
        'credits_included': 2,
        'validity_days': 3,
        'plan_type': 'trial'
    },
    {
        'name': 'Basic',
        'price': 99,
        'credits_included': 5,
        'validity_days': 7,
        'plan_type': 'subscription'
    },
    {
        'name': 'Starter',
        'price': 499,
        'credits_included': 60,
        'validity_days': 30,
        'plan_type': 'subscription'
    },
    {
        'name': 'Professional',
        'price': 1599,
        'credits_included': 250,
        'validity_days': 45,
        'plan_type': 'subscription'
    },
    {
        'name': 'Business',
        'price': 4999,
        'credits_included': 1000,
        'validity_days': 365,
        'plan_type': 'subscription'
    }
]


def upsert_default_plans():
    for plan_data in DEFAULT_PLANS:
        plan = Plan.query.filter_by(name=plan_data['name']).first()
        if not plan:
            plan = Plan(**plan_data)
            db.session.add(plan)
            continue

        plan.price = plan_data['price']
        plan.credits_included = plan_data['credits_included']
        plan.validity_days = plan_data['validity_days']
        plan.plan_type = plan_data['plan_type']

    db.session.commit()


def seed_plans():
    app = create_app()
    with app.app_context():
        # Create tables first
        db.create_all()
        upsert_default_plans()
        print("Success: Default plans synced!")

if __name__ == '__main__':
    seed_plans()
