# test_chat_logic.py
import os
import sys
from dotenv import load_dotenv

# Añadir el path para importar servicios y modelos
sys.path.append(os.getcwd())

from core.database import SessionLocal
from services.chat import ChatService
from models.reunion import Reunion

load_dotenv()

def test_chat():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ NO API KEY FOUND")
        return

    chat_service = ChatService(api_key=api_key)
    db = SessionLocal()
    
    # Usuario ID 4 (luis@beescribe.com) se vio en los logs anteriores
    user_id = 4
    meeting_id = 48
    
    print(f"🤖 Probando ChatService con Reunión ID {meeting_id}...")
    
    query = "¿De qué trató esta reunión brevemente?"
    respuesta = chat_service.chat_with_context(db, user_id, query, meeting_id=meeting_id)
    
    print("-" * 30)
    print(f"Pregunta: {query}")
    print(f"Respuesta IA:\n{respuesta}")
    print("-" * 30)
    
    db.close()

if __name__ == "__main__":
    test_chat()
