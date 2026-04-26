from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from extensions import db
from models.user import User, OTP
from services.email_service import email_service
import bcrypt
import threading
import random
from datetime import datetime, timedelta
from functools import wraps

auth_bp = Blueprint('auth', __name__)

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = get_jwt_identity()
        if not user_id:
            return jsonify({'error': 'Token missing identity'}), 401
        try:
            db_id = int(user_id)
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid token identity'}), 401
        admin = User.query.get(db_id)
        if not admin or admin.role not in ('admin', 'super_admin'):
            return jsonify({'error': 'Access denied. Admin privileges required.'}), 403
        return f(*args, **kwargs)
    return decorated_function

def generate_otp(email, purpose):
    otp_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    expires_at = datetime.utcnow() + timedelta(minutes=3)
    new_otp = OTP(email=email, purpose=purpose, expires_at=expires_at)
    new_otp.set_otp(otp_code)
    db.session.add(new_otp)
    db.session.commit()
    
    print(f'[Auth] Sending OTP email to {email} ({purpose})')
    import sys; sys.stdout.flush()
    
    # Send synchronously to ensure delivery
    return email_service.send_otp(email, otp_code, purpose)

# send_otp_safe is removed as it's no longer needed for synchronous OTP sending

def verify_otp(email, otp_code, purpose):
    if not otp_code:
        return False
    # Check for valid OTP (within last 3 mins, not yet verified)
    otp_record = OTP.query.filter_by(
        email=email, 
        purpose=purpose, 
        is_verified=False
    ).order_by(OTP.created_at.desc()).first()
    
    if otp_record and otp_record.expires_at > datetime.utcnow():
        if otp_record.verify_otp(otp_code):
            otp_record.is_verified = True
            db.session.commit()
            return True
    return False

@auth_bp.route('/register', methods=['POST'])
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
    
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400

    if not otp:
        if generate_otp(email, 'registration'):
            return jsonify({'message': 'OTP sent to your email', 'otp_required': True}), 200
        else:
            return jsonify({'error': 'Failed to send OTP email. Please check your email address or try again later.'}), 500
    
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
    
    # Send welcome email in background
    threading.Thread(target=send_welcome_safe, args=(user.email, user.name)).start()
    
    token = create_access_token(identity=str(user.id))
    
    return jsonify({
        'message': 'Registration successful',
        'user': user.to_dict(),
        'token': token
    }), 201

def send_welcome_safe(email, name):
    try:
        email_service.send_welcome(email, name)
    except Exception as e:
        print(f'[Auth] Failed to send welcome email to {email}: {str(e)}')

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    print(f"[Auth] Login attempt for email: {email}")
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    
    user = User.query.filter_by(email=email).first()
    
    if not user:
        print(f"[Auth] Login failed: User not found for {email}")
        return jsonify({'error': 'Invalid email or password'}), 401
    
    if not bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8')):
        print(f"[Auth] Login failed: Password mismatch for {email}")
        return jsonify({'error': 'Invalid email or password'}), 401
    
    # Create token with string identity for consistency
    print(f"[Auth] Login success for {email}")
    token = create_access_token(identity=str(user.id))
    print(f"Login success - User ID: {user.id}, Token created")
    
    return jsonify({
        'message': 'Login successful',
        'user': user.to_dict(),
        'token': token
    })


@auth_bp.route('/admin/login', methods=['POST'])
def admin_login():
    """Server-side admin authentication endpoint"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    
    # Basic rate limiting could be added here
    
    user = User.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    if not bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8')):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Server-side role validation - ONLY allow admin/super_admin roles
    if user.role not in ('admin', 'super_admin'):
        return jsonify({'error': 'Access denied. Admin privileges required.'}), 403
    
    token = create_access_token(identity=str(user.id))
    
    return jsonify({
        'message': 'Admin login successful',
        'user': user.to_dict(),
        'token': token
    })

@auth_bp.route('/reset-password-request', methods=['POST'])
def reset_password_request():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    
    user = User.query.filter_by(email=email).first()
    if not user:
        # Don't reveal user existence, but return "OTP sent" anyway or similar
        return jsonify({'message': 'If an account exists, an OTP has been sent'})
    
    if generate_otp(email, 'reset'):
        return jsonify({'message': 'OTP sent to your email', 'otp_required': True})
    else:
        return jsonify({'error': 'Failed to send OTP email. Please try again later.'}), 500

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    otp = data.get('otp', '')
    new_password = data.get('new_password', '')
    
    if not email or not otp or not new_password:
        return jsonify({'error': 'Email, OTP, and new password are required'}), 400
    
    if len(new_password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400
    
    if not verify_otp(email, otp, 'reset'):
        return jsonify({'error': 'Invalid or expired OTP'}), 400
    
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    user.password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    db.session.commit()
    
    return jsonify({'message': 'Password reset successful'})


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Logout endpoint - client should remove token from storage"""
    return jsonify({'message': 'Logged out successfully'}), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        user_id = get_jwt_identity()
        print(f"[Auth] Validating session for user_id: {user_id}")
        
        if user_id is None:
            return jsonify({'error': 'Token missing identity'}), 401
        
        # Convert to integer for DB lookup
        try:
            db_id = int(user_id)
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid token identity'}), 401

        user = User.query.get(db_id)
        
        if not user:
            print(f"[Auth] User {db_id} not found in database")
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify(user.to_dict())
    except Exception as e:
        print(f"[Auth] Error in /me endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Session validation failed', 'details': str(e)}), 401

@auth_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        user_id = get_jwt_identity()
        try:
            db_id = int(user_id)
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid token identity'}), 422
            
        user = User.query.get(db_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        if 'name' in data:
            user.name = data['name'].strip()
        if 'phone' in data:
            user.phone = data['phone'].strip() or None
        
        db.session.commit()
        
        return jsonify({
            'message': 'Profile updated',
            'user': user.to_dict()
        })
    except Exception as e:
        return jsonify({'error': 'Update failed', 'details': str(e)}), 422

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    try:
        user_id = get_jwt_identity()
        try:
            db_id = int(user_id)
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid token identity'}), 422
            
        user = User.query.get(db_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')
        
        if not bcrypt.checkpw(current_password.encode('utf-8'), user.password.encode('utf-8')):
            return jsonify({'error': 'Current password is incorrect'}), 401
        
        if len(new_password) < 8:
            return jsonify({'error': 'New password must be at least 8 characters'}), 400
        
        user.password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        db.session.commit()
        
        return jsonify({'message': 'Password changed successfully'})
    except Exception as e:
        return jsonify({'error': 'Operation failed', 'details': str(e)}), 422

@auth_bp.route('/admin/users', methods=['GET'])
@jwt_required()
@admin_required
def admin_list_users():
    try:
        users = User.query.all()
        return jsonify([u.to_dict() for u in users])
    except Exception as e:
        return jsonify({'error': 'Failed to fetch users', 'details': str(e)}), 422

@auth_bp.route('/admin/stats', methods=['GET'])
@jwt_required()
@admin_required
def admin_stats():
    try:
        total_users = User.query.count()
        # Mocking some stats that aren't in DB yet for visual completeness
        return jsonify({
            'totalUsers': total_users,
            'activeSubscribers': User.query.filter(User.plan != 'free').count(),
            'totalTokensUsed': 1520000, # Example placeholder
            'monthlyRevenue': f"${total_users * 10}" # Example placeholder
        })
    except Exception as e:
        return jsonify({'error': 'Failed to fetch stats', 'details': str(e)}), 422
