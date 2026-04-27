import bcrypt
from app import create_app, db
from models.user import User

app = create_app()

with app.app_context():
    # Remove existing if any
    existing = User.query.filter_by(email='admin@admin.com').first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
    
    password = "password"
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    user = User(
        email='admin@admin.com',
        password=hashed,
        name='Admin User',
        role='super_admin'
    )
    
    db.session.add(user)
    db.session.commit()
    print(f"Successfully created admin@admin.com with password: {password}")

    # Also double check the first admin
    bhavan = User.query.filter_by(email='bhavanbadhe@gmail.com').first()
    if bhavan:
        bhavan.password = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        bhavan.role = 'super_admin'
        db.session.commit()
        print("Updated bhavanbadhe@gmail.com to admin123")
