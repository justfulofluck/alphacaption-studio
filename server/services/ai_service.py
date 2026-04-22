import os
import base64
import json
import google.generativeai as genai

class GeminiService:
    def __init__(self):
        api_key = os.environ.get('GEMINI_API_KEY', '')
        if not api_key:
            raise ValueError("GEMINI_API_KEY not configured in environment")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-pro')
    
    def transcribe(self, audio_path):
        with open(audio_path, 'rb') as f:
            audio_data = base64.b64encode(f.read()).decode('utf-8')
        
        prompt = """You are an expert audio transcriptionist. Analyze this audio file carefully and provide:

1. The detected primary language of the speech (one of: English, Hindi, Hinglish, Spanish, French, German, Chinese, Japanese, Korean, or Other)

2. A complete, accurate transcript of ALL spoken content.

IMPORTANT FORMATTING RULES:
- If the audio is in Hinglish (mixed Hindi + English), write Hindi words in Devanagari script (हिंदी) and English words in Latin script.
- Preserve the original language of each word.
- Include natural pauses indicated by "..." or line breaks.
- Be precise and do not skip any words.

Return ONLY valid JSON in this exact format:
{"language": "Detected Language", "transcript": "Full transcript text here"}
"""
        
        response = self.model.generate_content([
            prompt,
            {'inline_data': {'mime_type': 'audio/mpeg', 'data': audio_data}}
        ])
        
        try:
            text = response.text.strip()
            if text.startswith('```json'):
                text = text[7:]
            if text.startswith('```'):
                text = text[3:]
            if text.endswith('```'):
                text = text[:-3]
            
            return json.loads(text.strip())
        except json.JSONDecodeError:
            return {'language': 'Unknown', 'transcript': response.text}
    
    def align_transcript(self, audio_path, transcript):
        with open(audio_path, 'rb') as f:
            audio_data = base64.b64encode(f.read()).decode('utf-8')
        
        prompt = f"""You are an expert in audio transcription and forced alignment. 

Given the audio and its transcript, create precise caption segments.

TRANSCRIPT:
{transcript}

TASK:
1. Listen/analyze the audio carefully
2. Create segments that represent natural speech chunks (2-6 words each)
3. Assign precise start and end timestamps to each segment
4. Maintain the exact wording from the transcript

RULES:
- Each segment should contain 2-6 words
- Timestamps must be in seconds with millisecond precision (e.g., 1.234)
- Segments should NOT overlap
- Include natural pause boundaries
- Keep Hinglish text in mixed script (Devanagari for Hindi, Latin for English)
- Empty or unclear audio portions should NOT have segments

Return ONLY valid JSON:
{{"segments": [{{"start": 0.0, "end": 2.5, "text": "Segment text"}}]}}
"""
        
        response = self.model.generate_content([
            prompt,
            {'inline_data': {'mime_type': 'audio/mpeg', 'data': audio_data}}
        ])
        
        try:
            text = response.text.strip()
            if text.startswith('```json'):
                text = text[7:]
            if text.startswith('```'):
                text = text[3:]
            if text.endswith('```'):
                text = text[:-3]
            
            result = json.loads(text.strip())
            segments = result.get('segments', [])
            
            for seg in segments:
                seg['start'] = float(seg.get('start', 0))
                seg['end'] = float(seg.get('end', 0))
            
            segments.sort(key=lambda x: x['start'])
            
            return {'segments': segments}
        except json.JSONDecodeError:
            return {'segments': []}
    
    def sync_segments(self, audio_path, current_segments):
        with open(audio_path, 'rb') as f:
            audio_data = base64.b64encode(f.read()).decode('utf-8')
        
        segments_json = json.dumps(current_segments, ensure_ascii=False)
        
        prompt = f"""You are an expert in audio synchronization. 

Given the audio and current caption segments, RE-SYNC the timings to match the audio precisely.

CURRENT SEGMENTS:
{segments_json}

TASK:
1. Analyze the audio carefully
2. Keep the EXACT text for each segment unchanged
3. Adjust start and end times to match where each text is actually spoken
4. Ensure no overlaps and proper sequencing

Return ONLY valid JSON with updated timings:
{{"segments": [{{"start": 1.234, "end": 3.456, "text": "Original text unchanged"}}]}}
"""
        
        response = self.model.generate_content([
            prompt,
            {'inline_data': {'mime_type': 'audio/mpeg', 'data': audio_data}}
        ])
        
        try:
            text = response.text.strip()
            if text.startswith('```json'):
                text = text[7:]
            if text.startswith('```'):
                text = text[3:]
            if text.endswith('```'):
                text = text[:-3]
            
            result = json.loads(text.strip())
            segments = result.get('segments', [])
            
            for seg in segments:
                seg['start'] = float(seg.get('start', 0))
                seg['end'] = float(seg.get('end', 0))
            
            segments.sort(key=lambda x: x['start'])
            
            return {'segments': segments}
        except json.JSONDecodeError:
            return {'segments': current_segments}
