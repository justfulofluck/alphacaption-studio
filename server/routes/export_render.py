from flask import Blueprint, request, jsonify, current_app
from extensions import db
from models.user import Project
from flask_jwt_extended import jwt_required, get_jwt_identity
import os
import json
import threading
from services.export_render_service import ExportRenderService, get_video_dimensions

export_render_bp = Blueprint('export_render', __name__)

def run_render_thread(input_video, ass_filepath, output_video, resolution, status_filepath, captions, config, scale, width, height):
    try:
        # 1. Update status to generating ASS file
        with open(status_filepath, 'w') as f:
            json.dump({"status": "processing", "progress": 15, "message": "Compiling styled subtitle files..."}, f)
            
        ExportRenderService.generate_ass_file(captions, config, scale, ass_filepath, width, height)
        
        # 2. Update status to rendering video with FFmpeg
        with open(status_filepath, 'w') as f:
            json.dump({"status": "processing", "progress": 40, "message": "Rendering high-bitrate video filters..."}, f)
            
        ExportRenderService.execute_ffmpeg_render(input_video, ass_filepath, output_video, resolution, width, height)
        
        # 3. Mark complete
        with open(status_filepath, 'w') as f:
            json.dump({"status": "completed", "progress": 100, "message": "Ready to download!"}, f)
            
    except Exception as e:
        print(f"[ExportRender] Error in background render thread: {str(e)}")
        with open(status_filepath, 'w') as f:
            json.dump({"status": "failed", "error": str(e), "message": "Render failed."}, f)

@export_render_bp.route('/export-render/<int:project_id>', methods=['POST'])
@jwt_required()
def start_export_render(project_id):
    user_id = get_jwt_identity()
    project = Project.query.filter_by(id=project_id, user_id=user_id).first()
    if not project:
        return jsonify({'error': 'Project not found'}), 404
        
    data = request.get_json() or {}
    resolution = data.get('resolution', '1080') # '1080', '1440', '2160'
    captions = data.get('captions', [])
    config = data.get('config', {})
    
    import time
    debug_log_path = os.path.join(current_app.config['UPLOAD_FOLDER'], "render_debug.log")
    try:
        with open(debug_log_path, 'a', encoding='utf-8') as lf:
            lf.write(f"\n--- NEW EXPORT REQUEST at {time.time()} ---\n")
            lf.write(f"Config: {json.dumps(config, indent=2)}\n")
    except Exception as e:
        print(f"Failed to write debug log: {e}")
    
    user_video_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], f"user_{user_id}", "videos")
    os.makedirs(user_video_dir, exist_ok=True)
    
    input_video = os.path.join(user_video_dir, project.video_filename)
    output_filename = f"export_{resolution}_{project.video_filename}"
    output_video = os.path.join(user_video_dir, output_filename)
    ass_filepath = os.path.join(user_video_dir, f"export_{resolution}_subtitles.ass")
    status_filepath = os.path.join(user_video_dir, f"export_status_{resolution}.json")
    
    if not os.path.exists(input_video):
        return jsonify({'error': 'Source video file does not exist on server'}), 400
        
    # Get actual dimensions from video file using ffprobe
    video_w, video_h = get_video_dimensions(input_video)
    is_landscape = video_w > video_h
    
    # Calculate scale and dimensions
    if resolution == '1440':
        scale = 4
        width = 2560 if is_landscape else 1440
        height = 1440 if is_landscape else 2560
    elif resolution == '2160':
        scale = 6
        width = 3840 if is_landscape else 2160
        height = 2160 if is_landscape else 3840
    else:
        scale = 3
        width = 1920 if is_landscape else 1080
        height = 1080 if is_landscape else 1920

    # 1. Delete old output video if it exists to clear browser cache
    if os.path.exists(output_video):
        try:
            os.remove(output_video)
        except Exception as e:
            print(f"[ExportRender] Could not remove old output video: {e}")

    # 2. Reset status file synchronously on the main thread to prevent race condition
    with open(status_filepath, 'w') as f:
        json.dump({"status": "processing", "progress": 5, "message": "Initializing export pipeline..."}, f)

    # Start thread
    thread = threading.Thread(
        target=run_render_thread,
        args=(input_video, ass_filepath, output_video, resolution, status_filepath, captions, config, scale, width, height)
    )
    thread.daemon = True
    thread.start()
    
    return jsonify({
        'status': 'processing',
        'message': 'Render started on backend',
        'output_filename': output_filename
    })

@export_render_bp.route('/export-status/<int:project_id>/<resolution>', methods=['GET'])
@jwt_required()
def get_export_status(project_id, resolution):
    user_id = get_jwt_identity()
    project = Project.query.filter_by(id=project_id, user_id=user_id).first()
    if not project:
        return jsonify({'error': 'Project not found'}), 404
        
    user_video_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], f"user_{user_id}", "videos")
    status_filepath = os.path.join(user_video_dir, f"export_status_{resolution}.json")
    output_filename = f"export_{resolution}_{project.video_filename}"
    
    video_url = f"/api/projects/video/{user_id}/{output_filename}"
    
    if not os.path.exists(status_filepath):
        return jsonify({
            'status': 'idle',
            'progress': 0,
            'message': 'Not started yet'
        })
        
    try:
        with open(status_filepath, 'r') as f:
            status_data = json.load(f)
            if status_data.get('status') == 'completed':
                status_data['video_url'] = video_url
            return jsonify(status_data)
    except Exception as e:
        return jsonify({
            'status': 'failed',
            'error': str(e),
            'message': 'Error loading status file'
        })
