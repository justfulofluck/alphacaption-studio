from flask import Blueprint, request, jsonify, current_app, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db, limiter
from models.user import Project, Caption
from services.vertex_service import VertexService
from utils.srt_generator import generate_srt
import json
import os

captions_bp = Blueprint('captions', __name__)

# Lazy-loading VertexService to avoid import-time credential errors
def get_vertex_service():
    """Get or create VertexService instance"""
    if not hasattr(captions_bp, '_vertex_service'):
        captions_bp._vertex_service = VertexService()
    return captions_bp._vertex_service


import jwt

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

@captions_bp.route('/<int:project_id>/transcribe', methods=['POST'])
@limiter.limit("5 per minute")
def transcribe(project_id):
    from services.credit_service import CreditService
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    
    # Check project and duration
    project = Project.query.filter_by(id=project_id, user_id=user_id).first()
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
    import math
    duration_mins = max(1, math.ceil(project.duration / 60))
    
    # Check balance before starting
    balance = CreditService.get_balance(user_id)
    if balance < duration_mins:
        return jsonify({'error': f'Insufficient credits. This project requires {duration_mins} credits, but you only have {balance:.1f}.'}), 402
    
    if not project.audio_filename:
        return jsonify({'error': 'No audio file associated with this project'}), 400
    
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], project.audio_filename)
    
    if not os.path.exists(filepath):
        return jsonify({'error': 'Audio file not found on server'}), 404
    
    try:
        data = request.get_json() or {}
        custom_model = data.get('model')
        
        vertex = get_vertex_service()
        if custom_model:
            # Override model if requested from UI
            vertex.google_ai_model_name = custom_model
            vertex.model_name = custom_model
            
        print(f"[Captions] Starting transcription with model {vertex.google_ai_model_name} for {filepath}")
        result = vertex.transcribe(filepath)
        print(f"[Captions] Vertex AI result: {result}")
        
        if result.get('error'):
            print(f"[Captions] Transcription error: {result['error']}")
            return jsonify({'error': f"Transcription failed: {result['error']}"}), 500
            
        transcript = result.get('transcript', '')
        language = result.get('language', 'English')
        
        # Save to database
        caption = Caption.query.filter_by(project_id=project_id).first()
        if caption:
            caption.transcript = transcript
        else:
            caption = Caption(
                project_id=project_id,
                transcript=transcript,
                segments_json='[]',
                style_json='{}'
            )
            db.session.add(caption)
            
        project.status = 'transcribed'
        project.language = language
        
        # Credits are already calculated at the start
        from models.usage import Usage
        
        usage = Usage(
            user_id=user_id,
            file_name=project.audio_filename,
            duration_minutes=project.duration / 60,
            credits_used=duration_mins,
            cost_incurred=round((project.duration / 60) * 0.006, 4) # Approx $0.006 per minute cost Vertex
        )
        db.session.add(usage)
        db.session.flush() # Get usage ID
        
        from services.credit_service import CreditService
        CreditService.deduct_credits(
            user_id=user_id,
            amount=duration_mins,
            source='usage',
            reference_id=str(usage.id),
            description=f"Transcription for project: {project.name}"
        )
        
        # Notify user about project completion
        from utils.notification_utils import create_notification
        create_notification(
            user_id=user_id,
            title='Transcription Complete',
            message=f'Audio "{project.name}" has been successfully transcribed.',
            type='success'
        )
        
        db.session.commit()
        
        return jsonify({
            'message': 'Transcription completed',
            'language': language,
            'transcript': transcript
        })
    except Exception as e:
        print(f"[Captions] Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Transcription failed: {str(e)}'}), 500


@captions_bp.route('/<int:project_id>/align', methods=['POST'])
@limiter.limit("5 per minute")
def align(project_id):
    from services.credit_service import CreditService
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    
    # Check project and duration
    project = Project.query.filter_by(id=project_id, user_id=user_id).first()
    if not project:
        return jsonify({'error': 'Project not found'}), 404

    import math
    duration_mins = max(1, math.ceil(project.duration / 60))
    
    # Check balance (alignment also requires credits)
    balance = CreditService.get_balance(user_id)
    if balance < duration_mins:
        return jsonify({'error': f'Insufficient credits. This project requires {duration_mins} credits, but you only have {balance:.1f}.'}), 402
    
    data = request.get_json()
    transcript = data.get('transcript', '')
    
    if not transcript:
        return jsonify({'error': 'Transcript text is required'}), 400
    
    if not project.audio_filename:
        return jsonify({'error': 'No audio file associated'}), 400
    
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], project.audio_filename)
    
    if not os.path.exists(filepath):
        return jsonify({'error': 'Audio file not found'}), 404
    
    try:
        vertex = get_vertex_service()
        result = vertex.align_transcript(filepath, transcript)
        
        segments = result.get('segments', [])
        if not segments:
            error_msg = result.get('error', 'Alignment failed to generate segments. Please try again or check if the audio is clear.')
            return jsonify({'error': error_msg}), 500

        caption = Caption.query.filter_by(project_id=project_id).first()
        if caption:
            caption.transcript = transcript
            caption.segments_json = json.dumps(segments)
        else:
            caption = Caption(
                project_id=project_id,
                transcript=transcript,
                segments_json=json.dumps(segments)
            )
            db.session.add(caption)
        
        project.status = 'aligned'
        
        # Deduct credits for alignment
        from models.usage import Usage
        
        usage = Usage(
            user_id=user_id,
            file_name=f"{project.audio_filename} (align)",
            duration_minutes=project.duration / 60,
            credits_used=duration_mins,
            cost_incurred=round((project.duration / 60) * 0.006, 4)
        )
        db.session.add(usage)
        db.session.flush() # Get usage ID
        
        from services.credit_service import CreditService
        CreditService.deduct_credits(
            user_id=user_id,
            amount=duration_mins,
            source='usage_align',
            reference_id=str(usage.id),
            description=f"AI Sync for project: {project.name}"
        )
        
        db.session.commit()
        
        return jsonify({
            'message': 'Alignment completed',
            'segments': result.get('segments', [])
        })
    except Exception as e:
        return jsonify({'error': f'Alignment failed: {str(e)}'}), 500


