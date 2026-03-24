from core.database import SessionLocal
from models.reunion import Reunion
from models.usuario import Usuario

db = SessionLocal()
# Assume we want to check for user ID 4
user_id = 4
reuniones = db.query(Reunion).filter(Reunion.user_id == user_id).all()
print(f"Reuniones para usuario {user_id}: {len(reuniones)}")
for r in reuniones:
    print(f" - {r.id}: {r.titulo} ({r.fecha_creacion})")
db.close()
