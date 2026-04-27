from app import create_app, db

app = create_app()

with app.app_context():
    print("Creating all database tables...")
    db.create_all()
    print("SUCCESS: All tables created!")
    
    # Verify tables
    result = db.session.execute(db.text("SHOW TABLES"))
    tables = [row[0] for row in result.fetchall()]
    print(f"Created tables: {tables}")
