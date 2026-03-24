import whisper
import numpy as np
import os
import soundfile as sf
import subprocess

# Create a test audio file
fs = 16000
t = np.linspace(0, 3, fs * 3)
audio = 0.5 * np.sin(2 * np.pi * 440 * t)
sf.write("test_audio.wav", audio, fs)

try:
    print("Loading model...")
    model = whisper.load_model("base")
    print("Transcribing via numpy array directly...")
    res = model.transcribe(audio, language="es")
    print("Result (numpy):", res.get("text"))
    print("Transcribing via file path...")
    res2 = model.transcribe("test_audio.wav", language="es")
    print("Result (file):", res2.get("text"))
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    if os.path.exists("test_audio.wav"):
        os.remove("test_audio.wav")
