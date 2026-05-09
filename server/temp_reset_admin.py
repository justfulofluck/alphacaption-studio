from app import create_app
from extensions import db
from models.user import User
import bcrypt

app = create_app()

def reset_admin():
    with app.app_context():
        admin = User.query.filter_by(email='vcaption@gmail.com').first()
        if admin:
            hashed = bcrypt.hashpw('root'.encode('utf-8'), bcrypt.gensalt())
            admin.password = hashed.decode('utf-8')
            admin.role = 'super_admin'
            db.session.commit()
            print("Successfully reset admin password to 'root'")
        else:
            print("Admin user not found")

if __name__ == "__main__":
    reset_admin()
