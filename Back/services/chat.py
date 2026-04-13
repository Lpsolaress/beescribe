# services/chat.py

import openai
import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from models.reunion import Reunion
from services.buscador import BuscadorReunionesDB
from core.crypto import decrypt_str

load_dotenv()

MAX_MEETINGS = 5

class ChatService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.client = None
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        if api_key:
            self.client = openai.OpenAI(api_key=self.api_key)

        
    def generate_tts(self, text: str, voice: str = "alloy"):
        """Genera audio a partir de texto usando OpenAI TTS."""
        if not self.client:
            return None
        
        response = self.client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=text
        )
        return response.content
        
    def chat_with_context(self, db: Session, user_id: int, query: str, meeting_ids: list = None):
        """
        Maneja la lógica de chat inyectando contexto de una o múltiples reuniones.
        """
        if not self.client:
            return "El servicio de IA no está configurado (falta API Key)."

        contexto = ""
        system_prompt = "Eres Ali-IA, una asistente experta en gestión de reuniones y productividad. SIEMPRE responde en español, de forma clara, profesional y concisa. Actúa como una asistente servicial y atenta."
        
        if meeting_ids and len(meeting_ids) > 0:
            # Limitar a MAX_MEETINGS
            meeting_ids = meeting_ids[:MAX_MEETINGS]
            
            # Cargar las reuniones solicitadas
            reuniones = db.query(Reunion).filter(
                Reunion.id.in_(meeting_ids),
                Reunion.user_id == user_id
            ).all()
            
            if not reuniones:
                return "No se encontraron las reuniones especificadas o no tienes permiso."
            
            if len(reuniones) == 1:
                # Una sola reunión: usar transcripción completa
                r = reuniones[0]
                transcripcion = decrypt_str(r.transcripcion) or ""
                contexto = f"CONTEXTO DE LA REUNIÓN ACTUAL:\n"
                contexto += f"Título: {r.titulo}\n"
                contexto += f"Fecha: {r.fecha_creacion}\n"
                contexto += f"Transcripción:\n{transcripcion[:15000]}\n"
                
                system_prompt += (
                    f"Estás ayudando al usuario con la reunión titulada '{r.titulo}'. "
                    f"Responde basándote en la transcripción proporcionada. "
                    f"Si la respuesta no está en el texto, indícalo cortésmente."
                )
            else:
                # Múltiples reuniones: usar resúmenes para optimizar tokens
                contexto = f"CONTEXTO DE {len(reuniones)} REUNIONES SELECCIONADAS PARA ANÁLISIS:\n\n"
                
                for i, r in enumerate(reuniones, 1):
                    resumen = decrypt_str(r.resumen_md) or ""
                    transcripcion = decrypt_str(r.transcripcion) or ""
                    
                    contexto += f"--- REUNIÓN {i}: {r.titulo} ({r.fecha_creacion}) ---\n"
                    
                    # Para 2 reuniones: usar transcripción (limitada)
                    # Para 3+: usar resumen para ahorrar tokens
                    if len(reuniones) <= 2:
                        contexto += f"Transcripción:\n{transcripcion[:7000]}\n\n"
                    else:
                        contexto += f"Resumen:\n{resumen[:3000]}\n\n"
                
                titulos = ", ".join([f"'{r.titulo}'" for r in reuniones])
                system_prompt += (
                    f"El usuario ha seleccionado {len(reuniones)} reuniones para analizar en conjunto: {titulos}. "
                    f"Tu trabajo es comparar, encontrar patrones, identificar temas recurrentes, "
                    f"contradicciones, decisiones pendientes, y generar insights cruzados entre ellas. "
                    f"Responde de forma estructurada con secciones claras."
                )
        else:
            # Sin IDs: búsqueda general por relevancia
            buscador = BuscadorReunionesDB()
            resultados = buscador.buscar(db, user_id, consulta=query)
            
            if resultados:
                contexto = "CONTEXTO DE REUNIONES RELACIONADAS ENCONTRADAS:\n"
                for r in resultados[:3]:
                    resumen = decrypt_str(r.resumen_md) or ""
                    contexto += f"--- Reunión: {r.titulo} ({r.fecha_creacion}) ---\n"
                    contexto += f"Resumen: {resumen[:1000]}\n\n"
                
                system_prompt += "Has encontrado reuniones relacionadas en el historial del usuario. Úsalas para responder a su consulta."
            else:
                system_prompt += (
                    "No se encontraron reuniones específicas relacionadas en el historial inmediato, "
                    "pero puedes responder de forma general sobre productividad o ayudar al usuario a buscar mejor."
                )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"{contexto}\n\nPregunta del usuario: {query}"}
        ]

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=1000
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"❌ Error en ChatService: {e}")
            return f"Lo siento, hubo un error al procesar tu solicitud con la IA: {str(e)}"
