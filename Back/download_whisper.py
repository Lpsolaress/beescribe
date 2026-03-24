import whisper
import os
from dotenv import load_dotenv

load_dotenv()

model_size = os.getenv("WHISPER_MODEL_SIZE", "base")
print(f"🚀 Descargando el modelo Whisper '{model_size}' en local...")

try:
    # whisper.load_model descarga automáticamente el modelo si no existe en ~/.cache/whisper
    model = whisper.load_model(model_size)
    print(f"✅ Modelo '{model_size}' descargado y verificado correctamente.")
except Exception as e:
    print(f"❌ Error al descargar el modelo: {e}")
