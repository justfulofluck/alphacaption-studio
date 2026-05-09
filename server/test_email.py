#!/usr/bin/env python3
import os
import sys

# Add server directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv

load_dotenv()

import yagmail

username = os.environ.get("MAIL_USERNAME")
password = os.environ.get("MAIL_PASSWORD")

print(f"MAIL_ENABLED: {os.environ.get('MAIL_ENABLED')}")
print(f"MAIL_USERNAME: {username}")
print(f"MAIL_PASSWORD set: {'Yes' if password else 'No'}")

if not username or not password:
    print("ERROR: Missing email credentials in environment")
    sys.exit(1)

print("\nTesting email send...")
try:
    yag = yagmail.SMTP(username, password)
    yag.send(
        to=username,
        subject="Test Email from AlphaCaption",
        contents="This is a test email to verify SMTP configuration.",
    )
    print("SUCCESS: Email sent!")
    yag.close()
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")
    import traceback

    traceback.print_exc()
