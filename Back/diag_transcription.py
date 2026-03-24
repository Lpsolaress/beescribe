
import os
import sys
import time
import traceback
import torch
import gc

# Add parent dir to sys.path to import services
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.transcriptor import AudioTranscriptor

def test_diagnostics():
    print("🚦 DIAGNOSTICO DE TRANSCRIPCION V2")
    
    # 1. Check MLX
    try:
        import mlx_whisper
        print("✅ mlx_whisper se puede importar.")
    except Exception as e:
        print(f"❌ Fallo al importar mlx_whisper: {e}")

    # 2. Check OpenAI Whisper
    try:
        import whisper
        print("✅ whisper se puede importar.")
    except Exception as e:
        print(f"❌ Fallo al importar whisper: {e}")

    # 3. Test model load with AudioTranscriptor
    transcriptor = AudioTranscriptor()
    try:
        print("⏳ Cargando modelo...")
        transcriptor._cargar_modelo_si_es_necesario()
        print(f"✅ Motor cargado. Device: {transcriptor.device}")
        
        if transcriptor.device == "cpu":
            print("⚠️ ADVERTENCIA: Usando CPU. Esto será LENTO.")
    except Exception as e:
        print(f"❌ Error cargando modelo: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    test_diagnostics()
