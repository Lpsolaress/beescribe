import sys
import os
import asyncio
import tempfile
from concurrent.futures import ThreadPoolExecutor
from typing import Optional, Dict, List # Importa 'List'
from datetime import datetime # Importa 'datetime'

from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from pydantic import BaseModel, Field

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import get_db, engine
import models.reunion as reunion_model
import models.usuario as usuario_model
from services.transcriptor import AudioTranscriptor
from services.resumen import GeneradorResumenAvanzado 
from services.mapa_mental import GeneradorMapaMental
from services.buscador import BuscadorReunionesDB
from services import auth

load_dotenv()
usuario_model.Base.metadata.create_all(bind=engine)
reunion_model.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Meeting Analysis API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    class Config:
        orm_mode = True

class SearchRequest(BaseModel):
    consulta: Optional[str] = ""
    filtros: Optional[Dict] = None

# --- NUEVO ESQUEMA PARA LA RESPUESTA DE UNA SOLA REUNIÓN ---
class MeetingResponse(BaseModel):
    id: int
    titulo: str
    resumen_md: str
    mapa_mermaid: str
    fecha_creacion: datetime

    class Config:
        orm_mode = True

# --- SERVICIOS ---

api_key = os.getenv("OPENAI_API_KEY")
if not api_key: raise ValueError("OPENAI_API_KEY no encontrada")

transcriptor = AudioTranscriptor()
generador_resumen = GeneradorResumenAvanzado(api_key)
generador_mapa = GeneradorMapaMental(api_key)
buscador = BuscadorReunionesDB()

# --- ENDPOINTS DE AUTENTICACIÓN ---

@app.post("/register", response_model=UserResponse, tags=["Auth"])
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = auth.get_user(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    hashed_password = auth.get_password_hash(user.password)
    new_user = usuario_model.Usuario(email=user.email, hashed_password=hashed_password)
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
async def read_users_me(current_user: usuario_model.Usuario = Depends(auth.get_current_user)):
    return current_user

# --- ENDPOINTS DE REUNIONES (MEETINGS) ---

@app.post("/api/meetings", tags=["Meetings"])
async def process_meeting_and_save(
    file: UploadFile = File(...),
    titulo: str = Form(""),
    participantes: str = Form(""),
    tipo_audio: str = Form(...),
    db: Session = Depends(get_db),
    current_user: usuario_model.Usuario = Depends(auth.get_current_user)
):
    temp_file_path = ""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename or '.tmp')[1]) as temp_file:
            temp_file.write(await file.read())
            temp_file_path = temp_file.name

        texto_transcrito = transcriptor.transcribir_archivo(temp_file_path)
        if not texto_transcrito.strip():
            raise HTTPException(status_code=400, detail="La transcripción no produjo texto.")

        lista_participantes = [p.strip() for p in participantes.split(',') if p.strip()]
        
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as executor:
            future_resumen = loop.run_in_executor(executor, generador_resumen.generar_resumen_completo, texto_transcrito, titulo, lista_participantes, tipo_audio)
            future_mapa = loop.run_in_executor(executor, generador_mapa.generar_mapa_mental, texto_transcrito)
            resumen_md, metadatos = await future_resumen
            mapa_mermaid = await future_mapa

        if not resumen_md or not mapa_mermaid:
            raise HTTPException(status_code=500, detail="Error al generar análisis con OpenAI.")

        nueva_reunion = reunion_model.Reunion(
            titulo=titulo if titulo else file.filename,
            transcripcion=texto_transcrito,
            resumen_md=resumen_md,
            mapa_mermaid=mapa_mermaid,
            metadatos=metadatos,
            nombre_archivo_original=file.filename,
            user_id=current_user.id
        )

        db.add(nueva_reunion)
        db.commit()
        db.refresh(nueva_reunion)
        
        # El frontend ahora navega a una ruta de resultados, por lo que podemos devolver solo el ID
        return { "success": True, "id": nueva_reunion.id }
    finally:
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)


# --- ESTE ES EL ENDPOINT QUE FALTABA ---
@app.get("/api/meetings/{meeting_id}", response_model=MeetingResponse, tags=["Meetings"])
async def get_meeting_by_id(
    meeting_id: int, 
    db: Session = Depends(get_db), 
    current_user: usuario_model.Usuario = Depends(auth.get_current_user)
):
    """
    Obtiene una reunión específica por su ID, verificando que pertenezca al usuario autenticado.
    """
    db_meeting = db.query(reunion_model.Reunion).filter(
        reunion_model.Reunion.id == meeting_id,
        reunion_model.Reunion.user_id == current_user.id
    ).first()

    if db_meeting is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found or you don't have permission to view it")
    
    return db_meeting
# ----------------------------------------


@app.get("/api/meetings", response_model=List[MeetingResponse], tags=["Meetings"])
async def get_user_meetings(db: Session = Depends(get_db), current_user: usuario_model.Usuario = Depends(auth.get_current_user)):
    """
    Obtiene todas las reuniones para el usuario autenticado.
    """
    reuniones = db.query(reunion_model.Reunion).filter(reunion_model.Reunion.user_id == current_user.id).order_by(reunion_model.Reunion.fecha_creacion.desc()).all()
    return reuniones


# --- ENDPOINT DE BÚSQUEDA ---
@app.post("/api/search", tags=["Search"])
async def search_meetings(
    request: SearchRequest,
    db: Session = Depends(get_db),
    current_user: usuario_model.Usuario = Depends(auth.get_current_user)
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