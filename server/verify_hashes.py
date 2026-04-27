import bcrypt
from app import create_app, db
from models.user import User

app = create_app()

with app.app_context():
    email = "bhavanbadh@gmail.com"
    password = "bhavan@123"
    
    user = User.query.filter_by(email=email).first()
    if not user:
        print(f"ERROR: User {email} not found in database!")
    else:
        is_match = bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8'))
        print(f"User: {user.email}")
        print(f"Role: {user.role}")
        print(f"Stored Hash: {user.password}")
        print(f"Password '{password}' matches: {is_match}")
        
        # Also check bhavanbadhe
        email2 = "bhavanbadhe@gmail.com"
        user2 = User.query.filter_by(email=email2).first()
        if user2:
            is_match2 = bcrypt.checkpw(password.encode('utf-8'), user2.password.encode('utf-8'))
            print(f"User2: {user2.email}")
            print(f"Password '{password}' matches: {is_match2}")
            
            # Check admin123 for user2
            is_match3 = bcrypt.checkpw("admin123".encode('utf-8'), user2.password.encode('utf-8'))
            print(f"Password 'admin123' matches user2: {is_match3}")
