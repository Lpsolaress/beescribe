import sys
import os
import asyncio
import tempfile
import shutil
import ssl
from concurrent.futures import ThreadPoolExecutor
from typing import Optional, Dict, List # Importa 'List'
from datetime import datetime # Importa 'datetime'
import io
import pyzipper
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Depends, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy import text
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

# Fix for "ssl.SSLError: unknown error (_ssl.c:4293)" common on some Mac Python builds
try:
    if sys.platform == "darwin":
        ssl._create_default_https_context = ssl._create_unverified_context
        print("🔧 Aplicado parche de SSL para macOS.")
except Exception as e:
    print(f"⚠️ No se pudo aplicar parche SSL: {e}")
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from pydantic import BaseModel, Field, ConfigDict

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import get_db, engine, SessionLocal
from core.crypto import ENC_PREFIX, decrypt_str, encrypt_str, encryption_enabled
from models import Usuario, Reunion, ReunionCompartida
from services.transcriptor import AudioTranscriptor
from services.resumen import GeneradorResumenAvanzado 
from services.mapa_mental import GeneradorMapaMental
from services.buscador import BuscadorReunionesDB
from services.chat import ChatService
from services import auth
from services.temp_files import cleanup_temp_audio_dir, get_temp_audio_dir

load_dotenv()
from core.database import Base
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Meeting Analysis API", version="2.0.0")

