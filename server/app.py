from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
import os
from extensions import db, migrate, jwt

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
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
    
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    from routes.auth import auth_bp
    from routes.projects import projects_bp
    from routes.captions import captions_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(projects_bp, url_prefix='/api/projects')
    app.register_blueprint(captions_bp, url_prefix='/api/captions')
    
    @app.route('/api/health')
    def health():
        return {'status': 'healthy', 'message': 'AlphaCaption API is running'}
    
    return app

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        db.create_all()
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
