from flask import Blueprint, request, jsonify, current_app, send_from_directory, url_for, Response
from extensions import db, limiter
from models.user import Project, Caption
from werkzeug.utils import secure_filename
import os
import json
import re
from flask_jwt_extended import jwt_required, get_jwt_identity

projects_bp = Blueprint('projects', __name__)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

def get_audio_url(filename):
    if filename:
        return f"{current_app.config['BASE_URL']}/api/projects/audio/{filename}"
    return None

def get_video_url(user_id, filename):
    if filename:
        return f"{current_app.config['BASE_URL']}/api/projects/video/{user_id}/{filename}"
    return None

def generate_thumbnail_on_fly(video_path, thumb_path):
    import subprocess
    try:
        cmd = ['ffmpeg', '-y', '-ss', '0.1', '-i', video_path, '-vframes', '1', '-vf', 'scale=360:-1', thumb_path]
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return True
    except Exception as e:
        print(f"[Thumbnail] Failed to generate thumbnail: {e}")
        return False


@projects_bp.route('', methods=['GET'])
@jwt_required()
def list_projects():
    user_id = get_jwt_identity()
    
    projects = Project.query.filter_by(user_id=user_id).order_by(Project.created_at.desc()).all()
    
    return jsonify([{
        'id': p.id,
        'name': p.name,
        'audio_filename': p.audio_filename,
        'audio_url': get_audio_url(p.audio_filename),
        'video_filename': p.video_filename,
        'video_url': get_video_url(user_id, p.video_filename) if p.video_filename else None,
        'duration': p.duration,
        'language': p.language,
        'status': p.status,
        'created_at': p.created_at.isoformat() if p.created_at else None,
        'updated_at': p.updated_at.isoformat() if p.updated_at else None
    } for p in projects])


@projects_bp.route('', methods=['POST'])
@jwt_required()
@limiter.limit("10 per minute")
def create_project():
    user_id = get_jwt_identity()
    
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


@projects_bp.route('/upload-video', methods=['POST'])
@jwt_required()
@limiter.limit("10 per minute")
def upload_video():
    user_id = get_jwt_identity()
    
    if 'video' not in request.files:
        return jsonify({'error': 'No video file provided'}), 400
        
    file = request.files['video']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
        
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Allowed: mp4, webm'}), 400
        
    user_video_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], f"user_{user_id}", "videos")
    os.makedirs(user_video_dir, exist_ok=True)
    
    name = request.form.get('name', '').strip()
    if not name:
        name = os.path.splitext(secure_filename(file.filename))[0]
        
    import time
    filename = f"{int(time.time())}_{secure_filename(file.filename)}"
    filepath = os.path.join(user_video_dir, filename)
    file.save(filepath)
    
    # Detect video codec and transcode to H.264 if it is HEVC/non-standard for browser compatibility
    try:
        import subprocess
        probe_cmd = ['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name', '-of', 'default=noprint_wrappers=1:nokey=1', filepath]
        codec_result = subprocess.run(probe_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        codec_name = codec_result.stdout.decode('utf-8').strip().lower()
        print(f"[Upload] Detected video codec: {codec_name}")
        
        if codec_name != 'h264':
            print(f"[Upload] Transcoding non-H.264 video ({codec_name}) to standard H.264 MP4 for Edge/Safari compatibility...")
            temp_transcoded = filepath + "_transcoded.mp4"
            transcode_cmd = [
                'ffmpeg', '-y',
                '-i', filepath,
                '-c:v', 'libx264',
                '-preset', 'veryfast',
                '-crf', '22',
                '-c:a', 'aac',
                '-b:a', '128k',
                temp_transcoded
            ]
            subprocess.run(transcode_cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            os.remove(filepath)
            os.rename(temp_transcoded, filepath)
            print("[Upload] Transcoding complete.")
    except Exception as e:
        print(f"[Upload] Codec check/transcoding failed: {e}")
    
    # Pre-generate thumbnail image
    base_name, _ = os.path.splitext(filename)
    thumb_filepath = os.path.join(user_video_dir, f"{base_name}.jpg")
    generate_thumbnail_on_fly(filepath, thumb_filepath)
    
    from utils.media_info import get_audio_duration
    duration = get_audio_duration(filepath)

    # Extract audio using FFmpeg subprocess
    audio_filename = f"extracted_{user_id}_{int(time.time())}.wav"
    audio_filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], audio_filename)
    
    import subprocess
    try:
        cmd = ['ffmpeg', '-y', '-i', filepath, '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', audio_filepath]
        print(f"[FFmpeg] Running command: {' '.join(cmd)}")
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print(f"[FFmpeg] Audio extracted successfully to {audio_filepath}")
        has_audio = True
    except Exception as e:
        print(f"[FFmpeg] Failed to extract audio: {str(e)}")
        has_audio = False
        with open(os.path.join(current_app.config['UPLOAD_FOLDER'], 'ffmpeg_error.txt'), 'w') as f:
            f.write(f"Exception: {str(e)}\nCommand: {' '.join(cmd)}\n")
            if isinstance(e, subprocess.CalledProcessError):
                f.write(f"Stdout: {e.stdout}\nStderr: {e.stderr}\n")
    
    project = Project(
        user_id=user_id,
        name=name,
        video_filename=filename,
        video_url=get_video_url(user_id, filename),
        audio_filename=audio_filename if has_audio else None,
        audio_url=get_audio_url(audio_filename) if has_audio else None,
        duration=duration,
        status='uploaded'
    )
    
    db.session.add(project)
    db.session.commit()
    
    return jsonify(project.to_dict()), 201


