# backend/core/database.py

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from dotenv import load_dotenv

# Carga las variables de entorno desde el archivo .env
load_dotenv()

# Obtiene la URL de conexión a la base de datos desde las variables de entorno
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("No se encontró la variable de entorno DATABASE_URL. Asegúrate de que está definida en tu archivo .env")

# El 'engine' es el punto de entrada principal a la base de datos.
# Se encarga de la comunicación real entre SQLAlchemy y PostgreSQL.
engine = create_engine(DATABASE_URL)

# Cada instancia de SessionLocal representará una sesión de base de datos.
# Esto es lo que usarás en tus endpoints para realizar consultas.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Creamos una clase Base. Todos nuestros modelos de ORM (las tablas)
# heredarán de esta clase para ser registrados por SQLAlchemy.
Base = declarative_base()

# --- Función de utilidad para la inyección de dependencias ---
def get_db():
    """
    Función de dependencia de FastAPI para obtener una sesión de base de datos.
    Se asegura de que la conexión a la base de datos se cierre siempre
    después de que la solicitud haya terminado.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()