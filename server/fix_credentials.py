import bcrypt
from app import create_app, db
from models.user import User

app = create_app()

with app.app_context():
    email = 'bhavanbadhe@gmail.com'
    password = 'bhavan@123'
    
    user = User.query.filter_by(email=email).first()
    if user:
        print(f"Updating existing user {email} with new password.")
        user.password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        db.session.commit()
        print("Update successful. Password is set to: bhavan@123")
    else:
        print(f"User {email} not found. Checking for typo'd versions...")
        typo_user = User.query.filter_by(email='bhavanbadh@gmail.com').first()
        if typo_user:
            print(f"Found user with typo {typo_user.email}. Fixing email and password.")
            typo_user.email = email
            typo_user.password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            db.session.commit()
            print("Fix successful. Use bhavanbadhe@gmail.com with bhavan@123")
        else:
            print(f"No user found with email {email}. Creating new super_admin.")
            hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            new_user = User(
                email=email,
                password=hashed,
                name='Bhavan',
                role='super_admin'
            )
            db.session.add(new_user)
            db.session.commit()
            print(f"Creation successful. Use {email} with bhavan@123")
