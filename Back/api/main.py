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
        db.rollback()
        print(f"⚠️ No se pudo migrar cifrado a texto plano: {e}")
    finally:
        db.close()

@app.on_event("startup")
async def _startup_tasks():
    ttl_minutes = int(os.getenv("AUDIO_TEMP_TTL_MINUTES", "60"))
    interval_seconds = int(os.getenv("AUDIO_CLEANUP_INTERVAL_SECONDS", "300"))
    ttl_seconds = max(60, ttl_minutes * 60)
    get_temp_audio_dir()
    _migrate_meetings_encryption_to_plaintext()

    async def _loop():
        while True:
            cleanup_temp_audio_dir(ttl_seconds=ttl_seconds)
            await asyncio.sleep(max(30, interval_seconds))

    asyncio.create_task(_loop())

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

class SearchRequest(BaseModel):
    consulta: Optional[str] = ""
    filtros: Optional[Dict] = None

# --- NUEVO ESQUEMA PARA LA RESPUESTA DE UNA SOLA REUNIÓN ---
class MeetingResponse(BaseModel):
    id: int
    titulo: Optional[str] = "Sin título"
    resumen_md: Optional[str] = ""
    mapa_mermaid: Optional[str] = ""
    fecha_creacion: datetime
    user_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class ShareRequest(BaseModel):
    email: str

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

class TransformRequest(BaseModel):
    meeting_id: int
    tipo_transformacion: str = Field(..., description="Tipo de transformación: breve, detallado, cuestionario, guion")

@app.post("/api/meetings/transform", tags=["Meetings"])
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

# --- ENDPOINTdef process_audio_background(reunion_id: int, temp_file_path: str, titulo: str, participantes: str, tipo_audio: str):
    """
    Tarea en segundo plano para procesar audio pesado sin bloquear la respuesta HTTP.
    """
    from core.database import SessionLocal
    from core.security import encrypt_str
    
    print(f"🎙️ [Background] Iniciando procesamiento para reunión ID: {reunion_id}")
    db = SessionLocal()
    try:
        if not os.path.exists(temp_file_path):
             raise Exception("El archivo temporal no existe en el worker.")

        # 1. Transcripción
        texto_transcrito = transcriptor.transcribir_archivo(temp_file_path)
        print(f"✅ [Background] Transcripción completada: {len(texto_transcrito)} caracteres.")
        
        if not texto_transcrito or not texto_transcrito.strip():
             raise Exception("La transcripción no produjo ningún texto.")

        # 2. Generar Resumen y Mapa Mental
        lista_participantes = [p.strip() for p in participantes.split(',') if p.strip()]
        resumen_md, metadatos = generador_resumen.generar_resumen_completo(texto_transcrito, titulo, lista_participantes, tipo_audio)
        mapa_mermaid = generador_mapa.generar_mapa_mental(texto_transcrito)
        
        # 3. Guardar / Cifrar
        t_transcripcion = encrypt_str(texto_transcrito)
        t_resumen = encrypt_str(resumen_md)
        t_mapa = encrypt_str(mapa_mermaid)
        
        reunion = db.query(Reunion).filter(Reunion.id == reunion_id).first()
        if reunion:
            reunion.transcripcion = t_transcripcion
            reunion.resumen_md = t_resumen
            reunion.mapa_mermaid = t_mapa
            reunion.metadatos = metadatos
            db.commit()
            print(f"✅ [Background] Reunión {reunion_id} guardada con éxito.")
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"❌ [Background] Error en procesar reunión {reunion_id}: {str(e)}")
        reunion = db.query(Reunion).filter(Reunion.id == reunion_id).first()
        if reunion:
            reunion.transcripcion = encrypt_str(f"[FALLIDO: {str(e)}]")
            db.commit()
    finally:
        db.close()
        # Limpieza de archivo temporal
        if temp_file_path and os.path.exists(temp_file_path):
             try:
                 os.unlink(temp_file_path)
                 print(f"🧹 [Background] Limpieza exitosa: {temp_file_path}")
             except Exception as e:
                 print(f"⚠️ [Background] Error al limpiar temp: {e}")


@app.post("/api/meetings", tags=["Meetings"])
async def process_meeting_and_save(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    titulo: str = Form(""),
    participantes: str = Form(""),
    tipo_audio: str = Form(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(auth.get_current_user)
):
    temp_file_path = ""
    from core.security import encrypt_str
    try:
        print(f"DEBUG: Receiving file {file.filename}, content_type={file.content_type}")

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
            transcripcion=encrypt_str("[Procesando...]"),
            resumen_md=encrypt_str("[Generando análisis...]"),
            mapa_mermaid=encrypt_str("graph TD\n    A[Procesando]"),
            nombre_archivo_original=file.filename,
            user_id=current_user.id
        )
        db.add(nueva_reunion)
        db.commit()
        db.refresh(nueva_reunion)

        # 2. Encolar procesamiento en segundo plano
        background_tasks.add_task(process_audio_background, nueva_reunion.id, temp_file_path, titulo, participantes, tipo_audio)

        print(f"🚀 [FastAPI] Encolado en background para ID {nueva_reunion.id}")
        return {"success": True, "id": nueva_reunion.id}

    except Exception as e:
        if temp_file_path and os.path.exists(temp_file_path):
            try: os.unlink(temp_file_path)
            except: pass
        raise HTTPException(status_code=500, detail=str(e))


# --- ESTE ES EL ENDPOINT QUE FALTABA ---
@app.get("/api/meetings/{meeting_id}", response_model=MeetingResponse, tags=["Meetings"])
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


@app.post("/api/meetings/{meeting_id}/share", tags=["Meetings"])
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


@app.get("/api/meetings", response_model=List[MeetingResponse], tags=["Meetings"])
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


@app.get("/api/meetings/{meeting_id}/export", tags=["Meetings"])
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
@app.post("/api/search", tags=["Search"])
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
