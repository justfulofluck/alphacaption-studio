import bcrypt
from app import create_app, db
from models.user import User

app = create_app()

with app.app_context():
    email = 'vcaption@gmail.com'
    password = 'root'
    
    # Check if user exists
    user = User.query.filter_by(email=email).first()
    
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    if user:
        user.password = hashed
        user.role = 'super_admin'
        print(f"Updated existing user {email} with new password and admin role.")
    else:
        user = User(
            email=email,
            password=hashed,
            name='VCaption Admin',
            role='super_admin'
        )
        db.session.add(user)
        print(f"Created new admin user: {email}")
        
    db.session.commit()
    print("Success!")
