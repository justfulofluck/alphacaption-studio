from app import create_app, db
from models.user import User

app = create_app()

with app.app_context():
    # Add role column if it doesn't exist
    try:
        db.session.execute(db.text("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'"))
        db.session.commit()
        print("[OK] Added 'role' column to users table")
    except Exception as e:
        if "Duplicate column" in str(e):
            print("[OK] Column 'role' already exists")
        else:
            print(f"Error adding role column: {e}")
    
    # Add phone column if it doesn't exist
    try:
        db.session.execute(db.text("ALTER TABLE users ADD COLUMN phone VARCHAR(20)"))
        db.session.commit()
        print("[OK] Added 'phone' column to users table")
    except Exception as e:
        if "Duplicate column" in str(e):
            print("[OK] Column 'phone' already exists")
        else:
            print(f"Error adding phone column: {e}")
    
    # Update the user's role
    user = User.query.filter_by(email='bhavanbadhe@gmail.com').first()
    if user:
        user.role = 'super_admin'
        db.session.commit()
        print(f"[OK] Updated user {user.email} to super_admin")
    else:
        print("[ERROR] User not found")