# services/buscador.py

from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, cast, String as AlchemyString
from models.reunion import Reunion
from datetime import datetime, timedelta

class BuscadorReunionesDB:
    def buscar(self, db: Session, user_id: int, consulta: str = "", filtros: dict = None):
        """
        Busca reuniones para un usuario específico, aplicando una consulta de texto
        y filtros avanzados por fecha y metadatos.
        """
        print(f"🔍 Buscando para usuario {user_id} con consulta '{consulta}' y filtros: {filtros}")
        
        # Empezamos con una consulta base que filtra por el usuario logueado
        query = db.query(Reunion).filter(Reunion.user_id == user_id)

        # 1. Aplicar filtro de texto general (si existe)
        if consulta:
            terminos_busqueda = f"%{consulta}%"
            query = query.filter(
                or_(
                    Reunion.titulo.ilike(terminos_busqueda),
                    Reunion.transcripcion.ilike(terminos_busqueda),
                    Reunion.resumen_md.ilike(terminos_busqueda)
                )
            )

        # 2. Aplicar filtros avanzados (si existen)
        if filtros:
            condiciones_filtro = []
            
            # Filtro por rango de fechas
            fecha_inicio_str = filtros.get('fecha_inicio')
            fecha_fin_str = filtros.get('fecha_fin')
            
            if fecha_inicio_str:
                try:
                    fecha_inicio = datetime.fromisoformat(fecha_inicio_str)
                    condiciones_filtro.append(Reunion.fecha_creacion >= fecha_inicio)
                except ValueError:
                    pass # Ignorar fecha inválida

            if fecha_fin_str:
                try:
                    # Añadimos un día para incluir todo el día de fin
                    fecha_fin = datetime.fromisoformat(fecha_fin_str) + timedelta(days=1)
                    condiciones_filtro.append(Reunion.fecha_creacion < fecha_fin)
                except ValueError:
                    pass # Ignorar fecha inválida

            # Filtro por metadatos (búsqueda dentro del JSON)
            meta_consulta = filtros.get('metadatos')
            if meta_consulta:
                termino_meta = f"%{meta_consulta}%"
                # Esta es la magia de SQLAlchemy: podemos convertir el JSON a texto y buscar dentro
                condiciones_filtro.append(
                    cast(Reunion.metadatos, AlchemyString).ilike(termino_meta)
                )

            # Si hay condiciones, las aplicamos todas a la consulta
            if condiciones_filtro:
                query = query.filter(and_(*condiciones_filtro))
        
        # Ordenar siempre por fecha de creación descendente
        resultados = query.order_by(Reunion.fecha_creacion.desc()).all()
        
        print(f"✅ Búsqueda completada, {len(resultados)} resultados encontrados.")
        return resultados