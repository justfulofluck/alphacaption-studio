import os
import vertexai
from vertexai.generative_models import GenerativeModel
import json
from google.oauth2 import service_account

def list_models():
    project_id = os.environ.get('GCP_PROJECT_ID', 'vcaptiona-srt-494215')
    region = os.environ.get('GCP_REGION', 'us-central1')
    creds_json = os.environ.get('GCP_CREDENTIALS_JSON')
    
    print(f"--- Checking Vertex AI in {region} for project {project_id} ---")
    
    try:
        if creds_json:
            info = json.loads(creds_json)
            credentials = service_account.Credentials.from_service_account_info(info)
            vertexai.init(project=project_id, location=region, credentials=credentials)
        else:
            print("No credentials found in GCP_CREDENTIALS_JSON")
            return

        # Explicitly try to load Gemini 1.5 Flash
        print("\nChecking gemini-1.5-flash-001...")
        try:
            model = GenerativeModel("gemini-1.5-flash-001")
            # We can't actually 'list' models easily without the discovery engine, 
            # but we can try to initialize them.
            print("Successfully initialized gemini-1.5-flash-001")
        except Exception as e:
            print(f"Failed to initialize gemini-1.5-flash-001: {e}")

        print("\nChecking gemini-1.5-flash-002...")
        try:
            model = GenerativeModel("gemini-1.5-flash-002")
            print("Successfully initialized gemini-1.5-flash-002")
        except Exception as e:
            print(f"Failed to initialize gemini-1.5-flash-002: {e}")

        print("\nChecking gemini-1.5-flash...")
        try:
            model = GenerativeModel("gemini-1.5-flash")
            print("Successfully initialized gemini-1.5-flash")
        except Exception as e:
            print(f"Failed to initialize gemini-1.5-flash: {e}")

    except Exception as e:
        print(f"General Error: {e}")

if __name__ == "__main__":
    list_models()
