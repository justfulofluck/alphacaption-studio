import os
import sys
from datetime import datetime

# Add the server directory to python path so we can import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from extensions import db
from models.subscription import Subscription
from models.user import User
from services.credit_service import CreditService

def run_expiry_job():
    print(f"[{datetime.utcnow().isoformat()}] Starting subscription expiry job...")
    
    app = create_app()
    with app.app_context():
        now = datetime.utcnow()
        
        # Find all active subscriptions past their expiration date
        expired_subs = Subscription.query.filter(
            Subscription.status == 'active',
            Subscription.end_date < now
        ).all()
        
        processed_count = 0
        for sub in expired_subs:
            print(f"Expiring subscription {sub.id} for user {sub.user_id}")
            sub.status = 'expired'
            
            # Revert user to free plan
            user = User.query.get(sub.user_id)
            if user:
                user.plan = 'free'
                
                # Clear remaining credits
                balance = CreditService.get_balance(user.id)
                if balance > 0:
                    # Deduct the remaining balance
                    CreditService.deduct_credits(
                        user_id=user.id,
                        amount=balance,
                        source='subscription_expiry',
                        reference_id=str(sub.id)
                    )
            
            processed_count += 1
            
        if processed_count > 0:
            db.session.commit()
            print(f"Successfully processed and expired {processed_count} subscriptions.")
        else:
            print("No active subscriptions found that need to be expired.")

        print(f"[{datetime.utcnow().isoformat()}] Expiry job completed.")

if __name__ == "__main__":
    run_expiry_job()
