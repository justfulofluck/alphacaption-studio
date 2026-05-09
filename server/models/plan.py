from extensions import db
from datetime import datetime

class Plan(db.Model):
    __tablename__ = 'plans'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)
    credits_included = db.Column(db.Integer, nullable=False)
    validity_days = db.Column(db.Integer, default=30)
    plan_type = db.Column(db.String(20), default='subscription') # subscription, top_up
    features_json = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'price': self.price,
            'credits_included': self.credits_included,
            'validity_days': self.validity_days,
            'plan_type': self.plan_type,
            'created_at': self.created_at.isoformat()
        }
