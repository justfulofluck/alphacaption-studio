from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User
from models.payment import Payment
from models.subscription import Subscription
from models.usage import Usage
from services.credit_service import CreditService

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/overview', methods=['GET'])
@jwt_required()
def get_overview():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Current Plan Details
    current_plan = user.plan
    sub = Subscription.query.filter_by(user_id=user_id, status='active').order_by(Subscription.created_at.desc()).first()
    plan_details = {
        'name': current_plan,
        'valid_until': sub.end_date.isoformat() if sub else None
    }
    
    # Remaining Credits
    remaining_credits = CreditService.get_balance(user_id)
    
    # Usage History (recent 10)
    recent_usage = Usage.query.filter_by(user_id=user_id).order_by(Usage.created_at.desc()).limit(10).all()
    
    # Payment History (recent 10)
    recent_payments = Payment.query.filter_by(user_id=user_id).order_by(Payment.created_at.desc()).limit(10).all()
    
    return jsonify({
        'plan': plan_details,
        'remaining_credits': remaining_credits,
        'usage_history': [u.to_dict() for u in recent_usage],
        'payment_history': [p.to_dict() for p in recent_payments]
    }), 200
