import os
from dotenv import load_dotenv
from services.vertex_service import VertexService

load_dotenv()

def test_transcription():
    try:
        service = VertexService()
        # Find an audio file to test with
        upload_dir = 'uploads'
        files = os.listdir(upload_dir)
        audio_files = [f for f in files if f.endswith(('.mp3', '.wav'))]
        
        if not audio_files:
            print("No audio files found in uploads to test with.")
            return
            
        test_file = os.path.join(upload_dir, audio_files[0])
        print(f"Testing transcription with: {test_file}")
        
        result = service.transcribe(test_file)
        print("Result:")
        print(result)
    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_transcription()
