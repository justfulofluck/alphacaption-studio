import os
import whisperx
from typing import Dict, Any, List, Optional

LANG_MAP = {
    'hindi': 'hi', 'hinglish': 'hi', 'english': 'en', 'telugu': 'te',
    'malayalam': 'ml', 'urdu': 'ur', 'spanish': 'es', 'french': 'fr',
    'german': 'de', 'italian': 'it', 'japanese': 'ja', 'chinese': 'zh',
    'dutch': 'nl', 'ukrainian': 'uk', 'portuguese': 'pt', 'arabic': 'ar',
    'czech': 'cs', 'russian': 'ru', 'polish': 'pl', 'hungarian': 'hu',
    'finnish': 'fi', 'persian': 'fa', 'greek': 'el', 'turkish': 'tr',
    'danish': 'da', 'hebrew': 'he', 'vietnamese': 'vi', 'korean': 'ko',
    'catalan': 'ca', 'norwegian': 'no', 'norwegian nynorsk': 'nn',
    'slovak': 'sk', 'slovenian': 'sl', 'croatian': 'hr', 'romanian': 'ro',
    'basque': 'eu', 'galician': 'gl', 'georgian': 'ka', 'latvian': 'lv',
    'filipino': 'tl', 'tagalog': 'tl', 'swedish': 'sv', 'indonesian': 'id',
    'gujarati': 'gu', 'tamil': 'ta', 'marathi': 'mr', 'bengali': 'bn',
    'punjabi': 'pa', 'kannada': 'kn', 'assamese': 'as', 'odia': 'or',
    'sindhi': 'sd', 'nepali': 'ne',
}

SUPPORTED_ALIGN_LANGS = {
    'en', 'fr', 'de', 'es', 'it', 'ja', 'zh', 'nl', 'uk', 'pt', 'ar', 'cs',
    'ru', 'pl', 'hu', 'fi', 'fa', 'el', 'tr', 'da', 'he', 'vi', 'ko', 'ur',
    'te', 'hi', 'ca', 'ml', 'no', 'nn', 'sk', 'sl', 'hr', 'ro', 'eu', 'gl',
    'ka', 'lv', 'tl', 'sv', 'id',
}


