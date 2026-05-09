from extensions import db
from datetime import datetime

class Usage(db.Model):
    __tablename__ = 'usage'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    file_name = db.Column(db.String(255))
    duration_minutes = db.Column(db.Float, default=0)
    credits_used = db.Column(db.Integer, default=0)
    cost_incurred = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'file_name': self.file_name,
            'duration_minutes': self.duration_minutes,
            'credits_used': self.credits_used,
            'cost_incurred': self.cost_incurred,
            'created_at': self.created_at.isoformat()
        }
