from extensions import db
from datetime import datetime

class CreditLedger(db.Model):
    __tablename__ = 'credit_ledger'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    type = db.Column(db.String(10), nullable=False) # credit, debit
    amount = db.Column(db.Integer, nullable=False) # Store in minutes or custom units
    source = db.Column(db.String(50), nullable=False) # subscription, usage, bonus, topup
    reference_id = db.Column(db.String(100)) # ID of payment or usage record
    description = db.Column(db.String(255)) # Description of transaction
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        from models.user import User
        user = User.query.get(self.user_id)
        
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_email': user.email if user else "Unknown User",
            'type': self.type,
            'amount': self.amount,
            'source': self.source.replace('_', ' ').capitalize(),
            'description': self.description or f"{self.source.capitalize()} transaction", 
            'reference_id': self.reference_id,
            'created_at': self.created_at.isoformat()
        }