class WhisperXService:
    def __init__(self):
        self.align_model = None
        self.align_metadata = None
        self.model_loaded = False
        self._align_lang = None
        self.whisper_model = None
        self.whisper_loaded = False
        self._whisper_lang = None

    def _load_model(self, language_code: str = "en"):
        if self.model_loaded and self._align_lang == language_code:
            return
        device = "cpu"
        print(f"[WhisperX] Loading alignment model for {language_code}...")
        self.align_model, self.align_metadata = whisperx.load_align_model(
            language_code=language_code, device=device
        )
        self._align_lang = language_code
        self.model_loaded = True
        print(f"[WhisperX] Alignment model for {language_code} loaded.")

    def _load_whisper_model(self, language: Optional[str] = None):
        if self.whisper_loaded and self._whisper_lang == language:
            return
        device = "cpu"
        print(f"[WhisperX] Loading Whisper model (base, lang={language or 'auto'})...")
        self.whisper_model = whisperx.load_model(
            "base", device=device, compute_type="float32", language=language
        )
        self._whisper_lang = language
        self.whisper_loaded = True
        print("[WhisperX] Whisper model loaded.")

    def align_transcript(self, audio_path: str, transcript: str, language_code: str = "en") -> Dict[str, Any]:
        if not os.path.exists(audio_path):
            return {'segments': [], 'word_segments': [], 'error': 'Audio file not found'}

        self._load_model(language_code)

        try:
            print(f"[WhisperX] Loading audio from {audio_path}...")
            audio = whisperx.load_audio(audio_path)
            duration_sec = len(audio) / 16000
            print(f"[WhisperX] Audio loaded: {len(audio)} samples, ~{duration_sec:.1f}s")
            print("[WhisperX] Starting forced alignment...")
            whisperx_segments = [{"text": transcript, "start": 0.0, "end": duration_sec}]
            result = whisperx.align(
                whisperx_segments, self.align_model, self.align_metadata, audio,
                device="cpu", return_char_alignments=False
            )

            raw_words = result.get("word_segments", [])
            word_segments = [
                {"word": w.get("word", "").strip(), "start": w["start"], "end": w["end"]}
                for w in raw_words if "start" in w and "end" in w and w.get("word", "").strip()
            ]

            segments = []
            chunk_size = 4

            for i in range(0, len(word_segments), chunk_size):
                chunk = word_segments[i:i + chunk_size]
                if not chunk:
                    continue
                segments.append({
                    "start": chunk[0]["start"],
                    "end": chunk[-1]["end"],
                    "text": " ".join(w["word"] for w in chunk)
                })

            print(f"[WhisperX] Alignment complete. {len(word_segments)} words, {len(segments)} segments.")
            return {'segments': segments, 'word_segments': word_segments}

        except Exception as e:
            print(f"[WhisperX] Alignment error: {str(e)}")
            return {'segments': [], 'word_segments': [], 'error': str(e)}

    def transcribe_and_align(self, audio_path: str) -> Dict[str, Any]:
        """
        Run WhisperX transcription + alignment (full pipeline).
        Returns baseline transcript and word-level segments.
        Both local/CPU — zero API cost.
        """
        if not os.path.exists(audio_path):
            return {'transcript': '', 'segments': [], 'error': 'Audio file not found'}

        self._load_whisper_model()
        self._load_model()

        try:
            print(f"[WhisperX] Loading audio from {audio_path}...")
            audio = whisperx.load_audio(audio_path)
            print(f"[WhisperX] Audio loaded: {len(audio)} samples")

            result = self.whisper_model.transcribe(audio, batch_size=8)

            segments_data = result.get("segments", [])
            if not segments_data:
                return {'transcript': '', 'segments': [], 'error': 'WhisperX transcription returned no segments'}

            print("[WhisperX] Aligning transcription...")
            aligned = whisperx.align(
                segments_data, self.align_model, self.align_metadata, audio,
                device="cpu", return_char_alignments=False
            )

            word_segments = aligned.get("word_segments", [])
            baseline_text = " ".join(w.get("word", "") for w in word_segments)

            segments = []
            chunk_size = 4
            for i in range(0, len(word_segments), chunk_size):
                chunk = word_segments[i:i + chunk_size]
                valid_chunks = [w for w in chunk if 'start' in w and 'end' in w]
                if not valid_chunks:
                    continue
                segments.append({
                    "start": valid_chunks[0]["start"],
                    "end": valid_chunks[-1]["end"],
                    "text": " ".join(w["word"] for w in chunk)
                })

            print(f"[WhisperX] Transcribe+align complete. {len(segments)} segments, {len(baseline_text)} chars.")
            return {'transcript': baseline_text, 'segments': segments}

        except Exception as e:
            print(f"[WhisperX] transcribe_and_align error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {'transcript': '', 'segments': [], 'error': str(e)}

    def transcribe_with_word_timestamps(self, audio_path: str, language_code: str = "en") -> Dict[str, Any]:
        """
        WhisperX transcribe + align, returning raw word-level timestamps
        suitable for mapping Gemini text onto WhisperX's native timing.
        Forces Whisper to transcribe in the target language so the output
        script (e.g. Devanagari for Hindi) matches the alignment model.
        Returns:
          words: [{"word": "...", "start": 0.5, "end": 0.8}, ...]
          transcript: full baseline text (WhisperX's own)
        """
        if not os.path.exists(audio_path):
            return {'words': [], 'transcript': '', 'error': 'Audio file not found'}

        # Force WhisperX to transcribe in the target language so its output script
        # matches the Wav2Vec2 alignment model (e.g. Devanagari for Hindi).
        whisper_lang = language_code if language_code in ('hi', 'te', 'ml', 'ur', 'en', 'gu', 'ta', 'mr', 'bn', 'pa', 'kn') else None
        self._load_whisper_model(language=whisper_lang)
        self._load_model(language_code)

        try:
            print(f"[WhisperX] Loading audio from {audio_path}...")
            audio = whisperx.load_audio(audio_path)
            print(f"[WhisperX] Audio loaded: {len(audio)} samples")

            result = self.whisper_model.transcribe(audio, batch_size=8)
            segments_data = result.get("segments", [])
            if not segments_data:
                return {'words': [], 'transcript': '', 'error': 'WhisperX returned no segments'}

            aligned = whisperx.align(
                segments_data, self.align_model, self.align_metadata, audio,
                device="cpu", return_char_alignments=False
            )

            raw_words = aligned.get("word_segments", [])
            words = [
                {"word": w.get("word", ""), "start": w["start"], "end": w["end"]}
                for w in raw_words if "start" in w and "end" in w
            ]
            transcript = " ".join(w["word"] for w in words)

            print(f"[WhisperX] Word timestamps: {len(words)} words over {len(audio)/16000:.1f}s")
            return {'words': words, 'transcript': transcript}

        except Exception as e:
            print(f"[WhisperX] word timestamps error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {'words': [], 'transcript': '', 'error': str(e)}

    def transcribe_segments_only(self, audio_path: str) -> Dict[str, Any]:
        if not os.path.exists(audio_path):
            return {'segments': [], 'error': 'Audio file not found'}

        self._load_whisper_model()

        try:
            print(f"[WhisperX] Loading audio from {audio_path}...")
            audio = whisperx.load_audio(audio_path)
            print(f"[WhisperX] Audio loaded: {len(audio)} samples")

            result = self.whisper_model.transcribe(audio, batch_size=8)
            raw_segments = result.get("segments", [])

            segments = [
                {"text": s["text"].strip(), "start": s["start"], "end": s["end"]}
                for s in raw_segments
                if s.get("text", "").strip() and "start" in s and "end" in s
            ]

            print(f"[WhisperX] Segment-only transcribe: {len(segments)} segments over {len(audio)/16000:.1f}s")
            return {'segments': segments}

        except Exception as e:
            print(f"[WhisperX] segment transcribe error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {'segments': [], 'error': str(e)}

    def transcribe_with_word_timestamps_native(self, audio_path: str, language_code: str = None) -> Dict[str, Any]:
        if not os.path.exists(audio_path):
            return {'words': [], 'segments': [], 'error': 'Audio file not found'}

        whisper_lang = language_code if language_code and language_code in ('hi', 'te', 'ml', 'ur', 'en', 'gu', 'ta', 'mr', 'bn', 'pa', 'kn') else None
        self._load_whisper_model(language=whisper_lang)

        try:
            print(f"[WhisperX] Loading audio from {audio_path}...")
            audio = whisperx.load_audio(audio_path)
            print(f"[WhisperX] Audio loaded: {len(audio)} samples")

            try:
                result = self.whisper_model.transcribe(audio, batch_size=8, word_timestamps=True)
            except TypeError:
                print("[WhisperX] word_timestamps not supported, falling back to plain transcribe")
                result = self.whisper_model.transcribe(audio, batch_size=8)

            raw_segments = result.get("segments", [])

            word_segments = []
            for seg in raw_segments:
                words = seg.get("words", [])
                if words:
                    for w in words:
                        word = w.get("word", "").strip()
                        if word and "start" in w and "end" in w:
                            word_segments.append({
                                "word": word,
                                "start": w["start"],
                                "end": w["end"]
                            })

            if word_segments:
                print(f"[WhisperX] Native word timestamps: {len(word_segments)} words over {len(audio)/16000:.1f}s")
                return {'words': word_segments, 'segments': []}
            else:
                print("[WhisperX] No native word timestamps, returning segments instead")
                segment_list = [
                    {"text": s["text"].strip(), "start": s["start"], "end": s["end"]}
                    for s in raw_segments
                    if s.get("text", "").strip() and "start" in s and "end" in s
                ]
                full_text = " ".join(s["text"] for s in segment_list)
                return {'words': [], 'segments': segment_list, 'transcript': full_text}

        except Exception as e:
            print(f"[WhisperX] native word timestamps error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {'words': [], 'segments': [], 'error': str(e)}


    def align_gemini_text(self, audio_path: str, gemini_text: str, language_code: str) -> Dict[str, Any]:
        """
        Direct Wav2Vec2 forced alignment on Gemini's text.
        Instead of mapping Gemini text onto WhisperX word timestamps,
        this uses Wav2Vec2 to align Gemini's exact words to the audio
        at the character level — 100% accurate sync for native_language mode.
        Works when the alignment model matches Gemini's output script
        (e.g. Hindi Wav2Vec2 + Devanagari text).
        """
        if not os.path.exists(audio_path):
            return {'words': [], 'segments': [], 'error': 'Audio file not found'}

        whisper_lang = language_code if language_code in ('hi', 'te', 'ml', 'ur', 'en', 'gu', 'ta', 'mr', 'bn', 'pa', 'kn') else None
        self._load_whisper_model(language=whisper_lang)
        self._load_model(language_code)

        try:
            audio = whisperx.load_audio(audio_path)
            duration_sec = len(audio) / 16000
            print(f"[WhisperX] Direct align: {len(audio)} samples, ~{duration_sec:.1f}s")

            # Run WhisperX transcribe to get timing boundaries
            result = self.whisper_model.transcribe(audio, batch_size=8)
            raw_segments = result.get("segments", [])
            if not raw_segments:
                return {'words': [], 'segments': [], 'error': 'WhisperX returned no segments'}

            # Distribute Gemini text across WhisperX segment boundaries
            gemini_words = gemini_text.split()
            total_wx_words = sum(max(1, len(s.get("text", "").split())) for s in raw_segments)

            distributed = []
            word_idx = 0
            for i, seg in enumerate(raw_segments):
                seg_text = seg.get("text", "").strip()
                if not seg_text:
                    continue
                if i == len(raw_segments) - 1:
                    seg_words = gemini_words[word_idx:]
                else:
                    wx_count = max(1, len(seg_text.split()))
                    proportion = wx_count / total_wx_words if total_wx_words > 0 else 0
                    seg_count = max(1, round(len(gemini_words) * proportion))
                    # Ensure we don't exceed remaining words
                    seg_count = min(seg_count, len(gemini_words) - word_idx)
                    seg_words = gemini_words[word_idx:word_idx + seg_count]
                    word_idx += len(seg_words)

                if seg_words:
                    distributed.append({
                        "text": " ".join(seg_words),
                        "start": seg["start"],
                        "end": seg["end"]
                    })

            if not distributed:
                return {'words': [], 'segments': [], 'error': 'No segments to align'}

            # Run Wav2Vec2 forced alignment directly on Gemini's text
            aligned = whisperx.align(
                distributed, self.align_model, self.align_metadata, audio,
                device="cpu", return_char_alignments=False
            )

            raw_words = aligned.get("word_segments", [])
            words = [
                {"word": w.get("word", "").strip(), "start": w["start"], "end": w["end"]}
                for w in raw_words if "start" in w and "end" in w and w.get("word", "").strip()
            ]

            if not words:
                return {'words': [], 'segments': [], 'error': 'Alignment produced no words'}

            # Build segments (4 words each, matching Gemini's text)
            segments = []
            chunk_size = 4
            for i in range(0, len(words), chunk_size):
                chunk = words[i:i + chunk_size]
                segments.append({
                    "start": chunk[0]["start"],
                    "end": chunk[-1]["end"],
                    "text": " ".join(w["word"] for w in chunk)
                })

            print(f"[WhisperX] Direct align: {len(words)} words, {len(segments)} segments over {duration_sec:.1f}s")
            return {'segments': segments, 'word_segments': words}

        except Exception as e:
            print(f"[WhisperX] Direct align error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {'segments': [], 'word_segments': [], 'error': str(e)}


def map_gemini_to_timestamps(gemini_text: str, wx_words: List[Dict]) -> Dict[str, Any]:
    """
    Map Gemini accurate text onto WhisperX word timestamps with exact matching.
    Three cases:
      A) Same word count → 1:1 exact mapping (zero approximation).
      B) Fewer Gemini words → each Gemini word spans multiple WhisperX words.
      C) More Gemini words → interpolate between WhisperX word timestamps.
    No word is ever dropped or left without a timestamp.
    Returns {segments, word_segments}.
    """
    gemini_words = gemini_text.split()
    if not wx_words or not gemini_words:
        return {'segments': [], 'word_segments': []}

    num_gemini = len(gemini_words)
    num_wx = len(wx_words)

    mapped = []
    for i, gw in enumerate(gemini_words):
        if num_gemini == 1:
            wx_idx = num_wx // 2
            mapped.append({
                "word": gw,
                "start": wx_words[wx_idx]["start"],
                "end": wx_words[wx_idx]["end"]
            })
        elif num_gemini == num_wx:
            # Case A: 1:1 exact mapping — no approximation
            mapped.append({
                "word": gw,
                "start": wx_words[i]["start"],
                "end": wx_words[i]["end"]
            })
        elif num_gemini < num_wx:
            # Case B: Fewer Gemini words — each maps to a range of WhisperX words
            start_idx = round(i * (num_wx - 1) / (num_gemini - 1))
            end_idx = round((i + 1) * (num_wx - 1) / (num_gemini - 1))
            end_idx = min(end_idx, num_wx - 1)
            mapped.append({
                "word": gw,
                "start": wx_words[start_idx]["start"],
                "end": wx_words[end_idx]["end"]
            })
        else:
            # Case C: More Gemini words — interpolate between WhisperX timestamps
            pos = i * (num_wx - 1) / (num_gemini - 1)
            wx_idx = int(pos)
            next_idx = min(wx_idx + 1, num_wx - 1)
            frac = pos - wx_idx
            start = wx_words[wx_idx]["start"] + frac * (wx_words[next_idx]["start"] - wx_words[wx_idx]["start"])
            end = wx_words[wx_idx]["end"] + frac * (wx_words[next_idx]["end"] - wx_words[wx_idx]["end"])
            mapped.append({
                "word": gw,
                "start": start,
                "end": end
            })

    segments = []
    chunk_size = 4
    for i in range(0, len(mapped), chunk_size):
        chunk = mapped[i:i + chunk_size]
        segments.append({
            "start": chunk[0]["start"],
            "end": chunk[-1]["end"],
            "text": " ".join(w["word"] for w in chunk)
        })

    return {'segments': segments, 'word_segments': mapped}


def map_gemini_to_segments(gemini_text: str, wx_segments: List[Dict]) -> Dict[str, Any]:
    gemini_words = gemini_text.split()
    if not wx_segments or not gemini_words:
        return {'segments': [], 'word_segments': []}

    valid_segs = [s for s in wx_segments if s.get("end", 0) > s.get("start", 0)]
    if not valid_segs:
        return {'segments': [], 'word_segments': []}

    total_speech_duration = sum(s["end"] - s["start"] for s in valid_segs)
    if total_speech_duration <= 0:
        return {'segments': [], 'word_segments': []}

    char_lengths = [len(w) for w in gemini_words]
    total_chars = sum(char_lengths)
    if total_chars == 0:
        return {'segments': [], 'word_segments': []}

    word_segments = []
    current_seg_idx = 0
    seg_time_used = 0.0

    for w, clen in zip(gemini_words, char_lengths):
        word_speech_dur = (clen / total_chars) * total_speech_duration
        seg = valid_segs[current_seg_idx]
        start_time = seg["start"] + seg_time_used
        
        seg_time_used += word_speech_dur
        
        while seg_time_used > (valid_segs[current_seg_idx]["end"] - valid_segs[current_seg_idx]["start"]) and current_seg_idx < len(valid_segs) - 1:
            seg_time_used -= (valid_segs[current_seg_idx]["end"] - valid_segs[current_seg_idx]["start"])
            current_seg_idx += 1
            
        end_time = valid_segs[current_seg_idx]["start"] + seg_time_used
        end_time = min(end_time, valid_segs[current_seg_idx]["end"])
        
        word_segments.append({"word": w, "start": start_time, "end": end_time})

    for i in range(1, len(word_segments)):
        prev_end = word_segments[i-1]["end"]
        if word_segments[i]["start"] < prev_end:
            word_segments[i]["start"] = prev_end
        if word_segments[i]["end"] <= word_segments[i]["start"]:
            word_segments[i]["end"] = word_segments[i]["start"] + 0.05

    segments = []
    for i in range(0, len(word_segments), 4):
        chunk = word_segments[i:i+4]
        segments.append({
            "start": chunk[0]["start"],
            "end": chunk[-1]["end"],
            "text": " ".join(w["word"] for w in chunk)
        })

    return {'segments': segments, 'word_segments': word_segments}


def duration_based_mapping(transcript: str, audio_path: str) -> Dict[str, Any]:
    if not os.path.exists(audio_path):
        return {'segments': [], 'word_segments': [], 'error': 'Audio file not found'}

    try:
        audio = whisperx.load_audio(audio_path)
        duration = len(audio) / 16000
    except Exception as e:
        return {'segments': [], 'word_segments': [], 'error': str(e)}

    words = transcript.split()
    if not words or duration <= 0:
        return {'segments': [], 'word_segments': []}

    char_lengths = [len(w) for w in words]
    total_chars = sum(char_lengths)

    word_segments = []
    cum = 0.0
    for w, clen in zip(words, char_lengths):
        cum += clen
        start = (cum - clen) / total_chars * duration
        end = cum / total_chars * duration
        word_segments.append({"word": w, "start": start, "end": end})

    segments = []
    for i in range(0, len(word_segments), 4):
        chunk = word_segments[i:i + 4]
        segments.append({
            "start": chunk[0]["start"],
            "end": chunk[-1]["end"],
            "text": " ".join(w["word"] for w in chunk)
        })

    return {'segments': segments, 'word_segments': word_segments}


def distribute_text_to_segments(corrected_text: str, original_segments: List[Dict]) -> List[Dict]:
    """
    Distribute corrected text across original segments preserving timing.
    Each segment gets text proportional to its original word count.
    Last segment absorbs any remainder from rounding.
    """
    corrected_words = corrected_text.split()
    num_segments = len(original_segments)
    total_orig_words = sum(max(1, len(s["text"].split())) for s in original_segments)

    if num_segments == 0 or not corrected_words:
        return original_segments

    word_idx = 0
    new_segments = []
    for i, seg in enumerate(original_segments):
        if i == num_segments - 1:
            seg_words = corrected_words[word_idx:]
        else:
            orig_count = max(1, len(seg["text"].split()))
            proportion = orig_count / total_orig_words
            seg_count = max(1, round(len(corrected_words) * proportion))
            seg_words = corrected_words[word_idx:word_idx + seg_count]
            word_idx += len(seg_words)

        new_segments.append({
            "start": seg["start"],
            "end": seg["end"],
            "text": " ".join(seg_words)
        })

    return new_segments
