#!/bin/bash
set -e

# Environment variables are loaded via docker-compose env_file

echo "Waiting for database to be ready..."
# Simple check to see if MySQL is accepting connections
# You can use a more sophisticated check here if needed

echo "Running custom database sync script..."
python update_db.py

# Optional: Run Flask-Migrate if initialized
if [ -d "migrations" ]; then
    echo "Running database migrations (Flask-Migrate)..."
    flask db upgrade || echo "Migration upgrade failed, skipping..."
fi

echo "Starting Application..."
# Start the application
exec python app.py
