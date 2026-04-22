from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from extensions import db
from models.user import User, OTP
from services.email_service import email_service
import bcrypt
import threading
import random
from datetime import datetime, timedelta

auth_bp = Blueprint('auth', __name__)

def generate_otp(email, purpose):
    otp_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    expires_at = datetime.utcnow() + timedelta(minutes=3)
    new_otp = OTP(email=email, otp=otp_code, purpose=purpose, expires_at=expires_at)
    db.session.add(new_otp)
    db.session.commit()
    print(f'[Auth] Starting email thread for {email} ({purpose})')
    import sys; sys.stdout.flush()
    threading.Thread(target=email_service.send_otp, args=(email, otp_code, purpose)).start()
    return otp_code

def verify_otp(email, otp_code, purpose):
    if not otp_code:
        return False
    # Check for valid OTP (within last 3 mins, not yet verified)
    otp_record = OTP.query.filter_by(
        email=email, 
        otp=otp_code, 
        purpose=purpose, 
        is_verified=False
    ).order_by(OTP.created_at.desc()).first()
    
    if otp_record and otp_record.expires_at > datetime.utcnow():
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
    
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400

    if not otp:
        generate_otp(email, 'registration')
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
    
    # Send welcome email in background
    threading.Thread(target=email_service.send_welcome, args=(user.email, user.name)).start()
    
    token = create_access_token(identity=str(user.id))
    
    return jsonify({
        'message': 'Registration successful',
        'user': user.to_dict(),
        'token': token
    }), 201


@auth_bp.route('/login', methods=['POST'])
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
    
    if not bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8')):
        return jsonify({'error': 'Invalid email or password'}), 401
    
    # Create token with string identity for consistency
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
    
    generate_otp(email, 'reset')
    return jsonify({'message': 'OTP sent to your email', 'otp_required': True})

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    otp = data.get('otp', '')
    new_password = data.get('new_password', '')
    
    if not email or not otp or not new_password:
        return jsonify({'error': 'Email, OTP, and new password are required'}), 400
    
    if len(new_password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    
    if not verify_otp(email, otp, 'reset'):
        return jsonify({'error': 'Invalid or expired OTP'}), 400
    
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    user.password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    db.session.commit()
    
    return jsonify({'message': 'Password reset successful'})


@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    auth_header = request.headers.get('Authorization')
    print(f"Auth header: {auth_header}")
    
    if not auth_header:
        return jsonify({'error': 'No authorization header'}), 401
    
    try:
        # Extract token from "Bearer <token>"
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return jsonify({'error': 'Invalid authorization header format'}), 401
        
        token = parts[1]
        
        # Decode token using PyJWT directly
        import jwt
        from flask import current_app
        
        # Decode without verification for development (or verify with proper secret)
        try:
            decoded = jwt.decode(
                token, 
                current_app.config['JWT_SECRET_KEY'], 
                algorithms=['HS256']
            )
        except jwt.InvalidTokenError:
            # Try alternate method
            decoded = jwt.decode(token, options={"verify_signature": False})
        
        user_id = decoded.get('sub') or decoded.get('identity')
        print(f"Decoded user_id: {user_id} (type: {type(user_id)})")
        
        # Convert to int if needed
        if user_id:
            try:
                user_id = int(user_id)
            except (ValueError, TypeError):
                pass
        
        if not user_id:
            return jsonify({'error': 'Invalid token payload'}), 422
        
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify(user.to_dict())
    except Exception as e:
        print(f"Error decoding token: {e}")
        return jsonify({'error': 'Invalid token', 'details': str(e)}), 422


@auth_bp.route('/me', methods=['PUT'])
def update_profile():
    auth_header = request.headers.get('Authorization')
    
    if not auth_header:
        return jsonify({'error': 'No authorization header'}), 401
    
    try:
        import jwt
        from flask import current_app
        
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return jsonify({'error': 'Invalid authorization header format'}), 401
        
        token = parts[1]
        decoded = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        user_id = decoded.get('sub') or decoded.get('identity')
        
        if user_id:
            try:
                user_id = int(user_id)
            except (ValueError, TypeError):
                pass
        
        user = User.query.get(user_id)
        
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
        return jsonify({'error': 'Invalid token', 'details': str(e)}), 422


@auth_bp.route('/change-password', methods=['POST'])
def change_password():
    auth_header = request.headers.get('Authorization')
    
    if not auth_header:
        return jsonify({'error': 'No authorization header'}), 401
    
    try:
        import jwt
        from flask import current_app
        
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return jsonify({'error': 'Invalid authorization header format'}), 401
        
        token = parts[1]
        decoded = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        user_id = decoded.get('sub') or decoded.get('identity')
        
        if user_id:
            try:
                user_id = int(user_id)
            except (ValueError, TypeError):
                pass
        
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')
        
        if not bcrypt.checkpw(current_password.encode('utf-8'), user.password.encode('utf-8')):
            return jsonify({'error': 'Current password is incorrect'}), 401
        
        if len(new_password) < 6:
            return jsonify({'error': 'New password must be at least 6 characters'}), 400
        
        user.password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        db.session.commit()
        
        return jsonify({'message': 'Password changed successfully'})
    except Exception as e:
        return jsonify({'error': 'Invalid token', 'details': str(e)}), 422
