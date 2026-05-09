from extensions import db
from datetime import datetime

class Payment(db.Model):
    __tablename__ = 'payments'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    plan_id = db.Column(db.Integer, db.ForeignKey('plans.id'), nullable=True)
    amount = db.Column(db.Float, nullable=False)
    payment_gateway = db.Column(db.String(50), default='razorpay') # razorpay, stripe
    status = db.Column(db.String(20), default='pending') # pending, captured, failed
    transaction_id = db.Column(db.String(100), unique=True)
    razorpay_order_id = db.Column(db.String(100), unique=True, nullable=True)
    razorpay_payment_id = db.Column(db.String(100), unique=True, nullable=True)
    razorpay_signature = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        from models.user import User
        user = User.query.get(self.user_id)
        
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_email': user.email if user else "Unknown User",
            'plan_id': self.plan_id,
            'amount': self.amount,
            'currency': 'INR', # Default for now
            'payment_gateway': self.payment_gateway,
            'status': self.status,
            'transaction_id': self.transaction_id or self.razorpay_payment_id or "N/A",
            'razorpay_order_id': self.razorpay_order_id,
            'razorpay_payment_id': self.razorpay_payment_id,
            'created_at': self.created_at.isoformat()
        }
