from app import create_app
from models.user import User

app = create_app()

with app.app_context():
    user = User.query.filter_by(email='vcaption@gmail.com').first()
    if user:
        print(f"ID: {user.id}")
        print(f"Email: {user.email}")
        print(f"Role: {user.role}")
        print(f"Password Hash: {user.password}")
    else:
        print("User not found")
