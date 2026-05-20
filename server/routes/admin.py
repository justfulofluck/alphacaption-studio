from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.user import User
from models.payment import Payment
from models.credit_ledger import CreditLedger
from models.plan import Plan
from services.credit_service import CreditService

admin_bp = Blueprint('admin', __name__)

def check_admin():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.role not in ('admin', 'super_admin'):
        return False
    return True

@admin_bp.route('/ledger', methods=['GET'])
@jwt_required()
def get_global_ledger():
    if not check_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    
    entries = CreditLedger.query.order_by(CreditLedger.created_at.desc()).all()
    return jsonify([e.to_dict() for e in entries])

@admin_bp.route('/payments', methods=['GET'])
@jwt_required()
def get_global_payments():
    if not check_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    
    payments = Payment.query.order_by(Payment.created_at.desc()).all()
    return jsonify([p.to_dict() for p in payments])

@admin_bp.route('/users/<int:user_id>/add-credits', methods=['POST'])
@jwt_required()
def admin_add_credits(user_id):
    if not check_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.get_json()
    amount = data.get('amount')
    reason = data.get('reason', 'Admin adjustment')
    
    if not amount or amount <= 0:
        return jsonify({'error': 'Invalid amount'}), 400
    
    # Use CreditService to add credits (as a credit entry)
    entry = CreditLedger(
        user_id=user_id,
        amount=amount,
        type='credit',
        description=reason
    )
    db.session.add(entry)
    db.session.commit()
    
    return jsonify({
        'message': f'Added {amount} credits to user {user_id}',
        'new_balance': CreditService.get_balance(user_id)
    })

@admin_bp.route('/plans', methods=['GET', 'POST'])
@jwt_required()
def manage_plans():
    if not check_admin():
        return jsonify({'error': 'Unauthorized'}), 403
        
    if request.method == 'POST':
        data = request.get_json()
        plan = Plan(
            name=data['name'],
            price=data['price'],
            credits_included=data['credits_included'],
            validity_days=data['validity_days'],
            features_json=data.get('features', '{}')
        )
        db.session.add(plan)
        db.session.commit()
        return jsonify(plan.to_dict()), 201
        
    plans = Plan.query.all()
    return jsonify([p.to_dict() for p in plans])

@admin_bp.route('/plans/<int:plan_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def manage_plan_by_id(plan_id):
    if not check_admin():
        return jsonify({'error': 'Unauthorized'}), 403
        
    plan = Plan.query.get_or_404(plan_id)
    
    if request.method == 'DELETE':
        db.session.delete(plan)
        db.session.commit()
        return '', 204
        
    data = request.get_json()
    if 'name' in data:
        plan.name = data['name']
    if 'price' in data:
        plan.price = data['price']
    if 'credits_included' in data:
        plan.credits_included = data['credits_included']
    if 'validity_days' in data:
        plan.validity_days = data['validity_days']
    if 'features' in data:
        plan.features_json = data['features']
        
    db.session.commit()
    return jsonify(plan.to_dict())

@admin_bp.route('/users/<int:user_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def manage_user(user_id):
    if not check_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    target_user = User.query.get_or_404(user_id)
    
    # Prevent non-super-admins from modifying super-admin accounts
    if current_user.role != 'super_admin' and target_user.role == 'super_admin':
        return jsonify({'error': 'Cannot modify a super admin account'}), 403
    
    if request.method == 'DELETE':
        if current_user_id == user_id:
            return jsonify({'error': 'Cannot delete your own account'}), 400
        db.session.delete(target_user)
        db.session.commit()
        return '', 204
    
    data = request.get_json()
    if 'role' in data:
        new_role = data['role']
        # Prevent role self-escalation or self-demotion accidentally
        if current_user_id == user_id and target_user.role != new_role:
            return jsonify({'error': 'Cannot change your own role'}), 403
            
        # Prevent non-super-admins from granting super_admin powers
        if current_user.role != 'super_admin' and new_role == 'super_admin':
            return jsonify({'error': 'Only a super admin can grant super admin privileges'}), 403
            
        target_user.role = new_role
        
    if 'plan' in data:
        target_user.plan = data['plan']
    if 'status' in data:
        pass
        
    db.session.commit()
    return jsonify(target_user.to_dict())

@admin_bp.route('/ledger-matrix', methods=['GET'])
@jwt_required()
def get_ledger_matrix():
    if not check_admin():
        return jsonify({'error': 'Unauthorized'}), 403
    
    users = User.query.all()
    result = []
    
    for i, user in enumerate(users):
        ledgers = CreditLedger.query.filter_by(user_id=user.id).order_by(CreditLedger.created_at.desc()).all()
        
        latest_payment = Payment.query.filter_by(user_id=user.id, status='captured').order_by(Payment.created_at.desc()).first()
        payment_status = "Paid" if latest_payment else ("Free" if user.plan in ['free', 'Trial'] else "Unpaid")
        
        plan_amount = f"{user.plan.capitalize()} | ₹{latest_payment.amount if latest_payment else 0}"
        
        from models.subscription import Subscription
        sub = Subscription.query.filter_by(user_id=user.id).order_by(Subscription.end_date.desc()).first()
        if sub:
            dates_info = f"{sub.start_date.strftime('%d-%b-%y')}\n{sub.end_date.strftime('%d-%b-%y')}"
        else:
            dates_info = "N/A"
            
        total_credits = sum(l.amount for l in ledgers if l.type == 'credit')
        used_credits = sum(l.amount for l in ledgers if l.type == 'debit')
        credits_info = f"{used_credits} / {total_credits}"
        
        result.append({
            'sr_no': i + 1,
            'user_id_display': f"U{str(user.id).zfill(3)}",
            'user_name': user.name,
            'user_email': user.email,
            'mobile_number': user.phone or 'N/A',
            'signup_date': user.created_at.strftime('%d-%b-%y') if user.created_at else 'N/A',
            'credits_info': credits_info,
            'plan_amount': plan_amount,
            'dates_info': dates_info,
            'payment_status': payment_status,
            'last_login': user.last_login_at.strftime('%d-%b-%Y') if user.last_login_at else 'N/A',
            'transactions': [l.to_dict() for l in ledgers]
        })
        
    return jsonify(result)
