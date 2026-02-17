# models/reunion.py

from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, ForeignKey # <-- Añade ForeignKey
from sqlalchemy.orm import relationship                                     # <-- Añade relationship
from datetime import datetime
from core.database import Base

class Reunion(Base):
    __tablename__ = "reuniones"

    id = Column(Integer, primary_key=True, index=True)
    # ... (tus otros campos se mantienen igual)
    titulo = Column(String, index=True)
    transcripcion = Column(Text, nullable=True)
    resumen_md = Column(Text, nullable=True)
    mapa_mermaid = Column(Text, nullable=True)
    metadatos = Column(JSON, nullable=True)
    nombre_archivo_original = Column(String)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    
    # --- AÑADE ESTAS LÍNEAS PARA LA RELACIÓN ---
    user_id = Column(Integer, ForeignKey("usuarios.id"))
    owner = relationship("Usuario", back_populates="reuniones")