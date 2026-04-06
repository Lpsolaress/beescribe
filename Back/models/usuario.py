# models/usuario.py

from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from core.database import Base

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    alias = Column(String, nullable=True)
    foto_perfil = Column(String, nullable=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)

    reuniones = relationship("Reunion", back_populates="owner")