from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required
from services.tts_service import TTSService
from services.tts_analyzer_service import TTSAnalyzerService
import os

tts_bp = Blueprint('tts', __name__)

@tts_bp.route('/voices', methods=['GET'])
@jwt_required()
def get_voices():
    """Returns a list of all available voices."""
    try:
        voices = TTSService.get_voices()
        return jsonify({'voices': voices}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tts_bp.route('/generate', methods=['POST'])
@jwt_required()
def generate_audio():
    """Generates audio for the given text and voice."""
    data = request.json
    text = data.get('text')
    voice = data.get('voice')
    use_ai_emotion = data.get('use_ai_emotion', False)
    manual_rate = data.get('rate', '+0%')
    manual_pitch = data.get('pitch', '+0Hz')

    if not text or not voice:
        return jsonify({'error': 'Text and voice are required'}), 400

    try:
        emotion = "Manual"
        pitch = manual_pitch
        rate = manual_rate
        
        if use_ai_emotion:
            analyzer = TTSAnalyzerService()
            analysis = analyzer.analyze_script(text)
            emotion = analysis.get('emotion', 'Neutral')
            pitch = analysis.get('pitch', '+0Hz')
            rate = analysis.get('rate', '+0%')

        filename = TTSService.generate_audio(text, voice, rate, pitch)
        return jsonify({
            'message': 'Audio generated successfully',
            'filename': filename,
            'url': f'/api/tts/download/{filename}',
            'ai_analysis': {
                'emotion': emotion,
                'pitch': pitch,
                'rate': rate,
                'used': use_ai_emotion
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tts_bp.route('/download/<filename>', methods=['GET'])
# Optional: @jwt_required() - depending on if the audio tag can pass JWT headers easily
def download_audio(filename):
    """Serves the generated audio file."""
    upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    tts_folder = os.path.join(upload_folder, 'tts')
    return send_from_directory(tts_folder, filename)
