import os
import json
import requests

class TTSAnalyzerService:
    def __init__(self):
        self.api_key = os.environ.get('GEMINI_API_KEY')
        self.model_name = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')
        
    def analyze_script(self, text: str) -> dict:
        if not self.api_key:
            return {"emotion": "Neutral", "pitch": "+0Hz", "rate": "+0%"}
            
        url = f"https://aiplatform.googleapis.com/v1/publishers/google/models/{self.model_name}:generateContent"
        params = {"key": self.api_key}
        headers = {"Content-Type": "application/json"}
        
        prompt = f"""You are a TTS Script Analyzer. Read the following script and determine its context and emotional tone.
Based on the emotion, suggest Edge TTS modifiers for 'pitch' and 'rate'.
- Pitch can range from -10Hz (deep, serious, sad) to +10Hz (excited, happy, energetic).
- Rate can range from -15% (slow, sad, serious) to +15% (fast, excited, urgent).
- Neutral text should have +0Hz and +0%.

IMPORTANT: The pitch value MUST ALWAYS include 'Hz' at the end (e.g. '+5Hz', '-5Hz', '+0Hz'). The rate value MUST ALWAYS include '%' at the end (e.g. '+5%', '-5%', '+0%').

Output exactly and ONLY a JSON object in this format:
{{
  "emotion": "Detected emotion string",
  "pitch": "+0Hz",
  "rate": "+0%"
}}

SCRIPT:
{text}
"""
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2}
        }
        
        try:
            response = requests.post(url, params=params, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            res_json = response.json()
            
            candidates = res_json.get("candidates", [])
            if candidates and "content" in candidates[0] and "parts" in candidates[0]["content"]:
                parts = candidates[0]["content"]["parts"]
                text_out = parts[0]["text"].strip()
                # Clean up markdown if any
                if text_out.startswith("```json"): text_out = text_out[7:]
                if text_out.startswith("```"): text_out = text_out[3:]
                if text_out.endswith("```"): text_out = text_out[:-3]
                
                result = json.loads(text_out.strip())
                return {
                    "emotion": result.get("emotion", "Neutral"),
                    "pitch": result.get("pitch", "+0Hz"),
                    "rate": result.get("rate", "+0%")
                }
        except Exception as e:
            print(f"[TTSAnalyzer] Error analyzing script: {e}")
            
        return {"emotion": "Neutral (Fallback)", "pitch": "+0Hz", "rate": "+0%"}
