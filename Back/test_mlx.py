import os
import mlx_whisper
import numpy as np

# Generar un tono de 1 segundo de silencio como test
dummy_audio = "test_audio.wav"
os.system(f"ffmpeg -f lavfi -i anullsrc=r=16000:cl=mono -t 1 -y {dummy_audio}")

print("🚀 Probando mlx-whisper...")
try:
    model_name = "mlx-community/whisper-base-mlx"
    resultado = mlx_whisper.transcribe(dummy_audio, path_or_hf_repo=model_name)
    print("✅ Resultado MLX:", resultado.get("text"))
except Exception as e:
    print("❌ Error en MLX:", e)
finally:
    if os.path.exists(dummy_audio):
        os.remove(dummy_audio)
