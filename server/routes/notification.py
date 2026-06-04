from flask import Blueprint, jsonify, request, current_app
from extensions import db
from models.notification import Notification
import jwt

notification_bp = Blueprint('notification', __name__)

def get_user_from_token():
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    try:
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return None
        token = parts[1]
        decoded = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        user_id = decoded.get('sub') or decoded.get('identity')
        if user_id:
            return int(user_id)
    except Exception as e:
        print(f"Token decode error: {e}")
    return None

@notification_bp.route('', methods=['GET'])
def get_notifications():
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    notifications = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc()).limit(20).all()
    return jsonify([n.to_dict() for n in notifications])

@notification_bp.route('/unread-count', methods=['GET'])
def get_unread_count():
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    count = Notification.query.filter_by(user_id=user_id, is_read=False).count()
    return jsonify({'count': count})

@notification_bp.route('/<int:id>/read', methods=['PUT'])
def mark_read(id):
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    notification = Notification.query.filter_by(id=id, user_id=user_id).first_or_404()
    notification.is_read = True
    db.session.commit()
    return jsonify({'message': 'Marked as read'})

@notification_bp.route('/read-all', methods=['PUT'])
def mark_all_read():
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    Notification.query.filter_by(user_id=user_id, is_read=False).update({'is_read': True})
    db.session.commit()
    return jsonify({'message': 'All marked as read'})
