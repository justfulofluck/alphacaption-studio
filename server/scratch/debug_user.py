
import os
import sys
from dotenv import load_dotenv

# Add server directory to path
server_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, server_dir)

load_dotenv()

from app import create_app, db
from models.user import User

app = create_app()

with app.app_context():
    email = "bhavanbadhe@gmail.com"
    user = User.query.filter_by(email=email).first()
    if user:
        print(f"User {email} FOUND. Role: {user.role}")
    else:
        print(f"User {email} NOT FOUND in database.")
