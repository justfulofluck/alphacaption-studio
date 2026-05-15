import os
import yagmail


class EmailService:
    def __init__(self):
        self.enabled = os.environ.get("MAIL_ENABLED", "false").lower() == "true"
        self.username = os.environ.get("MAIL_USERNAME", "")
        self.password = os.environ.get("MAIL_PASSWORD", "")
        self.from_name = os.environ.get("MAIL_FROM", "VCaptiona Studio")

    def send_welcome(self, to_email, name):
        subject = "Welcome to VCaptiona Studio!"
        body = f"""Hi {name},

Welcome to VCaptiona Studio!

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
The VCaptiona Team"""
        return self.send(to_email, subject, body)

    def send_project_completed(self, to_email, project_name):
        subject = f"Project Ready: {project_name}"
        body = f'''Hi,

Your project "{project_name}" is complete!

Log in to view and export your captions.

Best,
VCaptiona Team'''
        return self.send(to_email, subject, body)

    def send_payment_thank_you(
        self, to_email, name, plan_name, amount, credits, validity_days
    ):
        subject = f"Thank you for purchasing {plan_name}"
        body = f"""Hi {name},

Thank you for your payment.

Your {plan_name} plan is now active.

Plan details:
- Amount paid: Rs. {amount}
- Credits added: {credits} minutes
- Validity: {validity_days} days

You can now continue using VCaptiona from your dashboard.

Best,
The VCaptiona Team"""
        return self.send(to_email, subject, body)

    def send_otp(self, to_email, otp, purpose):
        # Use a more friendly subject that avoids spam filters
        subject = "VCaptiona Verification Code"
        
        # Customize message based on purpose
        action = "reset your password" if purpose == "reset" else "create your account"
        if "admin" in purpose:
            action = "access your admin account"

        body = f"""Hi,

Your verification code to {action} is:

{otp}

This code is valid for 3 minutes.

If you didn't request this, please ignore this email.

Best,
VCaptiona Team"""
        return self.send(to_email, subject, body)

    def send_support_ticket(self, user_name, user_email, txn_id, category, description):
        subject = f"New Support Ticket: {category} (TXN-{txn_id})"
        body = f"""Hello Admin,

A new support ticket has been raised by a user.

User Details:
- Name: {user_name}
- Email: {user_email}

Transaction Details:
- Reference ID: TXN-{txn_id}
- Category: {category}

Issue Description:
{description}

Please investigate and respond to the user at {user_email}.

Best,
VCaptiona System"""
        # Send to the configured system email (admin account)
        return self.send(self.username, subject, body)

    def send(self, to_email, subject, body):
        import sys
        import threading

        if not self.enabled or not self.username or not self.password:
            print(f"[Email] Simulation - Would send to {to_email}: {subject}")
            sys.stdout.flush()
            return True

        def _send_async(u, p, to, sub, cont):
            yag = None
            try:
                # Use explicit host and port for Gmail to be more robust
                yag = yagmail.SMTP(u, p)
                yag.send(to=to, subject=sub, contents=cont)
                print(f"[Email] Successfully sent to {to}: {sub}")
            except Exception as e:
                error_msg = f"[Email Error] Failed to send to {to}: {str(e)}"
                print(error_msg)
                # Log to a file so we can see errors from background threads
                try:
                    with open("email_errors.log", "a") as f:
                        from datetime import datetime
                        f.write(f"{datetime.now().isoformat()} - {error_msg}\n")
                except:
                    pass
            finally:
                if yag:
                    try:
                        yag.close()
                    except:
                        pass
                sys.stdout.flush()

        # Send email in a background thread to avoid blocking the request
        thread = threading.Thread(
            target=_send_async, 
            args=(self.username, self.password, to_email, subject, body)
        )
        thread.start()
        return True


email_service = EmailService()
