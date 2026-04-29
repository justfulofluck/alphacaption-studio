from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
import os
from extensions import db, migrate, jwt, limiter

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    limiter.init_app(app)
    CORS(app, resources={r"/*": {"origins": "*", "supports_credentials": True}}, methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], allow_headers=["Content-Type", "Authorization"])
    
    # JWT error handlers
    @jwt.invalid_token_loader
    def invalid_token_callback(error_string):
        print(f"JWT Invalid Token: {error_string}")
        return jsonify({'error': 'Invalid token', 'message': error_string}), 422
    
    @jwt.unauthorized_loader
    def unauthorized_callback(error_string):
        print(f"JWT Unauthorized: {error_string}")
        return jsonify({'error': 'No token provided'}), 422
    
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Token expired'}), 422
        
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        from models.token_blocklist import TokenBlocklist
        from models.user import User
        from datetime import datetime
        jti = jwt_payload["jti"]
        if TokenBlocklist.is_jti_blacklisted(jti):
            return True
            
        user_id = jwt_payload.get("sub")
        if user_id:
            user = User.query.get(user_id)
            if user:
                # Concurrent session enforcement (deny old browser sessions)
                if user.current_jti and user.current_jti != jti:
                    return True
                    
                if user.password_changed_at:
                    iat = jwt_payload.get("iat")
                    if iat and datetime.utcfromtimestamp(iat) < user.password_changed_at:
                        return True
        return False
    
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    from routes.auth import auth_bp
    from routes.projects import projects_bp
    from routes.captions import captions_bp
    from routes.payment import payment_bp
    from routes.credit import credit_bp
    from routes.admin import admin_bp
    from routes.dashboard import dashboard_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(projects_bp, url_prefix='/api/projects')
    app.register_blueprint(captions_bp, url_prefix='/api/captions')
    app.register_blueprint(payment_bp, url_prefix='/api/payment')
    app.register_blueprint(credit_bp, url_prefix='/api/credit')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    
    @app.route('/api/health')
    def health():
        return {'status': 'healthy', 'message': 'AlphaCaption API is running'}
        
    # Debug: Print registered routes
    with app.app_context():
        print("\n=== Registered Routes ===")
        for rule in app.url_map.iter_rules():
            print(f"{rule.endpoint}: {rule}")
        print("=========================\n")
    
    return app

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        import models.token_blocklist
        db.create_all()
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
