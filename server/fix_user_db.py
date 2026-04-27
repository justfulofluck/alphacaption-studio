import bcrypt
from app import create_app, db
from models.user import User
import os

app = create_app()

with app.app_context():
    # Ensure tables are created
    db.create_all()
    print("Database tables ensured.")

    # Target user credentials provided by the user
    target_email = "bhavanbadh@gmail.com"
    target_pass = "bhavan@123"
    
    # Check for variants to clean up
    variants = ["bhavanbadhe@gmail.com", "bhavan@gmail.com"]
    for variant in variants:
        v_user = User.query.filter_by(email=variant).first()
        if v_user:
            print(f"Removing variant user: {variant}")
            db.session.delete(v_user)
    
    db.session.commit()

    # Find or create the primary user
    user = User.query.filter_by(email=target_email).first()
    hashed = bcrypt.hashpw(target_pass.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    if user:
        print(f"Updating existing user: {target_email}")
        user.password = hashed
        user.role = 'super_admin' # Ensure they have access
    else:
        print(f"Creating new user: {target_email}")
        user = User(
            email=target_email,
            password=hashed,
            name='Bhavan',
            role='super_admin'
        )
        db.session.add(user)
    
    db.session.commit()
    print(f"Successfully configured {target_email} with password: {target_pass}")
