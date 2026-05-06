from app import create_app, db
from models.user import User
import sqlalchemy as sa

app = create_app()

def add_column_if_not_exists(table_name, column_name, column_type):
    try:
        # Use inspector to check if column exists
        inspector = sa.inspect(db.engine)
        columns = [c['name'] for c in inspector.get_columns(table_name)]
        
        if column_name not in columns:
            print(f"Adding column '{column_name}' to table '{table_name}'...")
            db.session.execute(sa.text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"))
            db.session.commit()
            print(f"[OK] Added '{column_name}'")
        else:
            print(f"[SKIP] Column '{column_name}' already exists in '{table_name}'")
    except Exception as e:
        print(f"[ERROR] Could not add column {column_name}: {e}")
        db.session.rollback()

with app.app_context():
    print("Checking for missing columns in 'users' table...")
    
    columns_to_add = [
        ('phone', 'VARCHAR(20)'),
        ('role', "VARCHAR(20) DEFAULT 'user'"),
        ('last_login_at', 'DATETIME'),
        ('failed_login_attempts', 'INTEGER DEFAULT 0'),
        ('locked_until', 'DATETIME'),
        ('password_changed_at', 'DATETIME'),
        ('current_jti', 'VARCHAR(36)')
    ]
    
    for col_name, col_type in columns_to_add:
        add_column_if_not_exists('users', col_name, col_type)

    # Update admin user if exists
    try:
        admin_email = 'bhavanbadhe@gmail.com'
        user = User.query.filter_by(email=admin_email).first()
        if user:
            user.role = 'super_admin'
            db.session.commit()
            print(f"[OK] Updated user {admin_email} to super_admin")
    except Exception as e:
        print(f"Error updating admin user: {e}")

    print("Database check completed.")