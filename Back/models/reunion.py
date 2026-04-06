# models/reunion.py

from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
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
    
    # Nuevos campos para cola y programación
    status = Column(String, default="PENDING", index=True) # PENDING, PROCESSING, COMPLETED, FAILED, SCHEDULED
    scheduled_at = Column(DateTime, nullable=True)
    progress = Column(Integer, default=0) # Porcentaje de progreso (0-100)
    
    user_id = Column(Integer, ForeignKey("usuarios.id"))
    owner = relationship("Usuario", back_populates="reuniones")

class ReunionCompartida(Base):
    __tablename__ = "reuniones_compartidas"

    id = Column(Integer, primary_key=True, index=True)
    reunion_id = Column(Integer, ForeignKey("reuniones.id"))
    email_destinatario = Column(String, index=True)
    fecha_compartido = Column(DateTime, default=datetime.utcnow)

    reunion = relationship("Reunion")
