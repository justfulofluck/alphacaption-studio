import os
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path, override=True)

from app import create_app
from extensions import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    try:
        # Check if columns exist
        print("Adding has_completed_onboarding...")
        db.session.execute(text("ALTER TABLE users ADD COLUMN has_completed_onboarding BOOLEAN DEFAULT FALSE;"))
        db.session.commit()
        print("Added has_completed_onboarding successfully.")
    except Exception as e:
        db.session.rollback()
        print(f"Error adding has_completed_onboarding (might already exist): {e}")

    try:
        print("Adding onboarding_data...")
        db.session.execute(text("ALTER TABLE users ADD COLUMN onboarding_data TEXT;"))
        db.session.commit()
        print("Added onboarding_data successfully.")
    except Exception as e:
        db.session.rollback()
        print(f"Error adding onboarding_data (might already exist): {e}")

print("Migration completed.")
