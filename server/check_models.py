import os
from dotenv import load_dotenv
import vertexai
from google.oauth2 import service_account

load_dotenv()

def list_models():
    project_id = os.environ.get('GCP_PROJECT_ID')
    region = os.environ.get('GCP_REGION', 'us-central1')
    creds_path = os.environ.get('GCP_CREDENTIALS_PATH')
    
    print(f"Project: {project_id}, Region: {region}")
    
    credentials = service_account.Credentials.from_service_account_file(creds_path)
    vertexai.init(project=project_id, location=region, credentials=credentials)
    
    # In Vertex AI, models aren't "listed" in the same way as the AI SDK 
    # but we can try to initialize one and see if it works.
    
    from vertexai.generative_models import GenerativeModel
    
    test_models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash-001', 'gemini-1.5-pro-001']
    
    for m in test_models:
        try:
            print(f"Testing model: {m}...", end=" ")
            model = GenerativeModel(m)
            # Try a very simple generation
            response = model.generate_content("Hello")
            print(f"SUCCESS: {response.text[:20]}...")
            return m
        except Exception as e:
            print(f"FAILED: {e}")
    
    return None

if __name__ == '__main__':
    list_models()
