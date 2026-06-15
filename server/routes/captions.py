from flask import Blueprint, request, jsonify, current_app, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db, limiter
from models.user import Project, Caption
from services.vertex_service import VertexService
from services.whisperx_service import map_gemini_to_segments, duration_based_mapping, map_gemini_to_timestamps, distribute_text_to_segments

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

def get_whisperx_service():
    """Get or create WhisperXService instance"""
    from services.whisperx_service import WhisperXService
    if not hasattr(captions_bp, '_whisperx_service'):
        captions_bp._whisperx_service = WhisperXService()
    return captions_bp._whisperx_service


# get_user_from_token removed

@captions_bp.route('/<int:project_id>/transcribe', methods=['POST'])
@jwt_required()
@limiter.limit("5 per minute")
def transcribe(project_id):
    from services.credit_service import CreditService
    user_id = get_jwt_identity()
    
    project = Project.query.filter_by(id=project_id, user_id=user_id).first()
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
    import math
    duration_mins = max(1, math.ceil(project.duration / 60))
    
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
        transcription_mode = data.get('mode', 'native_language')

        valid_modes = ['native_language', 'native_english', 'english']
        if transcription_mode not in valid_modes:
            transcription_mode = 'native_language'

        # Step 1: Gemini transcribes with selected mode (detects language + accurate text)
        vertex = get_vertex_service()
        if custom_model:
            vertex.model_name = custom_model
        print(f"[Captions] Starting Gemini transcription (mode={transcription_mode}) for {filepath}")
        result = vertex.transcribe(filepath, mode=transcription_mode)

        if result.get('error'):
            return jsonify({'error': f"Transcription failed: {result['error']}"}), 500

        transcript = result.get('transcript', '')
        language = result.get('language', 'English')

        # Step 2: Get segment-bound timing for Gemini's text
        whisperx = get_whisperx_service()
        from services.whisperx_service import SUPPORTED_ALIGN_LANGS, LANG_MAP
        lang_code = LANG_MAP.get(language.lower().strip())

        segments = []
        word_segments = []

        # Path 1: Word-level native timestamps → map_gemini_to_timestamps → 4-word segments
        # Each word gets its own start/end time from Whisper's internal cross-attention.
        # map_gemini_to_timestamps groups them into segments of 4 words each.
        if transcript and lang_code:
            print(f"[Captions] Word-level timing (mode={transcription_mode})")
            wx_result = whisperx.transcribe_with_word_timestamps_native(filepath, language_code=lang_code)
            wx_words = wx_result.get('words', [])
            if wx_words:
                mapping = map_gemini_to_timestamps(transcript, wx_words)
                segments = mapping.get('segments', [])
                word_segments = mapping.get('word_segments', [])
                print(f"[Captions] Word-level timing: {len(word_segments)} words, {len(segments)} segments")

        # Path 2: Segment-based fallback (if word-level failed)
        if not segments and transcript:
            print(f"[Captions] Segment-based fallback (mode={transcription_mode})")
            wx_result = whisperx.transcribe_segments_only(filepath)
            wx_segments = wx_result.get('segments', [])
            if wx_segments:
                mapping = map_gemini_to_segments(transcript, wx_segments)
                segments = mapping.get('segments', [])
                word_segments = mapping.get('word_segments', [])
                print(f"[Captions] Segment-based: {len(segments)} segments, {len(word_segments)} words")

        # Path 3: Duration-based proportional mapping (last resort)
        if not segments and transcript:
            print(f"[Captions] Using duration-based mapping as last resort")
            mapping = duration_based_mapping(transcript, filepath)
            segments = mapping.get('segments', [])
            word_segments = mapping.get('word_segments', [])
            print(f"[Captions] Duration mapping: {len(word_segments)} words, {len(segments)} segments")

        # Save to DB
        caption = Caption.query.filter_by(project_id=project_id).first()
        if caption:
            caption.transcript = transcript
            caption.segments_json = json.dumps(segments)
            caption.word_segments_json = json.dumps(word_segments)
            caption.transcription_mode = transcription_mode
        else:
            caption = Caption(
                project_id=project_id,
                transcript=transcript,
                segments_json=json.dumps(segments),
                word_segments_json=json.dumps(word_segments),
                style_json='{}',
                transcription_mode=transcription_mode
            )
            db.session.add(caption)
        
        project.status = 'transcribed'
        project.language = language
        
        from models.usage import Usage
        
        usage = Usage(
            user_id=user_id,
            file_name=project.audio_filename,
            duration_minutes=project.duration / 60,
            credits_used=duration_mins,
            cost_incurred=round((project.duration / 60) * 0.006, 4)
        )
        db.session.add(usage)
        db.session.flush()
        
        CreditService.deduct_credits(
            user_id=user_id,
            amount=duration_mins,
            source='usage',
            reference_id=str(usage.id),
            description=f"Transcription for project: {project.name}"
        )
        
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
            'transcript': transcript,
            'segments': segments,
            'word_segments': word_segments
        })
    except Exception as e:
        print(f"[Captions] Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Transcription failed: {str(e)}'}), 500


@captions_bp.route('/<int:project_id>/align', methods=['POST'])
@jwt_required()
@limiter.limit("5 per minute")
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
        # Removed caching so Auto Sync always forces a fresh re-alignment

        whisperx = get_whisperx_service()
        from services.whisperx_service import SUPPORTED_ALIGN_LANGS, LANG_MAP
        lang_code = LANG_MAP.get((project.language or '').lower().strip())

        segments = []
        word_segments = []

        if transcript and lang_code:
            wx_result = whisperx.transcribe_with_word_timestamps_native(filepath, language_code=lang_code)
            wx_words = wx_result.get('words', [])
            if wx_words:
                mapping = map_gemini_to_timestamps(transcript, wx_words)
                segments = mapping.get('segments', [])
                word_segments = mapping.get('word_segments', [])

        if not segments and transcript:
            wx_result = whisperx.transcribe_segments_only(filepath)
            wx_segments = wx_result.get('segments', [])
            if wx_segments:
                mapping = map_gemini_to_segments(transcript, wx_segments)
                segments = mapping.get('segments', [])
                word_segments = mapping.get('word_segments', [])

        if not segments and transcript:
            mapping = duration_based_mapping(transcript, filepath)
            segments = mapping.get('segments', [])
            word_segments = mapping.get('word_segments', [])

        if not segments:
            return jsonify({'error': 'Alignment failed to generate segments.'}), 500
        
        caption = Caption.query.filter_by(project_id=project_id).first()
        if caption:
            caption.transcript = transcript
            caption.segments_json = json.dumps(segments)
            caption.word_segments_json = json.dumps(word_segments)
        else:
            caption = Caption(
                project_id=project_id,
                transcript=transcript,
                segments_json=json.dumps(segments),
                word_segments_json=json.dumps(word_segments)
            )
            db.session.add(caption)
        
        project.status = 'aligned'
        db.session.commit()
        
        return jsonify({
            'message': 'Alignment completed',
            'segments': segments,
            'word_segments': word_segments
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
@limiter.limit("5 per minute")
def sync_captions(project_id):
    user_id = get_jwt_identity()
    project = Project.query.filter_by(id=project_id, user_id=user_id).first()
    
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
    if not project.audio_filename:
        return jsonify({'error': 'No audio file'}), 400
    
    # Read segments from request body first, fall back to DB
    data = request.get_json() or {}
    segments = data.get('segments')
    
    if not segments:
        caption = Caption.query.filter_by(project_id=project_id).first()
        if not caption or not caption.segments_json:
            return jsonify({'error': 'No captions to sync'}), 400
        segments = json.loads(caption.segments_json)
    
    if not segments:
        return jsonify({'error': 'No segments to sync'}), 400
    
    # Generate a single transcript from the segments
    transcript = " ".join(s.get("text", "") for s in segments)
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], project.audio_filename)

    whisperx = get_whisperx_service()
    from services.whisperx_service import LANG_MAP, map_gemini_to_timestamps, map_gemini_to_segments, duration_based_mapping
    lang_code = LANG_MAP.get((project.language or '').lower().strip())

    new_segments = []
    word_segments = []

    if transcript and lang_code:
        wx_result = whisperx.transcribe_with_word_timestamps_native(filepath, language_code=lang_code)
        wx_words = wx_result.get('words', [])
        if wx_words:
            mapping = map_gemini_to_timestamps(transcript, wx_words)
            new_segments = mapping.get('segments', [])
            word_segments = mapping.get('word_segments', [])

    if not new_segments and transcript:
        wx_result = whisperx.transcribe_segments_only(filepath)
        wx_segments = wx_result.get('segments', [])
        if wx_segments:
            mapping = map_gemini_to_segments(transcript, wx_segments)
            new_segments = mapping.get('segments', [])
            word_segments = mapping.get('word_segments', [])

    if not new_segments and transcript:
        mapping = duration_based_mapping(transcript, filepath)
        new_segments = mapping.get('segments', [])
        word_segments = mapping.get('word_segments', [])

    if not new_segments:
        new_segments = segments
    
    # Save segments to DB after alignment
    caption = Caption.query.filter_by(project_id=project_id).first()
    if caption:
        caption.transcript = transcript
        caption.segments_json = json.dumps(new_segments)
        if word_segments:
            caption.word_segments_json = json.dumps(word_segments)
    else:
        caption = Caption(
            project_id=project_id,
            transcript=transcript,
            segments_json=json.dumps(new_segments),
            word_segments_json=json.dumps(word_segments),
            style_json='{}'
        )
        db.session.add(caption)
    db.session.commit()
    
    return jsonify({
        'message': 'Sync completed',
        'segments': new_segments
    })


@captions_bp.route('/<int:project_id>/export', methods=['GET'])
@jwt_required()
def export_srt(project_id):
    print(f"[Captions] Exporting SRT for project {project_id}")
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