@captions_bp.route('/<int:project_id>', methods=['GET'])
def get_captions(project_id):
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    project = Project.query.filter_by(id=project_id, user_id=user_id).first()
    
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
    caption = Caption.query.filter_by(project_id=project_id).first()
    
    if not caption:
        return jsonify({
            'transcript': '',
            'segments': [],
            'style': {}
        })
    
    return jsonify(caption.to_dict())


@captions_bp.route('/<int:project_id>', methods=['PUT'])
def update_captions(project_id):
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    project = Project.query.filter_by(id=project_id, user_id=user_id).first()
    
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
    data = request.get_json()
    
    caption = Caption.query.filter_by(project_id=project_id).first()
    
    if caption:
        if 'transcript' in data:
            caption.transcript = data['transcript']
        if 'segments' in data:
            caption.segments_json = json.dumps(data['segments'])
        if 'style' in data:
            caption.style_json = json.dumps(data['style'])
    else:
        caption = Caption(
            project_id=project_id,
            transcript=data.get('transcript', ''),
            segments_json=json.dumps(data.get('segments', [])),
            style_json=json.dumps(data.get('style', {}))
        )
        db.session.add(caption)
    
    db.session.commit()
    
    return jsonify({
        'message': 'Captions updated',
        'caption': caption.to_dict()
    })


@captions_bp.route('/<int:project_id>/sync', methods=['POST'])
@limiter.limit("5 per minute")
def sync_captions(project_id):
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    project = Project.query.filter_by(id=project_id, user_id=user_id).first()
    
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
    caption = Caption.query.filter_by(project_id=project_id).first()
    
    if not caption or not caption.segments_json:
        return jsonify({'error': 'No captions to sync'}), 400
    
    if not project.audio_filename:
        return jsonify({'error': 'No audio file'}), 400
    
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], project.audio_filename)
    
    if not os.path.exists(filepath):
        return jsonify({'error': 'Audio file not found'}), 404
    
    segments = json.loads(caption.segments_json)
    
    try:
        vertex = get_vertex_service()
        result = vertex.sync_segments(filepath, segments)
        
        caption.segments_json = json.dumps(result.get('segments', []))
        db.session.commit()
        
        return jsonify({
            'message': 'Sync completed',
            'segments': result.get('segments', [])
        })
    except Exception as e:
        return jsonify({'error': f'Sync failed: {str(e)}'}), 500


@captions_bp.route('/<int:project_id>/export', methods=['GET'])
def export_srt(project_id):
    print(f"[Captions] Exporting SRT for project {project_id}")
    user_id = get_user_from_token()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    project = Project.query.filter_by(id=project_id, user_id=user_id).first()
    
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
    caption = Caption.query.filter_by(project_id=project_id).first()
    
    if not caption or not caption.segments_json:
        return jsonify({'error': 'No captions to export'}), 400
    
    segments = json.loads(caption.segments_json)
    
    if not segments:
        return jsonify({'error': 'No caption segments found'}), 400
    
    srt_content = generate_srt(segments)
    
    # Clean filename and wrap in quotes to handle commas/special characters
    safe_name = project.name.replace(' ', '_').replace('"', '')
    filename = f"{safe_name}.srt"
    
    return Response(
        srt_content,
        mimetype='text/plain',
        headers={
            'Content-Disposition': f'attachment; filename="{filename}"',
            'Content-Type': 'text/plain; charset=utf-8'
        }
     )

