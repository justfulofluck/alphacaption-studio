import os
import google.generativeai as genai

def test_key():
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        print("No GEMINI_API_KEY found in environment!")
        return

    print(f"Testing API Key starting with: {api_key[:8]}...")
    genai.configure(api_key=api_key)

    print("\n--- Listing Available Models ---")
    try:
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"- {m.name}")
    except Exception as e:
        print(f"Error listing models: {e}")

    print("\n--- Testing Gemini Flash Latest Specifically ---")
    try:
        model = genai.GenerativeModel('gemini-flash-latest')
        response = model.generate_content("Hello")
        print(f"Success! Response: {response.text}")
    except Exception as e:
        print(f"Failed with gemini-flash-latest: {e}")

if __name__ == "__main__":
    test_key()
