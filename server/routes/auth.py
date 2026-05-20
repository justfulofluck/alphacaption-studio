from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from extensions import db
from models.user import User, OTP
from services.email_service import email_service
import bcrypt
import threading
import random
from datetime import datetime, timedelta
from extensions import limiter

auth_bp = Blueprint('auth', __name__)


def assign_trial_plan(user):
    from models.credit_ledger import CreditLedger
    from models.plan import Plan
    from models.subscription import Subscription

    trial_plan = Plan.query.filter_by(name='Trial').first()
    if not trial_plan:
        trial_plan = Plan(
            name='Trial',
            price=0,
            credits_included=5,
            validity_days=3,
            plan_type='trial'
        )
        db.session.add(trial_plan)
        db.session.flush()
    elif trial_plan.credits_included != 5:
        trial_plan.credits_included = 5

    now = datetime.utcnow()
    subscription = Subscription(
        user_id=user.id,
        plan_id=trial_plan.id,
        start_date=now,
        end_date=now + timedelta(days=trial_plan.validity_days),
        status='active'
    )
    db.session.add(subscription)

    from services.credit_service import CreditService
    CreditService.add_credits(
        user_id=user.id,
        amount=trial_plan.credits_included,
        source='trial',
        reference_id=str(trial_plan.id),
        description="Welcome Trial Credits"
    )
    user.plan = trial_plan.name

def generate_otp(email, purpose):
    otp_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    expires_at = datetime.utcnow() + timedelta(minutes=3)
    new_otp = OTP(email=email, purpose=purpose, expires_at=expires_at)
    new_otp.set_otp(otp_code)
    db.session.add(new_otp)
    db.session.commit()
    email_service.send_otp(email, otp_code, purpose)
    return otp_code

def verify_otp(email, otp_code, purpose):
    if not otp_code:
        return False
    otp_record = OTP.query.filter_by(
        email=email, 
        purpose=purpose, 
        is_verified=False
    ).order_by(OTP.created_at.desc()).first()
    
    if otp_record and otp_record.is_valid() and otp_record.verify_otp(otp_code):
        otp_record.is_verified = True
        db.session.commit()
        return True
    return False

