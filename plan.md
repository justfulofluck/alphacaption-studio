WhisperX Alignment Integration Plan
Goal
Replace Gemini-based alignment + sync with WhisperX forced alignment for precise word-level timestamps on CPU. Gemini sirf transcription ke liye rahega.
---
Why WhisperX?
Factor	Gemini Align (current)	WhisperX Align (proposed)
Timestamp accuracy	Approximate	Word-level precise
Sync needed?	Yes (after align)	No (already precise)
Cost	Per-API-call	Free (local)
Speed	~10-20s	~30-90s (CPU)
Model download	None	~1.5GB (one-time)
---
Architecture
```
Audio ──► Gemini Transcribe ──► text (Hinglish correct)
               │
               ▼
         WhisperX Align ──► word-level timestamps
               │
               ▼
         Group words into segments (2-6 words)
               │
               ▼
         Save to DB + return to frontend
```
Sync button → redundant (alignment already precise). Can be repurposed or simplified.
---
Phase 1: Dependencies
```bash
apt install ffmpeg

pip install torch torchvision torchaudio \
  --index-url https://download.pytorch.org/whl/cpu

pip install whisperx
```
`server/requirements.txt` — add:
```
torch>=2.0.0
torchaudio>=2.0.0
whisperx>=3.1.0
```
Machine resources:
RAM: ~2-3GB for model (9.3GB free ✅)
Disk: ~1.5GB download (107GB free ✅)
CPU: 12 cores ✅
GPU: ❌ Not needed (CPU mode)
---
Phase 2: New Service — `server/services/whisperx_service.py`
```python
import os
import whisperx
from typing import Dict, Any, List

class WhisperXService:
    def __init__(self):
        self.align_model = None
        self.model_loaded = False

    def _load_model(self):
        if not self.model_loaded:
            device = "cpu"
            self.align_model = whisperx.load_align_model(
                language_code="en", device=device
            )
            self.model_loaded = True

    def align_transcript(self, audio_path: str, transcript: str) -> Dict[str, Any]:
        if not os.path.exists(audio_path):
            return {'segments': [], 'error': 'Audio file not found'}

        self._load_model()

        try:
            audio = whisperx.load_audio(audio_path)
            result = whisperx.align(
                transcript, self.align_model, audio,
                device="cpu", return_char_alignments=False
            )

            word_segments = result.get("word_segments", [])
            segments = []
            chunk_size = 4  # words per segment

            for i in range(0, len(word_segments), chunk_size):
                chunk = word_segments[i:i + chunk_size]
                if not chunk:
                    continue
                segments.append({
                    "start": chunk[0]["start"],
                    "end": chunk[-1]["end"],
                    "text": " ".join(w["word"] for w in chunk)
                })

            return {'segments': segments}

        except Exception as e:
            return {'segments': [], 'error': str(e)}
```
Key design decisions:
Lazy-load model (first call triggers download)
`language_code="en"` — wav2vec2 alignment is language-agnostic
Group 4 words per segment by default
---
Phase 3: Route Changes — `server/routes/captions.py`
3a: Add WhisperXService lazy-loader
```python
from services.whisperx_service import WhisperXService

def get_whisperx_service():
    if not hasattr(captions_bp, '_whisperx_service'):
        captions_bp._whisperx_service = WhisperXService()
    return captions_bp._whisperx_service
```
3b: Modify `/align` endpoint
Changes from current:
Change	Reason
Remove credits/balance check	WhisperX is free (local)
Remove `CreditService.deduct_credits()`	Free service
Remove `Usage` logging	Free service
Replace `vertex.align_transcript()` → `whisperx.align_transcript()`	Core change
Keep DB save same	✅ No change
3c: Modify `/sync` endpoint
Option A (Recommended): Sync = WhisperX re-alignment
Takes segments from request → extracts transcript text → runs WhisperX alignment → returns precise segments.
Option B (Simpler): Sync = Just save segments to DB, no AI call
Since WhisperX alignment is already precise, sync is technically not needed. Can just save to DB and return.
---
Phase 4: Frontend — `frontend/src/App.tsx`
Component	Change
`alignTranscript()` (line 573)	No change — API format same
`syncAllSegments()` (line 890)	No change — or minor if Option B
"Smart AI Sync" button (line 1112)	Button text update optional
"Auto Sync" button (line 1154)	Button text update optional
API response format remains identical:
```json
{"message": "Alignment completed", "segments": [...]}
```
---
Files Changed
File	Action
`server/requirements.txt`	Add 3 dependencies
`server/services/whisperx_service.py`	NEW — 60 lines
`server/routes/captions.py`	Modify `/align` + `/sync` (~20 lines changed)
`frontend/src/App.tsx`	Minimal/no changes
---
Timeline Estimate
Step	Time
Install dependencies	~5 min (download time)
Write whisperx_service.py	~15 min
Modify captions.py	~10 min
Test first run (model download)	~5-10 min
Test alignment quality	~10 min
Total	~45 min - 1 hour
---
Risks & Mitigations
Risk	Impact	Mitigation
Model download fails (1.2GB)	Medium	Retry logic, fallback to Gemini
CPU slow for long audio	Medium	Chunk audio if >30min
Hinglish alignment off	Low-Medium	Use loose 4-6 word groups
RAM spike during load	Low	Load once, keep in memory
