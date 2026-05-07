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
        
    def send_welcome(self, to_email, name):
        subject = 'Welcome to AlphaCaption Studio!'
        body = f'''Hi {name},

Welcome to AlphaCaption Studio!

Your account has been created successfully.

Your free trial is now active:
- 2 minutes of service usage
- 3 days of access

Get Started:
1. Upload your audio file
2. Click "Transcribe Audio" to convert speech to text
3. Edit and style your captions
4. Export as SRT file

After the trial ends, you can upgrade from the pricing page to continue using the service.

Need help? Just reply to this email.

Best,
The AlphaCaption Team'''
        return self.send(to_email, subject, body)
    
    def send_project_completed(self, to_email, project_name):
        subject = f'Project Ready: {project_name}'
        body = f'''Hi,

Your project "{project_name}" is complete!

Log in to view and export your captions.

Best,
AlphaCaption Team'''
        return self.send(to_email, subject, body)

    def send_payment_thank_you(self, to_email, name, plan_name, amount, credits, validity_days):
        subject = f'Thank you for purchasing {plan_name}'
        body = f'''Hi {name},

Thank you for your payment.

Your {plan_name} plan is now active.

Plan details:
- Amount paid: Rs. {amount}
- Credits added: {credits} minutes
- Validity: {validity_days} days

You can now continue using VCaptiona from your dashboard.

Best,
The VCaptiona Team'''
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
        if not self.enabled or not self.username or not self.password:
            print(f'[Email] Would send to {to_email}: {subject}')
            sys.stdout.flush()
            return True
        
        yag = None
        try:
            # Create a fresh thread-safe short-lived connection
            yag = yagmail.SMTP(self.username, self.password)
            yag.send(to=to_email, subject=subject, contents=body)
            print(f'[Email] Sent to {to_email}: {subject}')
            sys.stdout.flush()
            return True
        except Exception as e:
            print(f'[Email] Failed: {e}')
            sys.stdout.flush()
            return False
        finally:
            if yag:
                yag.close()

email_service = EmailService()
