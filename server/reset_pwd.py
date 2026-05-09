import bcrypt
from app import create_app, db
from models.user import User

app = create_app()

with app.app_context():
    email = 'vcaption@gmail.com'
    password = 'root'
    
    user = User.query.filter_by(email=email).first()
    if user:
        # Use simple bcrypt hashing
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        user.password = hashed
        user.role = 'super_admin'
        db.session.commit()
        print(f"Password reset for {email} to 'root' (Role: {user.role})")
    else:
        print("User not found")
