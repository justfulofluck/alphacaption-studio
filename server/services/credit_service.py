from extensions import db
from models.credit_ledger import CreditLedger
from sqlalchemy.sql import func

class CreditService:
    @staticmethod
    def get_balance(user_id):
        """
        Calculates the remaining credits for a user by summing up all credit and debit entries.
        """
        # Sum of credits
        credits_sum = db.session.query(func.sum(CreditLedger.amount)).filter(
            CreditLedger.user_id == user_id,
            CreditLedger.type == 'credit'
        ).scalar() or 0
        
        # Sum of debits
        debits_sum = db.session.query(func.sum(CreditLedger.amount)).filter(
            CreditLedger.user_id == user_id,
            CreditLedger.type == 'debit'
        ).scalar() or 0
        
        return credits_sum - debits_sum

    @staticmethod
    def add_credits(user_id, amount, source, reference_id=None):
        """
        Adds credits to a user's account by creating a credit entry in the ledger.
        """
        new_entry = CreditLedger(
            user_id=user_id,
            type='credit',
            amount=amount,
            source=source,
            reference_id=reference_id
        )
        db.session.add(new_entry)
        db.session.commit()
        return new_entry

    @staticmethod
    def deduct_credits(user_id, amount, source, reference_id=None):
        """
        Deducts credits from a user's account by creating a debit entry in the ledger.
        Checks if the user has enough balance before deducting.
        """
        current_balance = CreditService.get_balance(user_id)
        if current_balance < amount:
            raise ValueError(f"Insufficient credits. Required: {amount}, Available: {current_balance}")
            
        new_entry = CreditLedger(
            user_id=user_id,
            type='debit',
            amount=amount,
            source=source,
            reference_id=reference_id
        )
        db.session.add(new_entry)
        db.session.commit()
        
        # Check for low balance and notify
        new_balance = CreditService.get_balance(user_id)
        if new_balance < 5:
            from utils.notification_utils import create_notification
            create_notification(
                user_id=user_id,
                title='Low Credits',
                message=f'You have only {new_balance:.1f} minutes of credit remaining. Top up to keep transcribing!',
                type='warning'
            )
            
        return new_entry

    @staticmethod
    def get_history(user_id, limit=50):
        """
        Returns the credit history for a user.
        """
        return CreditLedger.query.filter_by(user_id=user_id).order_by(CreditLedger.created_at.desc()).limit(limit).all()
