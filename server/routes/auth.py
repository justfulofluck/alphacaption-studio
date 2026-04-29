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

def generate_otp(email, purpose):
    otp_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    expires_at = datetime.utcnow() + timedelta(minutes=3)
    new_otp = OTP(email=email, purpose=purpose, expires_at=expires_at)
    new_otp.set_otp(otp_code)
    db.session.add(new_otp)
    db.session.commit()
    import sys; sys.stdout.flush()
    success = email_service.send_otp(email, otp_code, purpose)
    return otp_code if success else None

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
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400
    if not otp:
        generated = generate_otp(email, 'registration')
        if not generated:
            return jsonify({'error': 'Failed to send OTP email. Please try again later.'}), 500
        return jsonify({'message': 'OTP sent to your email', 'otp_required': True}), 200
    
    if not verify_otp(email, otp, 'registration'):
        return jsonify({'error': 'Invalid or expired OTP'}), 400
    
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    user = User(
        email=email,
        password=hashed.decode('utf-8'),
        name=name or email.split('@')[0],
        phone=phone or None
    )
    db.session.add(user)
    db.session.commit()
    email_service.send_welcome(user.email, user.name)
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
    from sqlalchemy.sql import func
    
    total_revenue = db.session.query(func.sum(Payment.amount)).scalar() or 0.0
    total_cost = db.session.query(func.sum(Usage.cost_incurred)).scalar() or 0.0
    total_duration = db.session.query(func.sum(Usage.duration_minutes)).scalar() or 0.0
    
    return jsonify({
        'totalUsers': total_users,
        'activeSubscribers': active_subs,
        'totalDurationProcessed': round(total_duration, 2),
        'totalRevenue': f"${round(total_revenue, 2)}",
        'totalCost': f"${round(total_cost, 4)}",
        'margin': f"${round(total_revenue - total_cost, 2)}"
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
        generated = generate_otp(email, 'reset')
        if not generated:
            return jsonify({'error': 'Failed to send OTP email. Please try again later.'}), 500
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