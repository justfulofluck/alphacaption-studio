#!/usr/bin/env python3
"""Simulate Flask app startup sequence to test if email_service gets env vars"""

import sys
import os

# Change to server directory as the app would when run from there
server_dir = os.path.join(os.path.dirname(__file__), "server")
os.chdir(server_dir)
print(f"Working directory: {os.getcwd()}")

# Now simulate the import order as in app.py
print("\n1. Importing config (calls load_dotenv)...")
from config import Config

print(
    f"   MAIL_ENABLED from os.environ after config import: {os.environ.get('MAIL_ENABLED')}"
)
print(f"   MAIL_USERNAME: {os.environ.get('MAIL_USERNAME')}")

print("\n2. Importing email_service...")
from services.email_service import email_service

print(f"   email_service.enabled = {email_service.enabled}")
print(f"   email_service.username = {email_service.username}")
print(f"   email_service.password set: {'Yes' if email_service.password else 'No'}")
