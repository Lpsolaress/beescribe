# services/auth.py

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import os

from core.database import get_db
import models.usuario as usuario_model

# --- Configuración de Seguridad ---
SECRET_KEY = os.getenv("SECRET_KEY", "una_clave_secreta_muy_segura_debes_cambiar_esto")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 1 día

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# --- Funciones de Utilidad ---

def verify_password(plain_password, hashed_password):
    if hashed_password is None:
        return False
    plain_bytes = (plain_password or "")[:72].encode("utf-8")
    hashed_bytes = (hashed_password or "").encode("utf-8")
    try:
        return bcrypt.checkpw(plain_bytes, hashed_bytes)
    except Exception:
        return False

def get_password_hash(password):
    password_bytes = (password or "")[:72].encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- Dependencia para obtener el usuario actual ---

def get_user(db: Session, email: str):
    return db.query(usuario_model.Usuario).filter(usuario_model.Usuario.email == email).first()

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = get_user(db, email=email)
    if user is None:
        raise credentials_exception
    return user
