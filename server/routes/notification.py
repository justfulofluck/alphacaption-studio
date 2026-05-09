from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.notification import Notification

notification_bp = Blueprint('notification', __name__)

@notification_bp.route('', methods=['GET'])
@jwt_required()
def get_notifications():
    user_id = get_jwt_identity()
    # Return last 20 notifications
    notifications = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc()).limit(20).all()
    return jsonify([n.to_dict() for n in notifications])

@notification_bp.route('/unread-count', methods=['GET'])
@jwt_required()
def get_unread_count():
    user_id = get_jwt_identity()
    count = Notification.query.filter_by(user_id=user_id, is_read=False).count()
    return jsonify({'count': count})

@notification_bp.route('/<int:id>/read', methods=['PUT'])
@jwt_required()
def mark_read(id):
    user_id = get_jwt_identity()
    notification = Notification.query.filter_by(id=id, user_id=user_id).first_or_404()
    notification.is_read = True
    db.session.commit()
    return jsonify({'message': 'Marked as read'})

@notification_bp.route('/read-all', methods=['PUT'])
@jwt_required()
def mark_all_read():
    user_id = get_jwt_identity()
    Notification.query.filter_by(user_id=user_id, is_read=False).update({'is_read': True})
    db.session.commit()
    return jsonify({'message': 'All marked as read'})
