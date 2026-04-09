# 🐝 Bee-Scribe: Análisis de Reuniones y Estudio con IA

**Transforma tus reuniones en planes de acción, mapas mentales y conocimiento estructurado.**

Bee-Scribe es una plataforma de alto rendimiento impulsada por IA diseñada para automatizar la transcripción, el análisis y la síntesis de grabaciones de audio. Ya sea una reunión corporativa, una clase académica o una sesión de lluvia de ideas creativa, Bee-Scribe extrae lo esencial y lo organiza de manera impecable.

---

## 📑 Tabla de Contenidos

1. [Resumen del Proyecto](#-resumen-del-proyecto)
2. [Funcionalidades Clave](#-funcionalidades-clave)
3. [Casos de Uso Genéricos](#-casos-de-uso-genéricos)
4. [Arquitectura Técnica](#-arquitectura-técnica)
    - [Seguridad y Cifrado de Datos](#-seguridad-y-cifrado-de-datos)
    - [Stack Tecnológico](#-stack-tecnológico)
5. [Instalación y Configuración](#-instalación-y-configuración)
6. [Referencia de la API](#-referencia-de-la-api)
7. [Esquema de la Base de Datos](#-esquema-de-la-base-de-datos)
8. [Configuración de Entorno (.env)](#-configuración-de-entorno-env)

---

## 🚀 Resumen del Proyecto

Bee-Scribe (v2.0.0) cierra la brecha entre el audio bruto y la productividad estructurada. Combina la **Transcripción Local con Whisper** para garantizar la privacidad y eficiencia de costos con los **Modelos de Lenguaje de OpenAI** para una síntesis de contenido avanzada. La aplicación cuenta con un modo "Estudio" donde los usuarios pueden re-procesar sus transcripciones en múltiples formatos como cuestionarios, guiones o informes detallados.

---

## ✨ Funcionalidades Clave

| Funcionalidad | Descripción |
| :--- | :--- |
| **Transcripción Híbrida** | Utiliza Whisper local (CPU/MPS) por defecto para un procesamiento sin costo, con opción de fallback a la API en la nube. |
| **Estudio de IA** | Transforma las transcripciones en Resúmenes Breves, Informes Detallados, Cuestionarios Interactivos o Guiones de Estilo Cinematográfico. |
| **Mapas Mentales Mermaid** | Genera automáticamente diagramas visuales de los conceptos más importantes utilizando la sintaxis de Mermaid.js. |
| **Asistente Bee AI** | Un panel de chat persistente que puede analizar una o varias reuniones simultáneamente utilizando contexto avanzado. |
| **Exportación a PDF** | Descarga cualquier contenido generado o mapa mental como un informe PDF profesional y estandarizado. |
| **Procesamiento Programado** | Pon archivos de audio en cola para ser procesados en una fecha y hora específicas. |
| **Búsqueda Inteligente** | Funcionalidad de búsqueda global para encontrar reuniones por título, participantes o fragmentos de contenido. |
| **Compartir Seguro** | Comparte tus resultados de estudio con otros usuarios por correo electrónico con control de acceso granular. |

---

## 🌍 Casos de Uso Genéricos

Bee-Scribe está diseñado para ser versátil en cualquier dominio que involucre comunicación hablada:

*   **Gestión de Reuniones:** Extrae automáticamente puntos de acción, responsables y plazos de las sincronizaciones de negocios.
*   **Consolidación de Conocimiento:** Convierte conferencias largas o talleres en guías de estudio y cuestionarios interactivos.
*   **Creación de Contenido:** Transforma entrevistas, podcasts o lluvias de ideas en guiones y esquemas estructurados.
*   **Recuperación de Archivos:** Mantén una base de datos indexada y consultable de todas las comunicaciones de voz para referencia futura.

---

## 🛠️ Arquitectura Técnica

### 🔐 Seguridad y Cifrado de Datos
Bee-Scribe prioriza la privacidad. Los datos sensibles (transcripciones, resúmenes y mapas mentales) se almacenan utilizando el estándar de la industria **AES-GCM (v1)**.

*   **Algoritmo:** `AES-GCM` con una Clave Maestra de 256 bits (32 bytes).
*   **Protocolo:** Cada campo cifrado utiliza un `nonce` aleatorio único de 12 bytes.
*   **AAD (Datos de Autenticación Adicionales):** Garantiza la integridad del esquema de cifrado (`beescribe:v1`).
*   **Almacenamiento:** Las cadenas cifradas llevan el prefijo `enc:v1:` para permitir una migración fluida y soporte para estados de texto plano o cifrado.
*   **Control:** El cifrado se puede activar o desactivar mediante la variable de entorno `ENCRYPTION_ENABLED`.

### 💻 Stack Tecnológico

**Frontend:**
- **React (Vite):** Desarrollo de UI moderno y rápido.
- **TailwindCSS:** Estilos basados en utilidades para un diseño premium.
- **Mermaid.js:** Renderizado dinámico de mapas mentales.
- **html2pdf.js:** Generación de PDFs de alta fidelidad en el lado del cliente.

**Backend:**
- **FastAPI (Python):** API asíncrona de alto rendimiento.
- **SQLAlchemy:** Kit de herramientas SQL y mapeador objeto-relacional (ORM).
- **OpenAI API:** Utiliza `gpt-4o-mini` y `gpt-3.5-turbo`.
- **OpenAI Whisper:** Implementación local para transcripción de última generación.

---

## 📦 Instalación y Configuración

### Prerrequisitos
- Python 3.10+
- Node.js 18+
- [FFmpeg](https://ffmpeg.org/) (Requerido para el procesamiento de audio)

### Configuración del Backend
```bash
cd Back
python -m venv venv
source venv/bin/activate  # venv\Scripts\activate en Windows
pip install -r requirements.txt
# Configura tu archivo .env (ver abajo)
uvicorn api.main:app --reload
```

### Configuración del Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 📡 Referencia de la API

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `POST` | `/register` | Registrar un nuevo usuario. |
| `POST` | `/token` | Autenticarse y obtener el JWT. |
| `POST` | `/meetings` | Subir y procesar un archivo de audio (Asíncrono). |
| `GET` | `/meetings` | Listar todas las reuniones disponibles (Propias + Compartidas). |
| `GET` | `/meetings/{id}` | Obtener detalles completos de una reunión (desencriptado). |
| `POST` | `/meetings/transform` | Generar nuevo contenido de Studio (Test, Guion, etc). |
| `POST` | `/chat` | Chat con el Asistente Bee AI utilizando contexto. |
| `GET` | `/statistics` | Obtener métricas de uso para el usuario. |

---

## 📂 Esquema de la Base de Datos

El sistema utiliza una base de datos relacional (SQLite/PostgreSQL) con las siguientes entidades principales:
- **Usuario:** Autenticación, alias, foto de perfil y detalles de Google OAuth.
- **Reunion:** Entidad principal que contiene título, metadatos, estado y resultados cifrados.
- **Transformacion:** Almacenamiento persistente para las versiones de contenido generadas en Studio.
- **ReunionCompartida:** Tabla de unión para gestionar la colaboración y los permisos de compartición.

---

## ⚙️ Configuración (.env)

| Clave | Ejemplo | Descripción |
| :--- | :--- | :--- |
| `DATABASE_URL` | `sqlite:///reuniones.db` | Cadena de conexión. |
| `OPENAI_API_KEY` | `sk-...` | Tu clave de OpenAI. |
| `ENCRYPTION_ENABLED` | `True` | Activar/Desactivar cifrado AES-GCM. |
| `ENCRYPTION_MASTER_KEY` | `base64_string` | Clave de 32 bytes en base64 URL-safe. |
| `USE_OPENAI_TRANSCRIPTION` | `False` | Establecer en `True` para usar la API de Whisper. |
| `WHISPER_MODEL_SIZE` | `base` | Tamaño del modelo local de Whisper (`tiny`, `base`, `small`). |

---

**Desarrollado con 🐝 por el equipo de Bee-Scribe.**
