# Bee-Scribe
🚀 Un proyecto que incluye un Frontend con React y un Backend con Python.

## Estructura del Proyecto

- `frontend/`: Aplicación de interfaz de usuario construida con React y TailwindCSS.
- `Back/`: API construida con Python y FastAPI, encargada del procesamiento, autenticación y persistencia de datos.

## Configuración y Ejecución

### Backend
Para configurar y ejecutar el backend localmente:
```bash
cd Back
python3 -m venv venv
source ./venv/bin/activate
pip install -r requirements.txt
uvicorn api.main:app --reload
```

### Frontend
Para configurar y ejecutar el frontend localmente:
```bash
cd frontend
npm install
npm run dev
```

Este proyecto está en desarrollo continuo y se está migrando a nuevas tecnologías para mejorar la escalabilidad y la experiencia de usuario.
