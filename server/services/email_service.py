import os
import yagmail
from dotenv import load_dotenv

load_dotenv()

class EmailService:
    def __init__(self):
        self.enabled = os.environ.get('MAIL_ENABLED', 'false').lower() == 'true'
        self.username = os.environ.get('MAIL_USERNAME', '')
        self.password = os.environ.get('MAIL_PASSWORD', '')
        self.from_name = os.environ.get('MAIL_FROM', 'AlphaCaption Studio')
        
        if self.enabled and self.username and self.password:
            try:
                self.yag = yagmail.SMTP(self.username, self.password)
            except Exception as e:
                print(f'[Email] SMTP Initialization Failed: {e}')
                self.enabled = False
    
    def send_welcome(self, to_email, name):
        subject = 'Welcome to AlphaCaption Studio!'
        body = f'''Hi {name},

Welcome to AlphaCaption Studio!

Your account has been created successfully.

Get Started:
1. Upload your audio file
2. Click "Transcribe Audio" to convert speech to text
3. Edit and style your captions
4. Export as SRT file

Need help? Just reply to this email.

Best,
The AlphaCaption Team'''
        return self.send(to_email, subject, body)
    
    def send_password_reset(self, to_email, reset_link):
        subject = 'Reset Your AlphaCaption Password'
        body = f'''Hi,

Click the link below to reset your password:

{reset_link}

This link expires in 1 hour.

If you didn't request this, ignore this email.

Best,
AlphaCaption Team'''
        return self.send(to_email, subject, body)
    
    def send_project_completed(self, to_email, project_name):
        subject = f'Project Ready: {project_name}'
        body = f'''Hi,

Your project "{project_name}" is complete!

Log in to view and export your captions.

Best,
AlphaCaption Team'''
        return self.send(to_email, subject, body)

    def send_otp(self, to_email, otp, purpose):
        subject = f'Your AlphaCaption {purpose.capitalize()} OTP'
        body = f'''Hi,

Your verification code for {purpose} is:

{otp}

This code is valid for 3 minutes.

If you didn't request this, ignore this email.

Best,
AlphaCaption Team'''
        return self.send(to_email, subject, body)
    
    def send(self, to_email, subject, body):
        import sys
        if not self.enabled:
            print(f'[Email] Would send to {to_email}: {subject}')
            sys.stdout.flush()
            return True
        
        try:
            self.yag.send(to=to_email, subject=subject, contents=body)
            print(f'[Email] Sent to {to_email}: {subject}')
            sys.stdout.flush()
            return True
        except Exception as e:
            print(f'[Email] Failed: {e}')
            sys.stdout.flush()
            return False

email_service = EmailService()