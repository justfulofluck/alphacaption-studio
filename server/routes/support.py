from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from models.user import User
from services.email_service import email_service

support_bp = Blueprint('support', __name__)

@support_bp.route('/report', methods=['POST', 'OPTIONS'])
def report_issue():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    # Manually verify JWT for POST requests
    verify_jwt_in_request()
    
    print(f"[Support] New issue report from user {get_jwt_identity()}")
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.json
    txn_id = data.get('txn_id')
    category = data.get('category')
    description = data.get('description')
    
    if not all([txn_id, category, description]):
        return jsonify({'error': 'Missing required fields'}), 400
        
    # Send email to admin
    email_service.send_support_ticket(
        user_name=user.name,
        user_email=user.email,
        txn_id=txn_id,
        category=category,
        description=description
    )
    
    return jsonify({'message': 'Support ticket raised successfully'})