@projects_bp.route('/<int:project_id>', methods=['GET'])
@jwt_required()
def get_project(project_id):
    user_id = get_jwt_identity()
    
    project = Project.query.filter_by(id=project_id, user_id=user_id).first()
    
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
    caption = Caption.query.filter_by(project_id=project_id).first()
    
    return jsonify({
        **project.to_dict(),
        'caption': caption.to_dict() if caption else None
    })


@projects_bp.route('/<int:project_id>', methods=['PUT'])
@jwt_required()
def update_project(project_id):
    user_id = get_jwt_identity()
    
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
@jwt_required()
def delete_project(project_id):
    user_id = get_jwt_identity()
    
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


@projects_bp.route('/video/<int:user_id>/<filename>', methods=['GET'])
def get_video(user_id, filename):
    user_video_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], f"user_{user_id}", "videos")
    filepath = os.path.join(user_video_dir, filename)
    
    if not os.path.exists(filepath):
        return "File not found", 404
        
    # Check for thumbnail request
    is_thumb_req = request.args.get('thumbnail', 'false').lower() == 'true'
    if is_thumb_req:
        base_name, _ = os.path.splitext(filename)
        thumb_filename = f"{base_name}.jpg"
        thumb_path = os.path.join(user_video_dir, thumb_filename)
        
        # If it doesn't exist, try to generate it dynamically on the fly
        if not os.path.exists(thumb_path):
            generate_thumbnail_on_fly(filepath, thumb_path)
            
        if os.path.exists(thumb_path):
            return send_from_directory(user_video_dir, thumb_filename, mimetype='image/jpeg')
        
    file_size = os.path.getsize(filepath)
    range_header = request.headers.get('Range', None)
    
    mimetype = 'video/mp4'
    if filename.lower().endswith('.webm'):
        mimetype = 'video/webm'
        
    if not range_header:
        return send_from_directory(user_video_dir, filename, mimetype=mimetype)
        
    match = re.match(r'bytes=(\d+)-(\d*)', range_header)
    if not match:
        return send_from_directory(user_video_dir, filename, mimetype=mimetype)
        
    start = int(match.group(1))
    end = match.group(2)
    end = int(end) if end else file_size - 1
    
    length = end - start + 1
    
    with open(filepath, 'rb') as f:
        f.seek(start)
        data = f.read(length)
        
    response = Response(data, 206, mimetype=mimetype, direct_passthrough=True)
    response.headers.add('Content-Range', f'bytes {start}-{end}/{file_size}')
    response.headers.add('Accept-Ranges', 'bytes')
    response.headers.add('Content-Length', str(length))
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response
