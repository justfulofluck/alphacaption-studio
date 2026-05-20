from extensions import db
from datetime import datetime

class Visitor(db.Model):
    __tablename__ = 'visitors'

    id = db.Column(db.Integer, primary_key=True)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(255))
    page_visited = db.Column(db.String(255))
    visited_at = db.Column(db.DateTime, default=datetime.utcnow)
    session_id = db.Column(db.String(36))

class VisitorEvent(db.Model):
    __tablename__ = 'visitor_events'

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(36))
    event_type = db.Column(db.String(50))
    event_label = db.Column(db.String(255))
    page_url = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
