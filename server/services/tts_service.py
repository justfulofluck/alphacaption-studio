import edge_tts
import asyncio
import os
import uuid
from flask import current_app

class TTSService:
    @staticmethod
    async def _get_voices_async():
        voices = await edge_tts.list_voices()
        return voices

    @staticmethod
    def get_voices():
        """Returns a list of available Edge TTS voices."""
        return asyncio.run(TTSService._get_voices_async())

    @staticmethod
    async def _generate_audio_async(text: str, voice: str, output_path: str, rate: str = "+0%", pitch: str = "+0Hz"):
        communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        await communicate.save(output_path)

    @staticmethod
    def generate_audio(text: str, voice: str, rate: str = "+0%", pitch: str = "+0Hz") -> str:
        """
        Generates audio using edge-tts and saves it in the static/uploads folder.
        Returns the filename.
        """
        # Ensure upload folder exists
        upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
        tts_folder = os.path.join(upload_folder, 'tts')
        os.makedirs(tts_folder, exist_ok=True)
        
        filename = f"tts_{uuid.uuid4().hex}.mp3"
        output_path = os.path.join(tts_folder, filename)
        
        # Run async function in a sync wrapper
        asyncio.run(TTSService._generate_audio_async(text, voice, output_path, rate, pitch))
        
        return filename