from fastapi.staticfiles import StaticFiles
os.makedirs("uploads/avatars", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

cors_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
cors_origins_env = os.getenv("CORS_ORIGINS", "").strip()
if cors_origins_env:
    cors_origins.extend([o.strip() for o in cors_origins_env.split(",") if o.strip()])
cors_origins = list(dict.fromkeys(cors_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _migrate_meetings_encryption_to_plaintext() -> None:
    db = SessionLocal()
    try:
        rows = db.execute(
            text(
                """
                SELECT id, transcripcion, resumen_md, mapa_mermaid
                FROM reuniones
                WHERE transcripcion LIKE :p OR resumen_md LIKE :p OR mapa_mermaid LIKE :p
                """
            ),
            {"p": f"{ENC_PREFIX}%"},
        ).fetchall()

        if not rows:
            return

        for row in rows:
            transcripcion = decrypt_str(row.transcripcion)
            resumen_md = decrypt_str(row.resumen_md)
            mapa_mermaid = decrypt_str(row.mapa_mermaid)

            db.execute(
                text(
                    """
                    UPDATE reuniones
                    SET transcripcion = :transcripcion,
                        resumen_md = :resumen_md,
                        mapa_mermaid = :mapa_mermaid
                    WHERE id = :id
                    """
                ),
                {
                    "id": row.id,
                    "transcripcion": transcripcion,
                    "resumen_md": resumen_md,
                    "mapa_mermaid": mapa_mermaid,
                },
            )

        db.commit()
        print(f"✅ Migración completada: {len(rows)} reuniones pasadas a texto plano.")
    except Exception as e:
        db.rollback()
        print(f"⚠️ No se pudo migrar cifrado a texto plano: {e}")
    finally:
        db.close()

def _reset_stuck_meetings() -> None:
    """
    Busca reuniones que quedaron en estado 'PROCESSING' y las vuelve a 'PENDING'.
    Esto es útil si el servidor se reinició abruptamente mientras procesaba.
    """
    db = SessionLocal()
    try:
        stuck = db.query(Reunion).filter(Reunion.status == "PROCESSING").all()
        if not stuck:
            return
        
        for r in stuck:
            print(f"⚠️ [Startup] Reseteando reunión ID {r.id} de PROCESSING a PENDING (interrumpida).")
            r.status = "PENDING"
            r.progress = 0
        
        db.commit()
        print(f"✅ Se resetearon {len(stuck)} reuniones interrumpidas.")
    except Exception as e:
        db.rollback()
        print(f"⚠️ Error al resetear reuniones stuck: {e}")
    finally:
        db.close()

@app.on_event("startup")
async def _startup_tasks():
    ttl_minutes = int(os.getenv("AUDIO_TEMP_TTL_MINUTES", "60"))
    interval_seconds = int(os.getenv("AUDIO_CLEANUP_INTERVAL_SECONDS", "300"))
    ttl_seconds = max(60, ttl_minutes * 60)
    get_temp_audio_dir()
    _migrate_meetings_encryption_to_plaintext()
    _reset_stuck_meetings()

    async def _cleanup_loop():
        while True:
            cleanup_temp_audio_dir(ttl_seconds=ttl_seconds)
            await asyncio.sleep(max(30, interval_seconds))

    async def _queue_worker():
        """
        Worker que procesa la cola de reuniones de forma secuencial y por horario.
        """
        print("🐝 Worker de cola de reuniones iniciado.")
        while True:
            db = SessionLocal()
            try:
                # 1. Buscar reuniones pendientes o programadas que ya deben ejecutarse
                now = datetime.utcnow()
                
                # Obtener todos los usuarios que tienen algo pendiente
                # (Procesamos secuencialmente por usuario)
                pendientes = db.query(Reunion).filter(
                    (Reunion.status == "PENDING") | 
                    ((Reunion.status == "SCHEDULED") & (Reunion.scheduled_at <= now))
                ).order_by(Reunion.fecha_creacion.asc()).all()

                for r in pendientes:
                    # Verificar si el usuario ya tiene algo en PROCESSING
                    busy = db.query(Reunion).filter(
                        Reunion.user_id == r.user_id,
                        Reunion.status == "PROCESSING"
                    ).first()

                    if not busy:
                        print(f"🚀 [Worker] Iniciando procesamiento para ID {r.id} (User {r.user_id})")
                        # Lanzamos en un hilo aparte para no bloquear el worker
                        loop = asyncio.get_event_loop()
                        loop.run_in_executor(None, process_audio_background, r.id)
            except Exception as e:
                print(f"❌ [Worker] Error: {e}")
            finally:
                db.close()
            
            await asyncio.sleep(10) # Revisar cada 10 segundos

    asyncio.create_task(_cleanup_loop())
    asyncio.create_task(_queue_worker())

# --- ESQUEMAS PYDANTIC ---

class UserCreate(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: int
    email: str
    alias: Optional[str] = None
    foto_perfil: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class GoogleAuthRequest(BaseModel):
    credential: str

class SearchRequest(BaseModel):
    consulta: Optional[str] = ""
    filtros: Optional[Dict] = None

# --- NUEVO ESQUEMA PARA LA RESPUESTA DE UNA SOLA REUNIÓN ---
class MeetingResponse(BaseModel):
    id: int
    titulo: Optional[str] = "Sin título"
    transcripcion: Optional[str] = ""
    resumen_md: Optional[str] = ""
    mapa_mermaid: Optional[str] = ""
    fecha_creacion: datetime
    user_id: Optional[int] = None
    status: str = "PENDING"
    scheduled_at: Optional[datetime] = None
    progress: int = 0

    model_config = ConfigDict(from_attributes=True)

class ShareRequest(BaseModel):
    email: str

class ChatRequest(BaseModel):
    query: str
    meeting_id: Optional[int] = None
    meeting_ids: Optional[List[int]] = None  # Para análisis multi-reunión (máx 5)

# --- SERVICIOS ---

base_flag = os.getenv("USE_OPENAI_API", "False")
use_openai_summary = os.getenv("USE_OPENAI_SUMMARY", base_flag).lower() == "true"
use_openai_mindmap = os.getenv("USE_OPENAI_MINDMAP", base_flag).lower() == "true"

api_key = os.getenv("OPENAI_API_KEY") if (use_openai_summary or use_openai_mindmap) else None
if (use_openai_summary or use_openai_mindmap) and not api_key:
    raise ValueError("OPENAI_API_KEY no encontrada (requerida cuando USE_OPENAI_SUMMARY o USE_OPENAI_MINDMAP es True)")

transcriptor = AudioTranscriptor()
generador_resumen = GeneradorResumenAvanzado(api_key)
generador_mapa = GeneradorMapaMental(api_key)
buscador = BuscadorReunionesDB()
chat_service = ChatService(api_key)

class TransformRequest(BaseModel):
    meeting_id: int
    tipo_transformacion: str = Field(..., description="Tipo de transformación: breve, detallado, cuestionario, guion")

@app.post("/meetings/transform", tags=["Meetings"])
async def transform_meeting(
    request: TransformRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(auth.get_current_user)
):
    """
    Re-procesa la transcripción de una reunión existente para generar un nuevo tipo de salida (cuestionario, guion, etc).
    """
    # 1. Buscar la reunión y verificar propiedad
    meeting = db.query(Reunion).filter(
        Reunion.id == request.meeting_id,
        Reunion.user_id == current_user.id
    ).first()

    if not meeting:
        raise HTTPException(status_code=404, detail="Reunión no encontrada")

    # 2. Generar el nuevo contenido usando la transcripción existente
    # ¡IMPORTANTE! Asegurarse de DECRIPTAR la transcripción antes de mandarla a la IA
    print(f"DEBUG: Transforming meeting {request.meeting_id} to {request.tipo_transformacion}")
    transcripcion_clara = decrypt_str(meeting.transcripcion)
    print(f"DEBUG: Decrypted transcription length: {len(transcripcion_clara) if transcripcion_clara else 0}")
    if not transcripcion_clara or not transcripcion_clara.strip():
        print("DEBUG: ALERT - Transcription is empty after decryption!")

    
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as executor:
        # Reutilizamos el generador de resúmenes pero con el nuevo tipo
        future_resumen = loop.run_in_executor(
            executor, 
            generador_resumen.generar_resumen_completo, 
            transcripcion_clara, 
            meeting.titulo, 
            [], # Participantes no son críticos para transformaciones
            request.tipo_transformacion
        )
        nuevo_contenido_md, nuevos_metadatos = await future_resumen

    # 3. Devolver el resultado (SIN guardar en DB para no sobrescribir el original, o podríamos guardar en un historial de versiones)
    # Por ahora devolvemos el resultado efímero para que el frontend lo muestre
    return {
        "success": True,
        "tipo": request.tipo_transformacion,
        "contenido_md": nuevo_contenido_md,
        "metadatos": nuevos_metadatos
    }

# --- ENDPOINTS DE AUTENTICACIÓN ---

@app.post("/register", response_model=UserResponse, tags=["Auth"])
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = auth.get_user(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    hashed_password = auth.get_password_hash(user.password)
    new_user = Usuario(email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/token", response_model=Token, tags=["Auth"])
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = auth.get_user(db, email=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/google", response_model=Token, tags=["Auth"])
async def google_auth(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Recibe el 'credential' (ID Token) de Google, lo verifica y emite un JWT local.
    """
    try:
        # ID token is valid. Get user's Google ID and email.
        idinfo = id_token.verify_oauth2_token(
            request.credential, 
            google_requests.Request(), 
            os.getenv("GOOGLE_CLIENT_ID")
        )
        email = idinfo['email']
        
        # 1. Buscar o crear el usuario
        user = auth.get_user(db, email=email)
        if not user:
            # Crear nuevo usuario si no existe
            user = Usuario(email=email, hashed_password="GOOGLE_AUTH_USER") # Sin password para usuarios de Google
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # 2. Generar el JWT local para Bee-Scribe
        access_token = auth.create_access_token(data={"sub": user.email})
        return {"access_token": access_token, "token_type": "bearer"}

    except ValueError:
        # Invalid token
        raise HTTPException(status_code=401, detail="Token de Google inválido")

@app.get("/users/me", response_model=UserResponse, tags=["Auth"])
async def read_users_me(current_user: Usuario = Depends(auth.get_current_user)):
    return current_user

@app.put("/users/me", tags=["Auth"])
async def update_user_profile(
    alias: Optional[str] = Form(None),
    foto: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(auth.get_current_user)
):
    if alias is not None:
        current_user.alias = alias
    
    if foto is not None:
        ext = os.path.splitext(foto.filename or '.jpg')[1]
        import uuid
        filename = f"{uuid.uuid4()}{ext}"
        filepath = f"uploads/avatars/{filename}"
        with open(filepath, "wb") as f:
            f.write(await foto.read())
        current_user.foto_perfil = f"/uploads/avatars/{filename}"

    db.commit()
    db.refresh(current_user)
    return {"message": "Perfil actualizado", "alias": current_user.alias, "foto_perfil": current_user.foto_perfil}

# --- ENDPOINTS ---

def process_audio_background(reunion_id: int):
    """
    Tarea en segundo plano para procesar audio pesado sin bloquear la respuesta HTTP.
    Ahora obtiene los datos de la DB y actualiza el estado.
    """
    from core.database import SessionLocal
    from core.crypto import encrypt_str
    
    db = SessionLocal()
    try:
        reunion = db.query(Reunion).filter(Reunion.id == reunion_id).first()
        if not reunion:
            print(f"❌ [Background] Reunión {reunion_id} no encontrada.")
            return

        print(f"🎙️ [Background] Iniciando procesamiento para reunión ID: {reunion_id}")
        reunion.status = "PROCESSING"
        db.commit()

        # Obtener parámetros de metadatos
        meta = reunion.metadatos or {}
        temp_file_path = meta.get("temp_file_path")
        titulo = reunion.titulo
        participantes = meta.get("participantes", "")
        tipo_audio = meta.get("tipo_audio", "audio_normal")

        if not temp_file_path or not os.path.exists(temp_file_path):
             raise Exception(f"El archivo temporal no existe: {temp_file_path}")

        # 1. Transcripción
        reunion.progress = 10
        db.commit()
        
        def check_if_cancelled():
            # Creamos una sesión breve para verificar el estado actual en DB
            inner_db = SessionLocal()
            try:
                r = inner_db.query(Reunion).filter(Reunion.id == reunion_id).first()
                return r.status == "CANCELLED" if r else False
            finally:
                inner_db.close()

        texto_transcrito = transcriptor.transcribir_archivo(temp_file_path, check_cancelled=check_if_cancelled)
        
        # Verificar si se canceló durante la transcripción
        if not texto_transcrito and check_if_cancelled():
            print(f"🛑 [Background] Reunión {reunion_id} cancelada durante el proceso de transcripción.")
            return

        print(f"✅ [Background] Transcripción completada: {len(texto_transcrito)} caracteres.")
        
        # Verificar cancelación después de transcripción
        db.refresh(reunion)
        if reunion.status == "CANCELLED":
            print(f"🛑 [Background] Reunión {reunion_id} cancelada tras transcripción.")
            return

        if not texto_transcrito or not texto_transcrito.strip():
             raise Exception("La transcripción no produjo ningún texto.")

        reunion.progress = 60
        db.commit()

        # 2. Generar Resumen y Mapa Mental
        lista_participantes = [p.strip() for p in participantes.split(',') if p.strip()]
        resumen_md, metadatos_ia = generador_resumen.generar_resumen_completo(texto_transcrito, titulo, lista_participantes, tipo_audio)
        
        # Verificar cancelación antes del mapa mental
        db.refresh(reunion)
        if reunion.status == "CANCELLED":
            print(f"🛑 [Background] Reunión {reunion_id} cancelada antes del mapa mental.")
            return

        reunion.progress = 85
        db.commit()
        
        mapa_mermaid = generador_mapa.generar_mapa_mental(texto_transcrito)
        
        # Verificar cancelación final
        db.refresh(reunion)
        if reunion.status == "CANCELLED":
            print(f"🛑 [Background] Reunión {reunion_id} cancelada al final.")
            return

        # 3. Guardar / Cifrar
        reunion.transcripcion = encrypt_str(texto_transcrito)
        reunion.resumen_md = encrypt_str(resumen_md)
        reunion.mapa_mermaid = encrypt_str(mapa_mermaid)
        reunion.metadatos = {**meta, "ia_metadatos": metadatos_ia}
        reunion.status = "COMPLETED"
        reunion.progress = 100
        db.commit()
        print(f"✅ [Background] Reunión {reunion_id} guardada con éxito.")
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"❌ [Background] Error en procesar reunión {reunion_id}: {str(e)}")
        reunion = db.query(Reunion).filter(Reunion.id == reunion_id).first()
        if reunion:
            reunion.transcripcion = encrypt_str(f"[FALLIDO: {str(e)}]")
            reunion.status = "FAILED"
            db.commit()
    finally:
        # Limpieza de archivo temporal (ya lo hacía antes, mantenemos la lógica)
        meta = reunion.metadatos if reunion else {}
        temp_file_path = meta.get("temp_file_path") if meta else None
        if temp_file_path and os.path.exists(temp_file_path):
             try:
                 os.unlink(temp_file_path)
                 print(f"🧹 [Background] Limpieza exitosa: {temp_file_path}")
             except Exception as e:
                 print(f"⚠️ [Background] Error al limpiar temp: {e}")
        db.close()


@app.post("/meetings", tags=["Meetings"])
async def process_meeting_and_save(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    titulo: str = Form(""),
    participantes: str = Form(""),
    tipo_audio: str = Form(...),
    scheduled_at: Optional[str] = Form(None), # Recibimos como string ISO
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(auth.get_current_user)
):
    temp_file_path = ""
    from core.crypto import encrypt_str
    from datetime import datetime
    try:
        print(f"DEBUG: Receiving file {file.filename}, content_type={file.content_type}, scheduled_at={scheduled_at}")

        # Parsear fecha de programación si existe
        scheduled_dt = None
        if scheduled_at:
            try:
                scheduled_dt = datetime.fromisoformat(scheduled_at.replace('Z', '+00:00'))
            except Exception as e:
                print(f"⚠️ Error parseando scheduled_at: {e}")

        tmp_dir = get_temp_audio_dir()
        extension = os.path.splitext(file.filename or '.tmp')[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=extension, dir=tmp_dir) as temp_file:
            try:
                file.file.seek(0)
            except Exception: pass
            shutil.copyfileobj(file.file, temp_file)
            temp_file_path = temp_file.name
        
        if not temp_file_path or not os.path.exists(temp_file_path) or os.path.getsize(temp_file_path) == 0:
             raise HTTPException(status_code=400, detail="El archivo subido está vacío o no se guardó correctamente.")

        # 1. Crear fila en Base de Datos INMEDIATAMENTE
        nueva_reunion = Reunion(
            titulo=titulo if titulo else file.filename,
            transcripcion=encrypt_str("[En cola...]" if scheduled_dt else "[Procesando...]"),
            resumen_md=encrypt_str("[Esperando procesamiento...]"),
            mapa_mermaid=encrypt_str("graph TD\n    A[En cola...]"),
            nombre_archivo_original=file.filename,
            user_id=current_user.id,
            status="SCHEDULED" if scheduled_dt else "PENDING",
            scheduled_at=scheduled_dt
        )
        db.add(nueva_reunion)
        db.commit()
        db.refresh(nueva_reunion)

        # 2. Encolar procesamiento (el worker se encargará si es programada o secuencial)
        # background_tasks.add_task(process_audio_background, nueva_reunion.id, temp_file_path, titulo, participantes, tipo_audio)
        # YA NO USAMOS BackgroundTasks directamente aquí, el worker lo hará.
        # Pero necesitamos guardar la ruta del archivo temporal para el worker.
        # Podríamos guardar el tipo_audio y participantes en los metadatos o una tabla de tareas.
        
        # Para simplificar, guardamos los parámetros necesarios en metadatos para el worker
        nueva_reunion.metadatos = {
            "temp_file_path": temp_file_path,
            "tipo_audio": tipo_audio,
            "participantes": participantes
        }
        db.commit()

        print(f"🚀 [FastAPI] Reunión {nueva_reunion.id} guardada con estado {nueva_reunion.status}")
        return {"success": True, "id": nueva_reunion.id, "status": nueva_reunion.status}

    except Exception as e:
        if temp_file_path and os.path.exists(temp_file_path):
            try: os.unlink(temp_file_path)
            except: pass
        raise HTTPException(status_code=500, detail=str(e))


# --- ENDPOINT: LISTA LIGERA DE REUNIONES PARA SELECTOR ---
@app.get("/meetings/summary-list", tags=["Meetings"])
async def get_meetings_summary_list(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(auth.get_current_user)
):
    """Devuelve una lista ligera de reuniones (id, título, fecha, duración estimada) para el selector del chat."""
    reuniones = db.query(Reunion).filter(
        Reunion.user_id == current_user.id,
        Reunion.status == "COMPLETED"
    ).order_by(Reunion.fecha_creacion.desc()).all()
    
    results = []
    for r in reuniones:
        # Estimar duración: ~150 palabras/min hablando, ~5 chars/palabra = ~750 chars/min
        trans_len = len(r.transcripcion or "") if r.transcripcion else 0
        estimated_minutes = max(5, round(trans_len / 750))  # Mínimo 5 min
        
        results.append({
            "id": r.id,
            "titulo": r.titulo,
            "fecha": r.fecha_creacion.isoformat() if r.fecha_creacion else None,
            "duracion_min": estimated_minutes
        })
    
    return results


# --- ESTE ES EL ENDPOINT QUE FALTABA ---
@app.get("/meetings/{meeting_id}", response_model=MeetingResponse, tags=["Meetings"])
async def get_meeting_by_id(
    meeting_id: int, 
    db: Session = Depends(get_db), 
    current_user: Usuario = Depends(auth.get_current_user)
):
    """
    Obtiene una reunión específica por su ID, verificando que pertenezca al usuario autenticado.
    """
    db_meeting = db.query(Reunion).filter(
        Reunion.id == meeting_id,
        Reunion.user_id == current_user.id
    ).first()

    if db_meeting is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found or you don't have permission to view it")
    
    # Desencriptar campos para el frontend
    db_meeting.transcripcion = decrypt_str(db_meeting.transcripcion)
    db_meeting.resumen_md = decrypt_str(db_meeting.resumen_md)
    db_meeting.mapa_mermaid = decrypt_str(db_meeting.mapa_mermaid)
    
    return db_meeting
# ----------------------------------------


@app.post("/meetings/{meeting_id}/share", tags=["Meetings"])
async def share_meeting(
    meeting_id: int, 
    request: ShareRequest, 
    db: Session = Depends(get_db), 
    current_user: Usuario = Depends(auth.get_current_user)
):
    """
    Comparte una reunión con otra persona mediante su correo.
    """
    # 1. Verificar propiedad
    meeting = db.query(Reunion).filter(Reunion.id == meeting_id, Reunion.user_id == current_user.id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Reunión no encontrada o no tienes permisos")
    
    # 2. Registrar que fue compartida
    existing_share = db.query(ReunionCompartida).filter(
        ReunionCompartida.reunion_id == meeting_id,
        ReunionCompartida.email_destinatario == request.email
    ).first()
    
    if existing_share:
        return {"message": f"Ya has compartido esta reunión con {request.email}"}
        
    share = ReunionCompartida(reunion_id=meeting_id, email_destinatario=request.email)
    db.add(share)
    db.commit()
    return {"message": f"Reunión compartida con éxito con {request.email}"}


@app.delete("/meetings/{meeting_id}", tags=["Meetings"])
async def delete_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(auth.get_current_user)
):
    """
    Elimina o cancela una reunión. 
    Si está en PENDING o SCHEDULED, se borra. 
    Si está en PROCESSING, se marca como CANCELLED para que el worker se detenga.
    """
    meeting = db.query(Reunion).filter(
        Reunion.id == meeting_id,
        Reunion.user_id == current_user.id
    ).first()

    if not meeting:
        raise HTTPException(status_code=404, detail="Reunión no encontrada")

    if meeting.status == "PROCESSING":
        # No podemos matar el thread fácilmente, así que marcamos como cancelado
        meeting.status = "CANCELLED"
        db.commit()
        return {"message": "Reunión marcada para cancelación"}
    else:
        # PENDING, SCHEDULED, COMPLETED, FAILED, CANCELLED
        db.delete(meeting)
        db.commit()
        return {"message": "Reunión eliminada correctamente"}

@app.get("/meetings", response_model=List[MeetingResponse], tags=["Meetings"])
async def get_user_meetings(db: Session = Depends(get_db), current_user: Usuario = Depends(auth.get_current_user)):
    """
    Obtiene todas las reuniones para el usuario autenticado (propias y compartidas).
    """
    print(f"📡 Solicitando reuniones para usuario ID: {current_user.id} ({current_user.email})")
    
    # 1. Reuniones propias
    propias = db.query(Reunion).filter(Reunion.user_id == current_user.id).all()
    
    # 2. Reuniones compartidas conmigo
    compartidas = db.query(Reunion).join(ReunionCompartida).filter(
        ReunionCompartida.email_destinatario == current_user.email
    ).all()
    
    # Combinar
    reuniones = propias + compartidas
    reuniones.sort(key=lambda x: x.fecha_creacion, reverse=True)
    
    print(f"📊 Se encontraron {len(reuniones)} reuniones totales ({len(propias)} propias, {len(compartidas)} compartidas).")
    
    # Desencriptar campos para el listado (si se incluyen en la respuesta)
    for r in reuniones:
        r.transcripcion = decrypt_str(r.transcripcion)
        r.resumen_md = decrypt_str(r.resumen_md)
        r.mapa_mermaid = decrypt_str(r.mapa_mermaid)
        
    return reuniones


@app.get("/meetings/{meeting_id}/export", tags=["Meetings"])
async def export_meeting_document(
    meeting_id: int,
    documento: str = "resumen",
    password: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(auth.get_current_user),
):
    meeting = db.query(Reunion).filter(
        Reunion.id == meeting_id,
        Reunion.user_id == current_user.id,
    ).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Reunión no encontrada")

    documento = (documento or "resumen").lower()
    if documento == "resumen":
        contenido = decrypt_str(meeting.resumen_md) or ""
        filename = f"meeting_{meeting_id}_resumen.md"
        media_type = "text/markdown; charset=utf-8"
    elif documento == "mapa":
        contenido = decrypt_str(meeting.mapa_mermaid) or ""
        filename = f"meeting_{meeting_id}_mapa.mmd"
        media_type = "text/plain; charset=utf-8"
    elif documento == "transcripcion":
        contenido = decrypt_str(meeting.transcripcion) or ""
        filename = f"meeting_{meeting_id}_transcripcion.txt"
        media_type = "text/plain; charset=utf-8"
    else:
        raise HTTPException(status_code=400, detail="Documento inválido (use resumen|mapa|transcripcion)")

    if password:
        zip_buffer = io.BytesIO()
        with pyzipper.AESZipFile(zip_buffer, 'w', compression=pyzipper.ZIP_DEFLATED, encryption=pyzipper.WZ_AES) as zipf:
            zipf.setpassword(password.encode('utf-8'))
            zipf.writestr(filename, contenido)
        
        zip_filename = filename.rsplit('.', 1)[0] + '.zip'
        headers = {"Content-Disposition": f'attachment; filename="{zip_filename}"'}
        return Response(content=zip_buffer.getvalue(), media_type="application/zip", headers=headers)
    else:
        headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
        return Response(content=contenido, media_type=media_type, headers=headers)


# --- ENDPOINT DE BÚSQUEDA ---
@app.post("/search", tags=["Search"])
async def search_meetings(
    request: SearchRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(auth.get_current_user)
):
    try:
        resultados = buscador.buscar(
            db=db,
            user_id=current_user.id,
            consulta=request.consulta,
            filtros=request.filtros
        )
        return {"success": True, "resultados": resultados}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en la búsqueda: {str(e)}")


# --- ENDPOINT DE CHAT IA ---
@app.post("/chat", tags=["Chat"])
async def chat_ai(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(auth.get_current_user)
):
    try:
        # Consolidar meeting_ids: priorizar meeting_ids, luego meeting_id individual
        ids = request.meeting_ids or ([request.meeting_id] if request.meeting_id else None)
        respuesta = chat_service.chat_with_context(
            db=db,
            user_id=current_user.id,
            query=request.query,
            meeting_ids=ids
        )
        return {"success": True, "respuesta": respuesta}
    except Exception as e:
        print(f"❌ Error en endpoint de chat: {e}")
        raise HTTPException(status_code=500, detail=f"Error en el chat de IA: {str(e)}")

