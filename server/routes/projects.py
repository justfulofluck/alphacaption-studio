from flask import Blueprint, request, jsonify, current_app, send_from_directory, url_for
from extensions import db
from models.user import Project, Caption
from werkzeug.utils import secure_filename
import os
import json
import jwt

projects_bp = Blueprint('projects', __name__)

def get_user_from_token():
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    try:
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return None
        token = parts[1]
        decoded = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        user_id = decoded.get('sub') or decoded.get('identity')
        if user_id:
            return int(user_id)
    except Exception as e:
        print(f"Token decode error: {e}")
    return None

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

def get_audio_url(filename):
    if filename:
        return f"{current_app.config['BASE_URL']}/api/projects/audio/{filename}"
    return None


@projects_bp.route('', methods=['GET'])
def list_projects():
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    
    projects = Project.query.filter_by(user_id=user_id).order_by(Project.created_at.desc()).all()
    
    return jsonify([{
        'id': p.id,
        'name': p.name,
        'audio_filename': p.audio_filename,
        'audio_url': get_audio_url(p.audio_filename),
        'duration': p.duration,
        'language': p.language,
        'status': p.status,
        'created_at': p.created_at.isoformat() if p.created_at else None,
        'updated_at': p.updated_at.isoformat() if p.updated_at else None
    } for p in projects])


@projects_bp.route('', methods=['POST'])
def create_project():
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    file = request.files['audio']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Allowed: mp3, wav, ogg, m4a, mp4, webm'}), 400
    
    name = request.form.get('name', '').strip()
    if not name:
        name = os.path.splitext(secure_filename(file.filename))[0]
    
    filename = f"{user_id}_{int(os.path.getmtime(os.path.expanduser('~')))}_{secure_filename(file.filename)}"
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    
    from utils.media_info import get_audio_duration
    duration = get_audio_duration(filepath)
    
    project = Project(
        user_id=user_id,
        name=name,
        audio_filename=filename,
        audio_url=get_audio_url(filename),
        duration=duration,
        status='uploaded'
    )
    
    db.session.add(project)
    db.session.commit()
    
    return jsonify({
        'id': project.id,
        'name': project.name,
        'audio_filename': project.audio_filename,
        'audio_url': project.audio_url,
        'status': project.status,
        'created_at': project.created_at.isoformat()
    }), 201


@projects_bp.route('/<int:project_id>', methods=['GET'])
def get_project(project_id):
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    
    project = Project.query.filter_by(id=project_id, user_id=user_id).first()
    
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
    caption = Caption.query.filter_by(project_id=project_id).first()
    
    return jsonify({
        **project.to_dict(),
        'caption': caption.to_dict() if caption else None
    })


@projects_bp.route('/<int:project_id>', methods=['PUT'])
def update_project(project_id):
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    
    project = Project.query.filter_by(id=project_id, user_id=user_id).first()
    
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
    data = request.get_json()
    
    if 'name' in data:
        project.name = data['name'].strip()
    if 'duration' in data:
        project.duration = data['duration']
    if 'language' in data:
        project.language = data['language']
    if 'status' in data:
        project.status = data['status']
    
    db.session.commit()
    
    return jsonify({
        'message': 'Project updated',
        'project': project.to_dict()
    })


@projects_bp.route('/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    
    project = Project.query.filter_by(id=project_id, user_id=user_id).first()
    
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
    if project.audio_filename:
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], project.audio_filename)
        if os.path.exists(filepath):
            os.remove(filepath)
    
    db.session.delete(project)
    db.session.commit()
    
    return jsonify({'message': 'Project deleted successfully'})


@projects_bp.route('/audio/<filename>', methods=['GET'])
def get_audio(filename):
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)
