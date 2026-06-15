from app import create_app, db
from sqlalchemy import text
from services.credit_service import CreditService
from models.user import User

app = create_app()
with app.app_context():
    with db.engine.connect() as conn:
        result = conn.execute(text("SHOW COLUMNS FROM credit_ledger LIKE 'description'"))
        if result.fetchone() is None:
            conn.execute(text("ALTER TABLE credit_ledger ADD COLUMN description VARCHAR(255) DEFAULT NULL"))
            conn.commit()
            print('Added description column to credit_ledger')
        else:
            print('description column already exists')

    admins = User.query.filter(User.role.in_(['admin', 'super_admin'])).all()
    for u in admins:
        bal = CreditService.get_balance(u.id)
        print(f'{u.email} | balance={bal}')
        if bal < 999999:
            CreditService.add_credits(
                user_id=u.id, amount=999999,
                source='admin_lifetime',
                description='Admin Lifetime Credits'
            )
            new_bal = CreditService.get_balance(u.id)
            print(f'  -> Added 999999 credits. New balance: {new_bal}')
    print('DONE')
