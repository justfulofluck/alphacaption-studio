from extensions import db
from datetime import datetime
import json

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

    DEFAULT_FEATURES = {
        'Trial': [
            '2 minutes free transcription',
            'AI transcription with Gemini',
            'Timeline editor',
            'SRT download',
            'Waveform visualization'
        ],
        'Basic': [
            '5 minutes transcription',
            'AI transcription with Gemini',
            'Timeline editor',
            'SRT download',
            'Export captions'
        ],
        'Starter': [
            '60 minutes transcription',
            'Everything in Basic',
            'Priority processing',
            'Multiple export formats',
            'Batch processing'
        ],
        'Professional': [
            '250 minutes transcription',
            'Everything in Starter',
            'Advanced timeline editing',
            'Custom branding',
            'API access'
        ],
        'Business': [
            '1000 minutes transcription',
            'Everything in Professional',
            'Unlimited exports',
            'Priority support',
            'Dedicated account manager'
        ],
        'Admin Lifetime': [
            'Unlimited transcription',
            'Everything in Business',
            'Lifetime free access',
            'All features unlocked'
        ]
    }

    def get_features(self):
        if self.features_json:
            try:
                return json.loads(self.features_json)
            except (json.JSONDecodeError, TypeError):
                pass
        return self.DEFAULT_FEATURES.get(self.name, [])

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'price': self.price,
            'credits_included': self.credits_included,
            'validity_days': self.validity_days,
            'plan_type': self.plan_type,
            'features': self.get_features(),
            'created_at': self.created_at.isoformat()
        }
