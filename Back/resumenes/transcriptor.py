import sounddevice as sd
import scipy.io.wavfile as wav
import speech_recognition as sr
import numpy as np
import os
import subprocess
import tempfile
import shutil
from typing import Optional, Tuple, List
import math

# Verificar disponibilidad de herramientas
try:
    from pydub import AudioSegment
    from pydub.utils import which
    PYDUB_AVAILABLE = True
    print("✅ pydub disponible")
except ImportError:
    PYDUB_AVAILABLE = False
    print("⚠️ pydub no disponible")

# Verificar FFmpeg
try:
    result = subprocess.run(['ffmpeg', '-version'], 
                          capture_output=True, text=True, timeout=5)
    FFMPEG_AVAILABLE = result.returncode == 0
    if FFMPEG_AVAILABLE:
        print("✅ FFmpeg disponible")
    else:
        print("⚠️ FFmpeg no disponible")
except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.SubprocessError):
    FFMPEG_AVAILABLE = False
    print("⚠️ FFmpeg no disponible")

if not FFMPEG_AVAILABLE and not PYDUB_AVAILABLE:
    print("❌ ADVERTENCIA: Ni FFmpeg ni pydub están disponibles")
    print("   La conversión de WebM puede fallar")

class AudioTranscriptor:
    def __init__(self, samplerate=44100):
        self.recording = []
        self.samplerate = samplerate
        self.stream = None
        self.recognizer = sr.Recognizer()
        # Configuración optimizada para mejor reconocimiento
        self.recognizer.energy_threshold = 3000
        self.recognizer.dynamic_energy_threshold = True
        self.recognizer.pause_threshold = 0.8
        self.recognizer.phrase_threshold = 0.2
        self.recognizer.non_speaking_duration = 0.5
        
    def transcribir_archivo(self, ruta_archivo):
        """Transcribe un archivo de audio (WAV o WebM) SIN usar chunks"""
        print(f"🔍 Verificando archivo: {ruta_archivo}")
        
        if not os.path.exists(ruta_archivo):
            error_msg = f"El archivo {ruta_archivo} no existe"
            print(f"❌ {error_msg}")
            raise FileNotFoundError(error_msg)
        
        file_size = os.path.getsize(ruta_archivo)
        print(f"📊 Tamaño del archivo: {file_size} bytes")
        
        if file_size == 0:
            error_msg = "El archivo de audio está vacío"
            print(f"❌ {error_msg}")
            raise ValueError(error_msg)
        
        archivo_para_transcribir = ruta_archivo
        archivo_temporal_wav = None
        
        try:
            # Si es WebM, convertir a WAV
            # Si es WebM, convertir a WAV
            if ruta_archivo.lower().endswith('.webm'):
                print("🔄 Detectado archivo WebM, iniciando conversión...")
                archivo_temporal_wav = self.convertir_webm_a_wav(ruta_archivo)  # ❌ MÉTODO FALTANTE
                archivo_para_transcribir = archivo_temporal_wav
            
            print(f"🎯 Iniciando transcripción COMPLETA de {archivo_para_transcribir}")
            
            # SIEMPRE usar método tradicional (sin chunks)
            resultado = self.transcribir_audio_completo(archivo_para_transcribir)
            
            if not resultado or resultado.strip() == "":
                error_msg = "La transcripción resultó vacía - el audio puede ser inaudible o muy corto"
                print(f"❌ {error_msg}")
                raise ValueError(error_msg)
            
            print(f"✅ Transcripción completada exitosamente: '{resultado[:50]}...'")
            return resultado
            
        except Exception as e:
            error_msg = f"No se pudo transcribir el archivo: {str(e)}"
            print(f"❌ {error_msg}")
            import traceback
            traceback.print_exc()
            raise ValueError(error_msg)
        
        finally:
            # Limpiar archivo temporal WAV si se creó
            if archivo_temporal_wav and os.path.exists(archivo_temporal_wav):
                try:
                    os.remove(archivo_temporal_wav)
                    print(f"🗑️ Archivo temporal eliminado: {archivo_temporal_wav}")
                except Exception as e:
                    print(f"⚠️ No se pudo eliminar archivo temporal: {e}")
    
    def transcribir_audio_completo(self, archivo_wav):
        """Transcribe archivo WAV completo SIN dividir en chunks"""
        try:
            print(f"🎵 Transcribiendo archivo completo: {archivo_wav}")
            print(f"📊 Tamaño del archivo: {os.path.getsize(archivo_wav)} bytes")
            
            with sr.AudioFile(archivo_wav) as source:
                print("🎧 Ajustando para ruido ambiente...")
                self.recognizer.adjust_for_ambient_noise(source, duration=1.0)
                print("📥 Cargando audio completo...")
                audio = self.recognizer.record(source)  # Cargar TODO el audio
                print(f"📏 Audio cargado: {len(audio.frame_data)} bytes")
            
            print("🗣️ Procesando audio con Google Speech Recognition...")
            
            # Intentar español primero
            try:
                print("🇪🇸 Intentando transcripción en español...")
                texto = self.recognizer.recognize_google(audio, language="es-ES")
                print(f"✅ Transcripción exitosa (ES): {len(texto)} caracteres")
                print(f"📝 Texto: {texto[:100]}...")
                return texto
            except sr.UnknownValueError:
                print("⚠️ No se pudo entender en español, intentando inglés...")
                try:
                    print("🇺🇸 Intentando transcripción en inglés...")
                    texto = self.recognizer.recognize_google(audio, language="en-US")
                    print(f"✅ Transcripción exitosa (EN): {len(texto)} caracteres")
                    print(f"📝 Texto: {texto[:100]}...")
                    return texto
                except sr.UnknownValueError:
                    print("❌ Audio no comprensible en ningún idioma")
                    return ""
            except sr.RequestError as e:
                print(f"❌ Error del servicio de Google: {e}")
                return ""
                    
        except sr.RequestError as e:
            print(f"❌ Error del servicio de reconocimiento: {e}")
            print("💡 Posibles causas: Sin conexión a internet, API key inválida, servicio no disponible")
            return ""
        except Exception as e:
            print(f"❌ Error inesperado en transcripción: {e}")
            import traceback
            traceback.print_exc()
            return ""
    
    def procesar_audio_completo(self, archivo_salida="grabacion.wav"):
        """Graba, guarda y transcribe en un solo paso SIN chunks"""
        try:
            audio, rate = self.grabar_hasta_enter()
            self.guardar_audio(audio, rate, archivo_salida)
            return self.transcribir_archivo(archivo_salida)  # Sin usar_chunks parameter
        finally:
            # Limpiar archivo temporal
            if os.path.exists(archivo_salida):
                try:
                    os.remove(archivo_salida)
                except:
                    pass

    def convertir_webm_a_wav(self, archivo_webm):
        """Convierte archivo WebM a WAV usando pydub o FFmpeg"""
        try:
            # Crear archivo temporal WAV
            archivo_wav = tempfile.mktemp(suffix='.wav')
            
            if PYDUB_AVAILABLE:
                print("🔄 Convirtiendo con pydub...")
                audio = AudioSegment.from_file(archivo_webm)
                audio.export(archivo_wav, format="wav")
            elif FFMPEG_AVAILABLE:
                print("🔄 Convirtiendo con FFmpeg...")
                subprocess.run([
                    'ffmpeg', '-i', archivo_webm, 
                    '-acodec', 'pcm_s16le', 
                    '-ar', '16000', 
                    archivo_wav
                ], check=True, capture_output=True)
            else:
                raise Exception("Ni pydub ni FFmpeg están disponibles para conversión")
            
            print(f"✅ Conversión exitosa: {archivo_wav}")
            return archivo_wav
            
        except Exception as e:
            print(f"❌ Error en conversión WebM: {e}")
            raise ValueError(f"No se pudo convertir WebM a WAV: {e}")

if __name__ == "__main__":
    transcriptor = AudioTranscriptor(chunk_duration=30)  # Chunks de 30 segundos
    texto = transcriptor.procesar_audio_completo()
    if texto:
        print(f"\n🎯 Resultado final: {texto}")
    else:
        print("❌ No se pudo transcribir")