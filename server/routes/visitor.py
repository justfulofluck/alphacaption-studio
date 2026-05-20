from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.visitor import Visitor, VisitorEvent
from models.user import User
from datetime import datetime, date
from sqlalchemy import func

visitor_bp = Blueprint('visitor', __name__)

@visitor_bp.route('/track', methods=['POST'])
def track_visit():
    data = request.get_json() or {}
    session_id = data.get('session_id')
    ip_address = request.remote_addr or data.get('ip', '')
    user_agent = data.get('user_agent', '')[:255]
    page_visited = data.get('page', '/')[:255]

    visitor = Visitor(
        ip_address=ip_address,
        user_agent=user_agent,
        page_visited=page_visited,
        session_id=session_id
    )
    db.session.add(visitor)

    event = VisitorEvent(
        session_id=session_id,
        event_type='page_view',
        event_label='Page Visit',
        page_url=page_visited
    )
    db.session.add(event)
    db.session.commit()

    return jsonify({'status': 'ok'})

@visitor_bp.route('/event', methods=['POST'])
def track_event():
    data = request.get_json() or {}
    session_id = data.get('session_id')
    event_type = data.get('event_type', 'click')[:50]
    event_label = data.get('event_label', 'unknown')[:255]
    page_url = data.get('page_url', '/')[:255]

    event = VisitorEvent(
        session_id=session_id,
        event_type=event_type,
        event_label=event_label,
        page_url=page_url
    )
    db.session.add(event)
    db.session.commit()

    return jsonify({'status': 'ok'})

@visitor_bp.route('/count', methods=['GET'])
def visitor_count():
    today_start = datetime.combine(date.today(), datetime.min.time())
    total_visitors = Visitor.query.count()
    today_visitors = Visitor.query.filter(Visitor.visited_at >= today_start).count()
    return jsonify({
        'totalVisitors': total_visitors,
        'todayVisitors': today_visitors
    })

@visitor_bp.route('/events/recent', methods=['GET'])
@jwt_required()
def recent_events():
    user_id = get_jwt_identity()
    admin = User.query.get(user_id)
    if not admin or admin.role not in ('admin', 'super_admin'):
        return jsonify({'error': 'Unauthorized'}), 403

    events = VisitorEvent.query.order_by(VisitorEvent.created_at.desc()).limit(50).all()
    return jsonify([{
        'id': e.id,
        'event_type': e.event_type,
        'event_label': e.event_label,
        'page_url': e.page_url,
        'created_at': e.created_at.isoformat() if e.created_at else None
    } for e in events])
