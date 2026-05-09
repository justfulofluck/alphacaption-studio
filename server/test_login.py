import bcrypt
from app import create_app
from models.user import User

app = create_app()

with app.app_context():
    email = 'vcaption@gmail.com'
    password = 'root'
    
    user = User.query.filter_by(email=email).first()
    if not user:
        print("User not found in DB")
    else:
        print(f"User found: {user.email}, Role: {user.role}")
        match = bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8'))
        print(f"Password match: {match}")
