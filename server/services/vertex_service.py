import os
import json
import base64
import mimetypes
from typing import Dict, Any, List
import vertexai
from vertexai.preview.generative_models import GenerativeModel
from google.oauth2 import service_account
import google.generativeai as genai

class VertexService:
    """
    Service for interacting with Google Cloud Vertex AI or Google AI Studio (Gemini)
    Handles audio transcription and caption alignment
    """
    
    def __init__(self):
        self.api_key = os.environ.get('GEMINI_API_KEY')
        self.project_id = os.environ.get('GCP_PROJECT_ID')
        self.region = os.environ.get('GCP_REGION', 'us-central1')
        self.model_name = os.environ.get('GEMINI_MODEL', 'gemini-1.5-flash-001')
        
        # Google AI Studio (API Key) does not support Vertex-specific suffixes like -001 or -002
        self.google_ai_model_name = self.model_name.replace('-001', '').replace('-002', '')
        
        self.use_vertex = False
        creds_json = os.environ.get('GCP_CREDENTIALS_JSON')
        
        if creds_json:
            try:
                print("[Gemini] Loading credentials from GCP_CREDENTIALS_JSON environment variable")
                info = json.loads(creds_json)
                self.credentials = service_account.Credentials.from_service_account_info(info)
                vertexai.init(project=self.project_id, location=self.region, credentials=self.credentials)
                self.use_vertex = True
                print(f"[Gemini] Using Vertex AI (GCP) with model {self.model_name}")
            except Exception as e:
                print(f"[Gemini] Error loading credentials from JSON env: {e}")
        
        # If Vertex setup failed or was skipped, try API Key fallback
        if not self.use_vertex:
            if self.api_key:
                print(f"[Gemini] Using Google AI Studio (API Key) with model {self.google_ai_model_name}")
                genai.configure(api_key=self.api_key)
                self.use_vertex = False
            else:
                print("[Gemini] WARNING: No valid credentials found (JSON or API Key).")
    
    def _get_mime_type(self, filepath: str) -> str:
        mime, _ = mimetypes.guess_type(filepath)
        if mime and mime.startswith('audio/'):
            return mime
        return 'audio/mpeg'
    
    def _clean_json_response(self, text: str) -> str:
        text = text.strip()
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]
        return text.strip()
    
    def _generate_content(self, prompt: str, audio_bytes: bytes, mime_type: str):
        """Internal helper to attempt Vertex AI with automatic fallback to Google AI Studio."""
        if self.use_vertex:
            try:
                print(f"[Gemini] Attempting Vertex AI with model {self.model_name}")
                model = GenerativeModel(model_name=self.model_name)
                return model.generate_content(
                    contents=[{"role": "user", "parts": [{"text": prompt}, {"inline_data": {"mime_type": mime_type, "data": base64.b64encode(audio_bytes).decode('utf-8')}}]}],
                    generation_config={"response_mime_type": "application/json"}
                )
            except Exception as e:
                print(f"[Gemini] Vertex AI failed ({e}). Falling back to Google AI Studio.")
        
        # Fallback to Google AI Studio (API Key)
        # We must CLEAN the model name here because AI Studio doesn't support -001/002 suffixes
        clean_model_name = self.model_name.replace('-001', '').replace('-002', '')
        print(f"[Gemini] Using Google AI Studio (API Key) with model {clean_model_name}")
        model = genai.GenerativeModel(model_name=clean_model_name)
        return model.generate_content(
            [prompt, {"mime_type": mime_type, "data": audio_bytes}],
            generation_config={"response_mime_type": "application/json"},
            request_options={"timeout": 60}
        )

    def transcribe(self, audio_path: str) -> Dict[str, Any]:
        if not os.path.exists(audio_path):
            return {'language': 'Unknown', 'transcript': '', 'error': f'Audio file not found: {audio_path}'}
        
        with open(audio_path, 'rb') as f:
            audio_bytes = f.read()
        
        mime_type = self._get_mime_type(audio_path)
        prompt = """You are an expert audio transcriptionist. Analyze this audio file carefully and provide:
1. The detected primary language of the speech (one of: English, Hindi, Hinglish, Spanish, French, German, Chinese, Japanese, Korean, or Other)
2. A complete, accurate transcript of ALL spoken content.

IMPORTANT FORMATTING RULES:
- If the audio is in Hinglish (mixed Hindi + English), write Hindi words in Devanagari script (हिंदी) and English words in Latin script.
- Return ONLY valid JSON in this exact format: {"language": "Detected Language", "transcript": "Full transcript text here"}"""
        
        try:
            response = self._generate_content(prompt, audio_bytes, mime_type)
            text = self._clean_json_response(response.text)
            result = json.loads(text)
            return {'language': result.get('language', 'Unknown'), 'transcript': result.get('transcript', '')}
        except Exception as e:
            return {'language': 'Unknown', 'transcript': '', 'error': str(e)}
    
    def align_transcript(self, audio_path: str, transcript: str) -> Dict[str, Any]:
        if not os.path.exists(audio_path): return {'segments': []}
        with open(audio_path, 'rb') as f: audio_bytes = f.read()
        mime_type = self._get_mime_type(audio_path)
        prompt = f"Given this audio and transcript, create precise caption segments (2-6 words each) with start/end timestamps. TRANSCRIPT: {transcript}\nReturn ONLY JSON: {{\"segments\": [{{ \"start\": 0.0, \"end\": 2.5, \"text\": \"...\" }}]}}"
        
        try:
            response = self._generate_content(prompt, audio_bytes, mime_type)
            result = json.loads(self._clean_json_response(response.text))
            segments = result.get('segments', [])
            for seg in segments:
                seg['start'] = float(seg.get('start', 0))
                seg['end'] = float(seg.get('end', 0))
            return {'segments': sorted(segments, key=lambda x: x['start'])}
        except Exception: return {'segments': []}
    
    def sync_segments(self, audio_path: str, current_segments: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not os.path.exists(audio_path): return {'segments': current_segments}
        with open(audio_path, 'rb') as f: audio_bytes = f.read()
        mime_type = self._get_mime_type(audio_path)
        segments_json = json.dumps(current_segments, ensure_ascii=False)
        prompt = f"Re-sync these segments to match the audio precisely. Keep text unchanged. CURRENT: {segments_json}\nReturn ONLY JSON: {{\"segments\": [{{ \"start\": 1.2, \"end\": 3.4, \"text\": \"...\" }}]}}"
        
        try:
            response = self._generate_content(prompt, audio_bytes, mime_type)
            result = json.loads(self._clean_json_response(response.text))
            segments = result.get('segments', [])
            for seg in segments:
                seg['start'] = float(seg.get('start', 0))
                seg['end'] = float(seg.get('end', 0))
            return {'segments': sorted(segments, key=lambda x: x['start'])}
        except Exception: return {'segments': current_segments}
