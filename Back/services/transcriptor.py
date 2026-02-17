# services/transcriptor.py

import os
import subprocess
import tempfile
import whisper
import torch
import numpy as np
import soundfile as sf  # <-- ¡La librería clave!

# --- SOLUCIÓN FINAL HÍBRIDA (CARGA EN MEMORIA) ---

class AudioTranscriptor:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"✅ Whisper se ejecutará en el dispositivo: {self.device.upper()}")
        try:
            print("🔄 Cargando el modelo Whisper 'base'...")
            self.model = whisper.load_model("base", device=self.device)
            print("✅ Modelo Whisper cargado y listo.")
        except Exception as e:
            print(f"❌ Error crítico al cargar el modelo Whisper: {e}")
            raise

    def convertir_a_wav_con_ffmpeg(self, ruta_origen: str) -> str:
        """Convierte cualquier audio a WAV usando una llamada directa a ffmpeg."""
        print(f"🔩 Forzando conversión a WAV usando FFmpeg directo...")
        archivo_wav_temporal = tempfile.mktemp(suffix=".wav")
        ffmpeg_path = "C:\\ffmpeg\\bin\\ffmpeg.exe"

        command = [
            ffmpeg_path, "-i", ruta_origen, "-ac", "1", "-ar", "16000",
            "-sample_fmt", "s16", "-y", archivo_wav_temporal
        ]
        try:
            subprocess.run(command, check=True, capture_output=True, text=True)
            print(f"✅ Conversión a WAV exitosa: {archivo_wav_temporal}")
            return archivo_wav_temporal
        except subprocess.CalledProcessError as e:
            raise ValueError(f"FFmpeg falló durante la conversión: {e.stderr}")
        except FileNotFoundError:
            raise FileNotFoundError(f"No se encontró FFmpeg en la ruta: {ffmpeg_path}")

    def transcribir_archivo(self, ruta_archivo: str) -> str:
        """
        Flujo a prueba de fallos:
        1. Convierte a WAV con ffmpeg directo.
        2. Carga el WAV a un array en memoria con soundfile.
        3. Pasa el array en memoria a Whisper.
        """
        print(f"🔍 Iniciando proceso de transcripción para: {ruta_archivo}")
        
        if not os.path.exists(ruta_archivo):
            raise FileNotFoundError(f"El archivo a transcribir no fue encontrado: {ruta_archivo}")

        archivo_wav = None
        try:
            # Paso 1: Convertir a WAV. Esto funciona.
            archivo_wav = self.convertir_a_wav_con_ffmpeg(ruta_archivo)
            
            # Paso 2: Cargar el WAV a la memoria.
            # Esto evita que Whisper intente cargarlo por su cuenta.
            print("💾 Cargando archivo WAV a la memoria...")
            audio_data, sample_rate = sf.read(archivo_wav, dtype='float32')

            # Paso 3: Transcribir el array de audio en memoria.
            print("🗣️  Pasando DATOS DE AUDIO EN MEMORIA a Whisper...")
            resultado = self.model.transcribe(audio_data, language="es", fp16=False)
            
            texto_transcrito = resultado.get("text", "").strip()

            if not texto_transcrito:
                raise ValueError("Whisper no pudo generar texto de los datos de audio.")

            print("✅ Transcripción finalizada con éxito.")
            return texto_transcrito

        except Exception as e:
            error_msg = f"Ocurrió un error en el flujo de transcripción: {e}"
            print(f"❌ {error_msg}")
            raise ValueError(error_msg)
        finally:
            if archivo_wav and os.path.exists(archivo_wav):
                try:
                    os.remove(archivo_wav)
                    print("🗑️  Archivo WAV temporal eliminado.")
                except Exception as e:
                    print(f"⚠️ No se pudo eliminar el archivo WAV temporal: {e}")