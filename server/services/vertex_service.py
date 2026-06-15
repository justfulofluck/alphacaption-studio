import os
import json
import base64
import mimetypes
from typing import Dict, Any, List
import requests

class VertexService:
    """
    Service for interacting with Google Cloud Vertex AI API
    Handles audio transcription and caption alignment via REST API
    """
    
    def __init__(self):
        self.api_key = os.environ.get('GEMINI_API_KEY')
        self.project_id = os.environ.get('GCP_PROJECT_ID')
        self.region = os.environ.get('GCP_REGION', 'us-central1')
        self.model_name = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')
        
        # Vertex AI endpoint format: https://aiplatform.googleapis.com/v1/publishers/google/models/{model}:generateContent
        # The API key is passed as a query parameter: ?key={API_KEY}
        
        if self.api_key:
            print(f"[Vertex AI] Using API Key with model {self.model_name}")
            # Debug: show first and last few chars of key
            if len(self.api_key) > 20:
                masked_key = f"{self.api_key[:10]}...{self.api_key[-10:]}"
                print(f"[Vertex AI] API Key (masked): {masked_key}")
        else:
            print("[Vertex AI] WARNING: No GEMINI_API_KEY configured.")
            # Debug: show what's in the environment for this key
            print(f"[Vertex AI] DEBUG: GEMINI_API_KEY in os.environ: {os.environ.get('GEMINI_API_KEY', 'NOT SET')}")
    
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
    
    def _generate_text_content(self, prompt: str):
        """Generate content using Vertex AI with text-only input (no audio)."""
        url = f"https://aiplatform.googleapis.com/v1/publishers/google/models/{self.model_name}:generateContent"
        params = {"key": self.api_key}
        headers = {"Content-Type": "application/json"}

        payload = {
            "contents": [{
                "role": "user",
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": 0.1
            }
        }

        response = requests.post(url, params=params, headers=headers, json=payload, timeout=180)
        response.raise_for_status()

        class MockResponse:
            def __init__(self, response_json):
                self._response_json = response_json
                candidates = response_json.get("candidates", [])
                if candidates and "content" in candidates[0] and "parts" in candidates[0]["content"]:
                    parts = candidates[0]["content"]["parts"]
                    if parts and "text" in parts[0]:
                        self.text = parts[0]["text"]
                    else:
                        self.text = ""
                else:
                    self.text = ""

        return MockResponse(response.json())

    def correct_transcript(self, transcript_text: str) -> Dict[str, Any]:
        """
        Send transcript TEXT to Gemini for Hinglish correction.
        Text-only API call = very cheap (no audio tokens).
        Falls back to original text on error.
        """
        if not transcript_text.strip():
            return {'transcript': transcript_text}

        prompt = """You are a Hinglish transcription expert. Clean up this transcript:
- Hindi words -> Devanagari script (हिंदी)
- English words -> Latin script
- Fix spelling errors, preserve exact word order and meaning
- Do NOT add, remove, or reorder words
- Return ONLY the corrected transcript text, no explanations

TRANSCRIPT:
""" + transcript_text

        try:
            print(f"[Vertex AI] Correcting transcript ({len(transcript_text)} chars, text-only)...")
            response = self._generate_text_content(prompt)
            corrected = response.text.strip()
            if corrected:
                print(f"[Vertex AI] Correction done. {len(corrected)} chars.")
                return {'transcript': corrected}
            print("[Vertex AI] Correction returned empty, using original")
            return {'transcript': transcript_text}
        except Exception as e:
            print(f"[Vertex AI] Correction error: {str(e)}, using original")
            import traceback
            traceback.print_exc()
            return {'transcript': transcript_text}

    def _generate_content(self, prompt: str, audio_bytes: bytes, mime_type: str):
        """Generate content using Vertex AI API via REST."""
        # Vertex AI endpoint for generateContent
        url = f"https://aiplatform.googleapis.com/v1/publishers/google/models/{self.model_name}:generateContent"
        params = {"key": self.api_key}
        headers = {"Content-Type": "application/json"}
        
        payload = {
            "contents": [{
                "role": "user",
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": base64.b64encode(audio_bytes).decode('utf-8')
                        }
                    }
                ]
            }],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.1
            }
        }
        
        response = requests.post(url, params=params, headers=headers, json=payload, timeout=180)
        response.raise_for_status()  # Raises an HTTPError for bad responses
        
        # Create a simple object to mimic the genai response structure
        class MockResponse:
            def __init__(self, response_json):
                self._response_json = response_json
                # Extract text from the first candidate's first part
                candidates = response_json.get("candidates", [])
                if candidates and "content" in candidates[0] and "parts" in candidates[0]["content"]:
                    parts = candidates[0]["content"]["parts"]
                    if parts and "text" in parts[0]:
                        self.text = parts[0]["text"]
                    else:
                        self.text = ""
                else:
                    self.text = ""
        
        return MockResponse(response.json())

    def transcribe(self, audio_path: str, mode: str = 'native_language') -> Dict[str, Any]:
        if not os.path.exists(audio_path):
            return {'language': 'Unknown', 'transcript': '', 'error': f'Audio file not found: {audio_path}'}

        with open(audio_path, 'rb') as f:
            audio_bytes = f.read()

        mime_type = self._get_mime_type(audio_path)

        prompts = {
            'native_hinglish': """You are an expert audio transcriptionist. Analyze this audio file carefully and provide:
1. The detected primary language of the speech (e.g. Hindi, Gujarati, Tamil, Telugu, Marathi, Bengali, Punjabi, English, etc.)
2. A complete, accurate transcript of ALL spoken content.

IMPORTANT FORMATTING RULES:
- Transcribe ALL speech in the NATIVE SCRIPT of the detected language (Devanagari for Hindi/Marathi, Gujarati script, Tamil script, Telugu script, Gurmukhi for Punjabi, Bengali script, etc.).
- If English words or loanwords are spoken, TRANSLITERATE them into the native script (e.g. "market" → "मार्केट" in Hindi, "બજાર" in Gujarati, "மார்க்கெட்" in Tamil).
- Do NOT use Latin/English script for any words.
- Return ONLY valid JSON in this exact format: {"language": "Detected Language", "transcript": "Full transcript text here"}""",

            'native_english': """You are an expert audio transcriptionist. Analyze this audio file carefully and provide:
1. The detected primary language of the speech (e.g. Hindi, Gujarati, Tamil, Telugu, Marathi, Bengali, Punjabi, English, etc.)
2. A complete, accurate transcript of ALL spoken content.

CRITICAL — STRICTLY FOLLOW THESE RULES:
- Transcribe native language words (Hindi, Gujarati, etc.) in their NATIVE SCRIPT (Devanagari, Gujarati script, Tamil script, etc.).
- English words spoken in the audio MUST remain in their ORIGINAL Latin/English script.
- NEVER transliterate an English word into the native script.

Examples of CORRECT vs WRONG output:
  ✅ CORRECT: "मुझे market जाना है"
  ❌ WRONG: "मुझे मार्केट जाना है" (this is INCORRECT — never do this)
  
  ✅ CORRECT: "मैंने इस perfume का use किया"
  ❌ WRONG: "मैंने इस परफ्यूम का यूज किया"
  
  ✅ CORRECT: "यह 100% organic, skin friendly और sustainable packaging के साथ आता है"
  ❌ WRONG: "यह 100% ऑर्गेनिक, स्किन फ्रेंडली और सस्टेनेबल पैकेजिंग के साथ आता है"

REMEMBER: If the speaker says an English word, write it in English. If they say a native language word, write it in native script. This is a HYBRID transcription.
- If the entire speech is in English, transcribe in English as normal.
- Return ONLY valid JSON in this exact format: {"language": "Detected Language", "transcript": "Full transcript text here"}""",

            'english': """You are an expert audio transcriptionist. Analyze this audio file carefully and provide:
1. The detected primary language of the speech (one of: English, Hindi, Hinglish, Spanish, French, German, Chinese, Japanese, Korean, or Other)
2. A complete, accurate transcript of ALL spoken content.

CRITICAL — STRICTLY FOLLOW THESE RULES:
- Write ALL speech in Latin/English script only.
- Transcribe Hindi and other Indian language words in ROMANIZED form — do NOT use Devanagari or any other native script.
- Keep English words in their original English form.
- Do NOT translate anything — just transcribe what is spoken.

Examples:
  ✅ CORRECT: "maine perfumes to bahut saare use kiye hain"
  ❌ WRONG: "मैंने परफ्यूम्स तो बहुत सारे यूज किए हैं" (INCORRECT — never use Devanagari)
  ✅ CORRECT: "but my most favorite hai Aramholic perfumes"
  ❌ WRONG: "लेकिन मेरा सबसे पसंदीदा एरामोलिक परफ्यूम्स है" (INCORRECT — don't translate)

REMEMBER: This is a TRANSCRIPTION task, not translation. Write exactly what the person says, in Roman/Latin script.
- Return ONLY valid JSON in this exact format: {"language": "Detected Language", "transcript": "Full transcript text here"}""",
        }

        mode_map = {
            'native_language': 'native_hinglish',
            'native_english': 'native_english',
            'english': 'english',
        }
        prompt = prompts.get(mode_map.get(mode, 'native_hinglish'), prompts['native_hinglish'])

        try:
            response = self._generate_content(prompt, audio_bytes, mime_type)
            text = self._clean_json_response(response.text)
            result = json.loads(text)
            return {'language': result.get('language', 'Unknown'), 'transcript': result.get('transcript', '')}
        except Exception as e:
            return {'language': 'Unknown', 'transcript': '', 'error': str(e)}
    
    def align_transcript(self, audio_path: str, transcript: str) -> Dict[str, Any]:
        if not os.path.exists(audio_path): 
            return {'segments': [], 'error': 'Audio file not found'}
            
        with open(audio_path, 'rb') as f: 
            audio_bytes = f.read()
            
        mime_type = self._get_mime_type(audio_path)
        prompt = f"Given this audio and transcript, create precise caption segments (2-6 words each) with start/end timestamps. TRANSCRIPT: {transcript}\nReturn ONLY JSON: {{\"segments\": [{{ \"start\": 0.0, \"end\": 2.5, \"text\": \"...\" }}]}}"
        
        try:
            print(f"[Gemini] Starting alignment for {len(transcript)} chars transcript")
            response = self._generate_content(prompt, audio_bytes, mime_type)
            
            if not response or not hasattr(response, 'text'):
                print(f"[Gemini] Alignment failed: No text in response. Finish reason: {getattr(response, 'candidates', [{}])[0].get('finish_reason', 'unknown') if hasattr(response, 'candidates') else 'N/A'}")
                return {'segments': [], 'error': 'AI failed to generate a response. The transcript might be too long or the audio unclear.'}

            cleaned_text = self._clean_json_response(response.text)
            if not cleaned_text:
                return {'segments': [], 'error': 'AI returned an empty response for alignment.'}
                
            result = json.loads(cleaned_text)
            segments = result.get('segments', [])
            
            if not segments:
                print(f"[Gemini] No segments found in JSON response: {cleaned_text[:200]}")
                return {'segments': [], 'error': 'AI failed to generate valid caption segments.'}

            for seg in segments:
                seg['start'] = float(seg.get('start', 0))
                seg['end'] = float(seg.get('end', 0))
                
            print(f"[Gemini] Successfully generated {len(segments)} segments")
            return {'segments': sorted(segments, key=lambda x: x['start'])}
        except Exception as e: 
            print(f"[Gemini] Unexpected error during alignment: {str(e)}")
            import traceback
            traceback.print_exc()
            return {'segments': [], 'error': str(e)}
    
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
