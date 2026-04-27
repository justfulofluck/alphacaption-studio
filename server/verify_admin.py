import bcrypt
from app import create_app, db
from models.user import User

app = create_app()

with app.app_context():
    user = User.query.filter_by(email='bhavanbadhe@gmail.com').first()
    if user:
        password = "admin123"
        is_correct = bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8'))
        print(f"Password check for {user.email}: {is_correct}")
        print(f"Role: {user.role}")
    else:
        print("User not found")
