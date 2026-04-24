import os
import sys
from pathlib import Path
from dotenv import load_dotenv

def validate():
    print("--- 🔍 Validating Environment Credentials ---")
    
    # Load .env file
    env_path = Path(__file__).parent / ".env"
    if not env_path.exists():
        print("❌ Error: .env file NOT found in backend directory!")
        print("💡 Run 'setup_project.bat' first.")
        return False
        
    load_dotenv(env_path)
    
    # Required keys
    required_keys = {
        "GEMINI_API_KEY": "Google Gemini AI key is missing. Get it from https://aistudio.google.com/app/apikey"
    }
    
    placeholders = ["your_gemini_api_key_here", "your_api_key", ""]
    
    missing = []
    for key, msg in required_keys.items():
        val = os.getenv(key)
        if not val or val in placeholders:
            missing.append((key, msg))
            
    if missing:
        print("❌ Configuration Missing:")
        for key, msg in missing:
            print(f"  - {key}: {msg}")
        print("\n⚠️  Please update backend/.env with your actual credentials.")
        return False
    
    print("✅ Backend environment looks clinical-grade!")
    return True

if __name__ == "__main__":
    if not validate():
        sys.exit(1)
    sys.exit(0)
