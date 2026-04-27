import bcrypt
from app import create_app, db
from models.user import User

app = create_app()

with app.app_context():
    # Credentials to ensure
    creds = [
        ("bhavanbadh@gmail.com", "bhavan@123"),
        ("bhavanbadhe@gmail.com", "bhavan@123"),
        ("bhavanbadhe@gmail.com", "admin123"),
        ("admin@admin.com", "password")
    ]
    
    for email, password in creds:
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        user = User.query.filter_by(email=email).first()
        if user:
            print(f"Updating user: {email} with password: {password}")
            user.password = hashed
            user.role = 'super_admin'
        else:
            print(f"Creating user: {email} with password: {password}")
            user = User(
                email=email,
                password=hashed,
                name='Bhavan',
                role='super_admin'
            )
            db.session.add(user)
    
    db.session.commit()
    print("All credentials have been synchronized.")
