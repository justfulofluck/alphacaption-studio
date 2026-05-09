import subprocess
import json

def get_audio_duration(filepath):
    """
    Returns the duration of an audio/video file in seconds using ffprobe.
    """
    try:
        cmd = [
            'ffprobe', 
            '-v', 'error', 
            '-show_entries', 'format=duration', 
            '-of', 'default=noprint_wrappers=1:nokey=1', 
            filepath
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        return float(result.stdout)
    except Exception as e:
        print(f"Error getting duration for {filepath}: {e}")
        return 0
