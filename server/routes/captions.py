from flask import Blueprint, request, jsonify, current_app, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.user import Project, Caption
from services.ai_service import GeminiService
from utils.srt_generator import generate_srt
import json

captions_bp = Blueprint('captions', __name__)
gemini = GeminiService()


@captions_bp.route('/<int:project_id>/transcribe', methods=['POST'])
@jwt_required()
def transcribe(project_id):
    user_id = get_jwt_identity()
    project = Project.query.filter_by(id=project_id, user_id=user_id).first()
    
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
    if not project.audio_filename:
        return jsonify({'error': 'No audio file associated with this project'}), 400
    
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], project.audio_filename)
    
    if not os.path.exists(filepath):
        return jsonify({'error': 'Audio file not found on server'}), 404
    
    try:
        result = gemini.transcribe(filepath)
        
        project.status = 'transcribed'
        project.language = result.get('language', 'unknown')
        db.session.commit()
        
        return jsonify({
            'message': 'Transcription completed',
            'language': result.get('language'),
            'transcript': result.get('transcript')
        })
    except Exception as e:
        return jsonify({'error': f'Transcription failed: {str(e)}'}), 500


@captions_bp.route('/<int:project_id>/align', methods=['POST'])
@jwt_required()
def align(project_id):
    user_id = get_jwt_identity()
    project = Project.query.filter_by(id=project_id, user_id=user_id).first()
    
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
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
        result = gemini.align_transcript(filepath, transcript)
        
        caption = Caption.query.filter_by(project_id=project_id).first()
        if caption:
            caption.transcript = transcript
            caption.segments_json = json.dumps(result.get('segments', []))
        else:
            caption = Caption(
                project_id=project_id,
                transcript=transcript,
                segments_json=json.dumps(result.get('segments', []))
            )
            db.session.add(caption)
        
        project.status = 'aligned'
        db.session.commit()
        
        return jsonify({
            'message': 'Alignment completed',
            'segments': result.get('segments', [])
        })
    except Exception as e:
        return jsonify({'error': f'Alignment failed: {str(e)}'}), 500


@captions_bp.route('/<int:project_id>', methods=['GET'])
@jwt_required()
def get_captions(project_id):
    user_id = get_jwt_identity()
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
@jwt_required()
def update_captions(project_id):
    user_id = get_jwt_identity()
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
@jwt_required()
def sync_captions(project_id):
    user_id = get_jwt_identity()
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
        result = gemini.sync_segments(filepath, segments)
        
        caption.segments_json = json.dumps(result.get('segments', []))
        db.session.commit()
        
        return jsonify({
            'message': 'Sync completed',
            'segments': result.get('segments', [])
        })
    except Exception as e:
        return jsonify({'error': f'Sync failed: {str(e)}'}), 500


@captions_bp.route('/<int:project_id>/export', methods=['GET'])
@jwt_required()
def export_srt(project_id):
    user_id = get_jwt_identity()
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
    
    filename = f"{project.name.replace(' ', '_')}.srt"
    
    return Response(
        srt_content,
        mimetype='text/plain',
        headers={
            'Content-Disposition': f'attachment; filename={filename}',
            'Content-Type': 'text/plain; charset=utf-8'
        }
    )


import os
