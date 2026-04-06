# services/transcriptor.py

import os
import subprocess
import tempfile
import glob
import shutil
import time
import traceback
import gc
from typing import Tuple, List, Optional, Callable

from openai import OpenAI
mlx_whisper = None
MLX_WHISPER_AVAILABLE = False

from services.temp_files import get_temp_audio_dir

class AudioTranscriptor:
    def __init__(self):
        # Prefer default to 'small' for better quality on modern machines, fallback to 'base'
        self.model_size = os.getenv("WHISPER_MODEL_SIZE", "base")
        self.device_config = "cpu"

        self.device = None
        self.model = None
        self._cached_fallback_model = None
        self._torch = None
        self._whisper = None
        self._openai_client = None
        self.api_key = os.getenv("OPENAI_API_KEY")
        
        # New flag: use OpenAI for transcription too
        use_openai_base = os.getenv("USE_OPENAI_API", "False").lower() == "true"
        self.use_openai_transcription = os.getenv("USE_OPENAI_TRANSCRIPTION", str(use_openai_base)).lower() == "true"
        
        print(f"📡 Transcriptor configurado. Dispositivo: {self.device_config.upper()} | OpenAI Transcription: {self.use_openai_transcription}")

    def _ensure_torch(self):
        if self._torch is None:
            import torch

            self._torch = torch
        return self._torch

    def _ensure_whisper(self):
        if self._whisper is None:
            import whisper

            self._whisper = whisper
        return self._whisper

    def _ensure_openai_client(self):
        if self._openai_client is None and self.api_key:
            try:
                # Use global SSL fix if applied in main.py, or just standard init
                self._openai_client = OpenAI(api_key=self.api_key)
            except Exception as e:
                print(f"⚠️ Error inicializando cliente OpenAI en transcriptor: {e}")
        return self._openai_client

    def _maybe_import_mlx_whisper(self):
        global mlx_whisper, MLX_WHISPER_AVAILABLE
        if mlx_whisper is not None:
            return mlx_whisper
        try:
            import mlx_whisper as _mlx_whisper

            mlx_whisper = _mlx_whisper
            MLX_WHISPER_AVAILABLE = True
            return mlx_whisper
        except Exception:
            MLX_WHISPER_AVAILABLE = False
            return None

    def _resolve_device(self) -> str:
        torch = self._ensure_torch()
        if self.device_config == "cuda" and torch.cuda.is_available():
            return "cuda"
        if self.device_config in {"mps", "auto"}:
            try:
                if torch.backends.mps.is_available():
                    return "mps"
            except Exception:
                pass
            if torch.cuda.is_available():
                return "cuda"
        return "cpu"

    def _cargar_modelo_si_es_necesario(self):
        if self.model is not None:
            return

        torch = self._ensure_torch()
        whisper = self._ensure_whisper()
        if self.device is None:
            self.device = self._resolve_device()

        print(f"🔄 Cargando modelo Whisper '{self.model_size}' en {self.device.upper()}...")
        try:
            if self.device == "mps":
                mlx = self._maybe_import_mlx_whisper()
                if mlx is not None:
                    print(" Modo MLX detectado. Usando motor MLX para transcripción.")
                    # mlx_whisper uses its own model loading logic later
                    self.model = mlx
                else:
                    print("⚠️ MLX no disponible, usando Whisper estándar con MPS...")
                    # Loading on CPU and moving to MPS is often safer for some torch versions
                    self.model = whisper.load_model(self.model_size, device="cpu").to("mps")
            else:
                self.model = whisper.load_model(self.model_size, device=self.device)
            
            print(f"✅ Motor inicializado con éxito en {self.device.upper()}.")
        except Exception as e:
            print(f"❌ Error crítico cargando modelo en {self.device.upper()}: {e}")
            if self.device != "cpu":
                print("🔄 Reintentando carga en CPU como fallback...")
                self.device = "cpu"
                self.model = whisper.load_model(self.model_size, device="cpu")
                print("✅ Motor inicializado en CPU (fallback).")
            else:
                raise

    def _run_ffmpeg(self, command: list) -> None:
        try:
            subprocess.run(command, check=True, capture_output=True, text=True)
        except subprocess.CalledProcessError as e:
            print(f"FFmpeg error output: {e.stderr}")
            raise ValueError(f"FFmpeg falló: {e.stderr}")
        except FileNotFoundError:
            raise FileNotFoundError("No se encontró FFmpeg en PATH")

    def _get_audio_duration(self, ruta_archivo: str) -> float:
        try:
            command = [
                "ffprobe", "-v", "error", "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1", ruta_archivo
            ]
            result = subprocess.check_output(command, text=True)
            return float(result.strip())
        except Exception as e:
            print(f"⚠️ No se pudo obtener la duración con ffprobe: {e}")
            return 0.0

    def convertir_a_wav(self, ruta_origen: str) -> str:
        """Convierte audio a WAV optimizado para Whisper (16kHz, mono, s16)."""
        tmp_dir = get_temp_audio_dir()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav", dir=tmp_dir) as temp_wav:
            archivo_wav_temporal = temp_wav.name
        
        # -y (overwrite), -vn (no video), -ac 1 (mono), -ar 16000 (16kHz)
        command = [
            "ffmpeg", "-i", ruta_origen, "-vn", "-ac", "1", "-ar", "16000",
            "-sample_fmt", "s16", "-y", archivo_wav_temporal
        ]
        print(f"🔩 Convirtiendo a WAV: {os.path.basename(ruta_origen)} -> {os.path.basename(archivo_wav_temporal)}")
        self._run_ffmpeg(command)
        return archivo_wav_temporal

    def segmentar_audio(self, ruta_wav: str, chunk_seconds: int = 300) -> Tuple[str, List[str]]:
        """Segmenta un archivo WAV en trozos usando el muxer segment de ffmpeg."""
        tmp_dir = get_temp_audio_dir()
        chunks_dir = tempfile.mkdtemp(prefix="whisper_chunks_", dir=tmp_dir)
        output_pattern = os.path.join(chunks_dir, "chunk_%03d.wav")
        
        command = [
            "ffmpeg", "-i", ruta_wav, "-f", "segment", "-segment_time", str(chunk_seconds),
            "-c", "copy", "-reset_timestamps", "1", "-y", output_pattern
        ]
        print(f"📏 Segmentando audio en trozos de {chunk_seconds}s...")
        self._run_ffmpeg(command)
        
        chunk_files = sorted(glob.glob(os.path.join(chunks_dir, "chunk_*.wav")))
        return chunks_dir, chunk_files

    def transcribir_archivo(self, ruta_archivo: str, check_cancelled: Optional[Callable] = None) -> str:
        print(f"🔍 Iniciando proceso de transcripción: {ruta_archivo}")
        
        if not os.path.exists(ruta_archivo):
            raise FileNotFoundError(f"Archivo no encontrado: {ruta_archivo}")

        self.model_size = os.getenv("WHISPER_MODEL_SIZE", "base")
        self._cargar_modelo_si_es_necesario()
        torch = self._ensure_torch()
        
        # Configuración desde env
        try:
            chunk_seconds = int(os.getenv("WHISPER_CHUNK_SECONDS", "300"))
        except:
            chunk_seconds = 300
            
        use_external_chunks = os.getenv("WHISPER_EXTERNAL_CHUNKS", "true").lower() in {"true", "1", "yes"}
        use_fp16 = os.getenv("WHISPER_FP16", "false").lower() in {"true", "1", "yes"}
        if self.device == "cpu":
            use_fp16 = False 
            print("ℹ️ Dispositivo CPU detectado. Forzando FP16=False para estabilidad.")

        # --- MODO OPENAI ASISTIDO ---
        if self.use_openai_transcription and self.api_key:
            print("☁️ Usando OpenAI Whisper API para la transcripción...")
            try:
                # 1. Primero convertimos a WAV para asegurar formato y poder medir duración/tamaño
                archivo_wav = self.convertir_a_wav(ruta_archivo)
                file_size_mb = os.path.getsize(archivo_wav) / (1024 * 1024)
                
                client = self._ensure_openai_client()
                if not client:
                    raise ValueError("No se pudo inicializar el cliente de OpenAI")

                # El límite oficial es 25MB. Usamos 24MB como margen de seguridad.
                if file_size_mb < 24:
                    print(f"📦 Archivo de {file_size_mb:.2f}MB dentro del límite. Enviando directamente...")
                    with open(archivo_wav, "rb") as audio_file:
                        transcript = client.audio.transcriptions.create(
                            model="whisper-1", 
                            file=audio_file,
                            language="es"
                        )
                    texto_final = transcript.text
                else:
                    print(f"📦 Archivo de {file_size_mb:.2f}MB excede el límite de 25MB. Iniciando segmentación para API...")
                    # Segmentamos en trozos de 10 minutos (600s) para estar seguros de no pasar los 25MB por chunk
                    chunks_dir, chunk_files = self.segmentar_audio(archivo_wav, chunk_seconds=600)
                    
                    partes = []
                    for idx, chunk_path in enumerate(chunk_files, start=1):
                        if check_cancelled and check_cancelled():
                             print(f"🛑 Transcripción OpenAI cancelada en trozo {idx}.")
                             return ""
                             
                        print(f"☁️ Enviando trozo {idx}/{len(chunk_files)} a OpenAI...")
                        with open(chunk_path, "rb") as audio_file:
                            chunk_transcript = client.audio.transcriptions.create(
                                model="whisper-1",
                                file=audio_file,
                                language="es"
                            )
                        text = (chunk_transcript.text or "").strip()
                        if text:
                            partes.append(text)
                        os.remove(chunk_path)
                    
                    texto_final = " ".join(partes).strip()
                
                print(f"✨ Transcripción OpenAI exitosa. Total caracteres: {len(texto_final)}")
                return texto_final
            except Exception as e:
                print(f"⚠️ Error en OpenAI Whisper API: {e}. Cayendo a modo LOCAL...")
                # Continuamos al flujo local
        
        archivo_wav = None
        chunks_dir = None
        try:
            # 1. Convertir a WAV estándar
            archivo_wav = self.convertir_a_wav(ruta_archivo)
            duration = self._get_audio_duration(archivo_wav)
            print(f"🕒 Duración detectada: {duration:.2f}s")

            # 2. Decidir si segmentar
            if use_external_chunks and duration > chunk_seconds:
                chunks_dir, chunk_files = self.segmentar_audio(archivo_wav, chunk_seconds)
                print(f"🧩 Se generaron {len(chunk_files)} trozos para procesar.")
                
                partes = []
                for idx, chunk_path in enumerate(chunk_files, start=1):
                    if check_cancelled and check_cancelled():
                        print(f"🛑 Transcripción local cancelada en trozo {idx}.")
                        return ""

                    print(f"🎙️ Procesando trozo {idx}/{len(chunk_files)}...")
                    
                    if self.device == "mps" and MLX_WHISPER_AVAILABLE:
                        # MLX expects repo name
                        model_repo = f"mlx-community/whisper-{self.model_size}-mlx"
                        res = self.model.transcribe(chunk_path, path_or_hf_repo=model_repo)
                    else:
                        res = self.model.transcribe(chunk_path, language="es", fp16=use_fp16)
                    
                    text = (res.get("text") or "").strip()
                    if text:
                        partes.append(text)
                        print(f"   ✅ Texto extraído ({len(text)} caracteres)")
                    else:
                        print("   ⚠️ Trozo sin texto detectado.")
                    
                    # Limpieza inmediata del archivo procesado
                    try:
                        os.remove(chunk_path)
                    except:
                        pass

                    gc.collect()
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                    elif hasattr(torch, 'mps') and hasattr(torch.mps, 'empty_cache'):
                        torch.mps.empty_cache()
                    
                    print(f"   🧹 Memoria y archivos liberados tras trozo {idx}.")
                
                texto_final = " ".join(partes).strip()
            else:
                # Transcripción directa
                print("🚀 Procesando archivo completo directamente...")
                if self.device == "mps" and MLX_WHISPER_AVAILABLE:
                    model_repo = f"mlx-community/whisper-{self.model_size}-mlx"
                    res = self.model.transcribe(archivo_wav, path_or_hf_repo=model_repo)
                else:
                    res = self.model.transcribe(archivo_wav, language="es", fp16=use_fp16)
                texto_final = (res.get("text") or "").strip()

            if not texto_final:
                print("❌ La transcripción no produjo ningún texto.")
                # Fallback: intentar sin especificar idioma por si acaso
                print("🔄 Reintentando sin forzar idioma (auto-detección)...")
                res = self.model.transcribe(archivo_wav, fp16=use_fp16)
                texto_final = (res.get("text") or "").strip()

            if not texto_final:
                raise ValueError("Whisper no pudo extraer texto del audio. El archivo podría estar dañado o ser solo ruido.")

            print(f"✨ Transcripción exitosa. Total caracteres: {len(texto_final)}")
            return texto_final

        except Exception as e:
            traceback.print_exc()
            raise ValueError(f"Error en el flujo de transcripción: {str(e)}")
        finally:
            # Limpieza
            if archivo_wav and os.path.exists(archivo_wav):
                try: os.remove(archivo_wav)
                except: pass
            if chunks_dir and os.path.isdir(chunks_dir):
                shutil.rmtree(chunks_dir, ignore_errors=True)
