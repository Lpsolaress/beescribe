import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
if api_key:
    print(f"Testing key: {repr(api_key)}")
    print(f"Key length: {len(api_key)}")
    if api_key.endswith(' '):
        print("⚠️ WARNING: Key has a trailing space!")
    client = OpenAI(api_key=api_key)
    try:
        response = client.models.list()
        print("✅ API Key is valid!")
    except Exception as e:
        print(f"❌ API Key is invalid: {e}")
else:
    print("❌ OPENAI_API_KEY is not set or empty!")
    exit(1)

