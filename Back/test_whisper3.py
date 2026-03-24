import whisper
import numpy as np
import os
import soundfile as sf

fs = 16000
t = np.linspace(0, 3, fs * 3)
audio = 0.5 * np.sin(2 * np.pi * 440 * t)
sf.write("test_audio.wav", audio.astype(np.float32), fs)

try:
    print("Loading model...")
    model = whisper.load_model("base")
    print("Transcribing via sf read -> float32...")
    audio_data, _ = sf.read("test_audio.wav", dtype="float32")
    res2 = model.transcribe(audio_data, language="es", fp16=False)
    print("Result (sf):", res2.get("text"))
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    if os.path.exists("test_audio.wav"):
        os.remove("test_audio.wav")
