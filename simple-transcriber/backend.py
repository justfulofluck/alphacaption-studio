"""
Simple WhisperX-only backend for simple-transcriber.
No AI, no Gemini — just WhisperX transcribe + native word timestamps.

Setup:
  pip install whisperx flask flask-cors

Run:
  python backend.py

API:
  POST /api/transcribe
    FormData: audio (file), language (string, default: 'en')
    Response: { transcript, segments, word_segments }
"""

import os
import json
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
import whisperx

app = Flask(__name__)
CORS(app)

WHISPER_MODEL = None
ALIGN_MODEL = None
ALIGN_META = None

SUPPORTED_LANGS = {
    'en', 'hi', 'te', 'ml', 'ur', 'gu', 'ta', 'mr', 'bn', 'pa', 'kn'
}


def get_whisper():
    global WHISPER_MODEL
    if WHISPER_MODEL is None:
        WHISPER_MODEL = whisperx.load_model("base", device="cpu", compute_type="float32")
    return WHISPER_MODEL


def get_align(language_code):
    global ALIGN_MODEL, ALIGN_META
    if ALIGN_MODEL is None or ALIGN_META is None:
        ALIGN_MODEL, ALIGN_META = whisperx.load_align_model(language_code=language_code, device="cpu")
    return ALIGN_MODEL, ALIGN_META


@app.route('/api/transcribe', methods=['POST'])
def transcribe():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400

    file = request.files['audio']
    language = request.form.get('language', 'en').lower().strip()

    if language not in SUPPORTED_LANGS:
        return jsonify({'error': f'Language "{language}" not supported'}), 400

    # Save temp file
    ext = os.path.splitext(file.filename or 'audio.wav')[1] or '.wav'
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name

    try:
        model = get_whisper()
        audio = whisperx.load_audio(tmp_path)
        result = model.transcribe(audio, batch_size=8, word_timestamps=True)

        raw_segments = result.get('segments', [])
        word_segments = []
        for seg in raw_segments:
            words = seg.get('words', [])
            if words:
                for w in words:
                    word = w.get('word', '').strip()
                    if word and 'start' in w and 'end' in w:
                        word_segments.append({
                            'word': word,
                            'start': w['start'],
                            'end': w['end']
                        })

        if not word_segments:
            return jsonify({'error': 'No word timestamps produced'}), 500

        transcript = ' '.join(w['word'] for w in word_segments)

        # Group into display segments (4 words each)
        display_segments = []
        for i in range(0, len(word_segments), 4):
            chunk = word_segments[i:i + 4]
            display_segments.append({
                'start': chunk[0]['start'],
                'end': chunk[-1]['end'],
                'text': ' '.join(w['word'] for w in chunk)
            })

        return jsonify({
            'transcript': transcript,
            'segments': display_segments,
            'word_segments': word_segments
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

    finally:
        os.unlink(tmp_path)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