@auth_bp.route('/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    name = data.get('name', '').strip()
    phone = data.get('mobile', '').strip()
    otp = data.get('otp', '')
    
    import re
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
        
    # Name validation
    if len(name) < 2:
        return jsonify({'error': 'Please enter a valid full name (at least 2 characters)'}), 400
        
    # Password validation: 8+ chars, at least one number or symbol
    if len(password) < 8 or not re.search(r"[0-9!@#$%^&*(),.?\":{}|<>]", password):
        return jsonify({'error': 'Password must be at least 8 characters and include a number or symbol'}), 400
        
    # Mobile validation: Exactly 10 digits
    clean_phone = re.sub(r"\D", "", phone)
    if phone and len(clean_phone) != 10:
        return jsonify({'error': 'Please enter a valid 10-digit mobile number'}), 400
        
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400
        
    if not otp:
        generate_otp(email, 'registration')
        return jsonify({'message': 'OTP sent to your email', 'otp_required': True}), 200
    
    if not verify_otp(email, otp, 'registration'):
        return jsonify({'error': 'Invalid or expired OTP'}), 400
    
    try:
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        user = User(
            email=email,
            password=hashed.decode('utf-8'),
            name=name or email.split('@')[0],
            phone=phone or None
        )
        db.session.add(user)
        db.session.flush()
        assign_trial_plan(user)
        db.session.commit()
        
        try:
            email_service.send_welcome(user.email, user.name)
        except Exception as e:
            print(f"[Auth] Welcome email failed: {e}")
            
        token = create_access_token(identity=user.id)
        
        from flask_jwt_extended import decode_token
        user.current_jti = decode_token(token)['jti']
        db.session.commit()
        
        from services.credit_service import CreditService
        user_data = user.to_dict()
        user_data['credits'] = CreditService.get_balance(user.id)
        
        return jsonify({
            'message': 'Registration successful',
            'user': user_data,
            'token': token
        }), 201
    except Exception as e:
        db.session.rollback()
        print(f"[Auth] Registration error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@auth_bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'Invalid email or password'}), 401
        
    if user.locked_until and user.locked_until > datetime.utcnow():
        return jsonify({'error': 'Account is locked due to too many failed attempts'}), 403
        
    if not bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8')):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= 5:
            user.locked_until = datetime.utcnow() + timedelta(minutes=15)
        db.session.commit()
        return jsonify({'error': 'Invalid email or password'}), 401
        
    # Successful login
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = datetime.utcnow()
    
    token = create_access_token(identity=user.id)
    from flask_jwt_extended import decode_token
    user.current_jti = decode_token(token)['jti']
    db.session.commit()
    
    from services.credit_service import CreditService
    user_data = user.to_dict()
    user_data['credits'] = CreditService.get_balance(user.id)
    
    return jsonify({
        'message': 'Login successful',
        'user': user_data,
        'token': token
    })

@auth_bp.route('/admin/login', methods=['POST'])
@limiter.limit("5 per minute")
def admin_login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401
        
    if user.locked_until and user.locked_until > datetime.utcnow():
        return jsonify({'error': 'Account is locked due to too many failed attempts'}), 403
        
    if not bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8')):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= 5:
            user.locked_until = datetime.utcnow() + timedelta(minutes=15)
        db.session.commit()
        return jsonify({'error': 'Invalid credentials'}), 401
        
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = datetime.utcnow()
    
    token = create_access_token(identity=user.id)
    from flask_jwt_extended import decode_token
    user.current_jti = decode_token(token)['jti']
    db.session.commit()
    
    from services.credit_service import CreditService
    user_data = user.to_dict()
    user_data['credits'] = CreditService.get_balance(user.id)
    
    return jsonify({
        'message': 'Admin login successful',
        'user': user_data,
        'token': token
    })

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    from services.credit_service import CreditService
    user_data = user.to_dict()
    user_data['credits'] = CreditService.get_balance(user.id)
    return jsonify(user_data)

@auth_bp.route('/vertex-token', methods=['GET'])
def get_vertex_token():
    import os
    import google.auth
    import google.auth.transport.requests
    try:
        temp_token = os.environ.get('TEMP_VERTEX_TOKEN')
        if temp_token:
            return jsonify({
                'token': temp_token,
                'project': os.environ.get('GCP_PROJECT_ID', 'vcaptiona-srt-494215'),
                'location': os.environ.get('GCP_REGION', 'us-central1')
            })

        credentials, project = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        request = google.auth.transport.requests.Request()
        credentials.refresh(request)
        return jsonify({
            'token': credentials.token,
            'expiry': credentials.expiry.isoformat() if credentials.expiry else None,
            'project': os.environ.get('GCP_PROJECT_ID', project or 'vcaptiona-srt-494215'),
            'location': os.environ.get('GCP_REGION', 'us-central1')
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/admin/users', methods=['GET'])
@jwt_required()
def get_admin_users():
    user_id = get_jwt_identity()
    admin = User.query.get(user_id)
    if not admin or admin.role not in ('admin', 'super_admin'):
        return jsonify({'error': 'Unauthorized'}), 403
    
    users = User.query.all()
    user_list = []
    for u in users:
        user_list.append({
            'id': u.id,
            'name': u.name,
            'email': u.email,
            'plan': u.plan,
            'role': u.role,
            'status': 'active',
            'joinedAt': u.created_at.isoformat() if u.created_at else None
        })
    return jsonify(user_list)

@auth_bp.route('/admin/stats', methods=['GET'])
@jwt_required()
def get_admin_stats():
    user_id = get_jwt_identity()
    admin = User.query.get(user_id)
    if not admin or admin.role not in ('admin', 'super_admin'):
        return jsonify({'error': 'Unauthorized'}), 403
    
    total_users = User.query.count()
    active_subs = User.query.filter(User.plan != 'free').count()
    
    from models.payment import Payment
    from models.usage import Usage
    from models.visitor import Visitor, VisitorEvent
    from sqlalchemy.sql import func
    
    total_revenue = db.session.query(func.sum(Payment.amount)).filter(Payment.status == 'captured').scalar() or 0.0
    total_cost = db.session.query(func.sum(Usage.cost_incurred)).scalar() or 0.0
    total_duration = db.session.query(func.sum(Usage.duration_minutes)).scalar() or 0.0
    
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    total_visitors = Visitor.query.count()
    today_visitors = Visitor.query.filter(Visitor.visited_at >= today_start).count()
    
    return jsonify({
        'totalUsers': total_users,
        'activeSubscribers': active_subs,
        'totalDurationProcessed': round(total_duration, 2),
        'totalRevenue': f"₹{round(total_revenue, 2)}",
        'totalCost': f"₹{round(total_cost, 4)}",
        'margin': f"₹{round(total_revenue - total_cost, 2)}",
        'totalVisitors': total_visitors,
        'todayVisitors': today_visitors
    })

@auth_bp.route('/reset-password-request', methods=['POST'])
@limiter.limit("3 per minute")
def reset_password_request():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    user = User.query.filter_by(email=email).first()
    if user:
        print(f"[Auth] Password reset requested for existing user: {email}")
        generate_otp(email, 'reset')
    else:
        print(f"[Auth] Password reset requested for non-existent email: {email}")
    return jsonify({'message': 'If an account exists with this email, an OTP has been sent.'})

@auth_bp.route('/reset-password', methods=['POST'])
@limiter.limit("3 per minute")
def reset_password():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    otp = data.get('otp', '')
    new_password = data.get('password') or data.get('new_password')
    if not all([email, otp, new_password]):
        return jsonify({'error': 'All fields are required'}), 400
    if not verify_otp(email, otp, 'reset'):
        return jsonify({'error': 'Invalid or expired OTP'}), 400
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
    user.password = hashed.decode('utf-8')
    user.password_changed_at = datetime.utcnow()
    user.current_jti = None  # Immediately log out all current devices
    db.session.commit()
    return jsonify({'message': 'Password reset successful'})

@auth_bp.route('/admin/reset-password-request', methods=['POST'])
@limiter.limit("3 per minute")
def admin_reset_password_request():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    
    user = User.query.filter_by(email=email).first()
    # Only send OTP if the user exists AND is an admin
    if user and user.role in ('admin', 'super_admin'):
        print(f"[Auth] Admin password reset requested for: {email}")
        generate_otp(email, 'admin_reset')
    else:
        print(f"[Auth] Admin password reset failed/skipped for: {email} (User found: {bool(user)}, Role: {user.role if user else 'N/A'})")
            
    # Always return same message for security
    return jsonify({'message': 'If an admin account exists, an OTP has been sent.'})
@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    data = request.get_json()
    name = data.get('name', '').strip()
    phone = data.get('phone', '').strip()
    
    if name:
        user.name = name
    if phone:
        user.phone = phone
        
    db.session.commit()
    return jsonify({
        'message': 'Profile updated successfully',
        'user': user.to_dict()
    })

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    data = request.get_json()
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    
    if not old_password or not new_password:
        return jsonify({'error': 'Missing password fields'}), 400
        
    # Verify old password
    if not bcrypt.checkpw(old_password.encode('utf-8'), user.password.encode('utf-8')):
        return jsonify({'error': 'Incorrect current password'}), 401
        
    # Update password
    hashed_pw = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    user.password = hashed_pw
    
    # SECURITY: Invalidate current JTI so all existing tokens become invalid
    user.current_jti = None 
    user.password_changed_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({'message': 'Password changed successfully. Please log in again.'})

@auth_bp.route('/admin/reset-password', methods=['POST'])
@limiter.limit("3 per minute")
def admin_reset_password():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    otp = data.get('otp', '')
    new_password = data.get('password') or data.get('new_password')
    
    if not all([email, otp, new_password]):
        return jsonify({'error': 'All fields are required'}), 400
        
    if not verify_otp(email, otp, 'admin_reset'):
        return jsonify({'error': 'Invalid or expired OTP'}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user or user.role not in ('admin', 'super_admin'):
        return jsonify({'error': 'Unauthorized account access'}), 403
        
    hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
    user.password = hashed.decode('utf-8')
    user.password_changed_at = datetime.utcnow()
    user.current_jti = None  # Force logout from all devices
    db.session.commit()
    
    return jsonify({'message': 'Admin password reset successful'})

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    from flask_jwt_extended import get_jwt
    from models.token_blocklist import TokenBlocklist
    jti = get_jwt()["jti"]
    
    # Store the JTI in the blocklist to revoke token
    db.session.add(TokenBlocklist(jti=jti))
    db.session.commit()
    
    return jsonify({"message": "Successfully logged out"}), 200
