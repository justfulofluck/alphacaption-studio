from app import create_app, db

app = create_app()
with app.app_context():
    try:
        # Try to connect
        conn = db.engine.connect()
        print("SUCCESS: Database connection established!")
        print(f"Database URL: {db.engine.url}")
        # Check if tables exist
        result = db.session.execute(db.text("SHOW TABLES"))
        tables = result.fetchall()
        print(f"Existing tables: {tables if tables else 'No tables found'}")
        conn.close()
    except Exception as e:
        print(f"ERROR: {e}")
