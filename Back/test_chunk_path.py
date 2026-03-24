import whisper
import os
import numpy as np
import soundfile as sf

# Create a very short test audio file
fs = 16000
audio = np.zeros(100)
sf.write("tiny.wav", audio, fs)

try:
    model = whisper.load_model("base")
    print("Transcribing tiny file via path...")
    res = model.transcribe("tiny.wav")
    print("Result:", res.get("text"))
except Exception as e:
    print("Error:", e)
finally:
    if os.path.exists("tiny.wav"):
        os.remove("tiny.wav")
