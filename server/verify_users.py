from app import create_app
from models.user import User

app = create_app()

with app.app_context():
    users = User.query.filter_by(email='vcaption@gmail.com').all()
    for user in users:
        print(f"User: {user.email}, Role: '{user.role}', PWD_LEN: {len(user.password)}")
