# services/resumen.py

import openai
import json

class GeneradorResumenAvanzado:
    def __init__(self, api_key: str):
        if not api_key:
            raise ValueError("La clave de API de OpenAI es obligatoria.")
        self.client = openai.OpenAI(api_key=api_key)
        self.model = "gpt-3.5-turbo-0125"
        print("✅ Generador de resúmenes con OpenAI listo.")

    def _get_prompt_for_type(self, tipo_audio: str, transcripcion: str, titulo: str, participantes: list) -> str:
        """
        Selector de prompts. Devuelve el prompt más adecuado según el tipo de audio.
        """
        print(f"🧠 Seleccionando prompt especializado para tipo: '{tipo_audio}'")
        
        # --- PROMPT PARA REUNIONES (ENFOCADO EN ACCIONES) ---
        if tipo_audio == "reunion":
            return f"""
            Actúa como un analista de negocios experto y secretario de reuniones. A partir de la siguiente transcripción de una reunión, realiza tres tareas:

            **Tarea 1: Resumen Ejecutivo en Markdown**
            Crea un resumen conciso para ejecutivos.
            - **Objetivo de la Reunión:** Describe en una frase el propósito principal.
            - **Decisiones Clave:** Enumera las decisiones más importantes tomadas.
            - **Puntos de Bloqueo:** Menciona si hubo desacuerdos o temas pendientes.

            **Tarea 2: Plan de Acción en Markdown**
            Extrae todas las tareas y acciones a realizar en una tabla con las columnas "Acción", "Responsable(s)" y "Plazo/Fecha Límite". Si no se menciona un responsable o plazo, indica "No especificado".

            **Tarea 3: Metadatos en JSON**
            Extrae las siguientes entidades en un objeto JSON estricto.
            - `tema_principal`: Frase corta que describe el tema.
            - `personas_clave`: Nombres de los participantes más activos o mencionados.
            - `proyectos_mencionados`: Nombres de proyectos o iniciativas.
            - `sentimiento_general`: Describe el tono de la reunión (ej: "Colaborativo", "Tenso", "Productivo").

            **TRANSCRIPCIÓN:**
            ---
            {transcripcion}
            ---

            **FORMATO DE RESPUESTA REQUERIDO:**
            [AQUÍ VA EL RESUMEN EJECUTIVO Y EL PLAN DE ACCIÓN EN MARKDOWN]
            ||METADATOS||
            [AQUÍ VA EL OBJETO JSON VÁLIDO]
            """

        # --- PROMPT PARA PODCASTS (ENFOCADO EN CONTENIDO) ---
        elif tipo_audio == "podcast":
            return f"""
            Actúa como un productor de contenido experto. A partir de la transcripción de un podcast, realiza tres tareas:

            **Tarea 1: Notas del Episodio en Markdown**
            Crea unas "show notes" atractivas para publicar.
            - **Introducción:** Un párrafo que enganche al oyente sobre el tema del episodio.
            - **Temas Tratados:** Una lista con viñetas de los puntos más interesantes discutidos.
            - **Citas Destacadas:** Extrae 2-3 citas potentes o reveladoras de los ponentes.
            
            **Tarea 2: Sugerencias de Títulos**
            Propón 3 títulos alternativos y llamativos para este episodio.

            **Tarea 3: Metadatos en JSON**
            Extrae las siguientes entidades en un objeto JSON estricto.
            - `tema_principal`: Categoría del podcast (ej: "Tecnología", "Historia", "Comedia").
            - `invitados`: Nombres de los invitados, si los hay.
            - `recursos_mencionados`: Libros, herramientas, o enlaces mencionados.
            - `tono`: Describe el ambiente del podcast (ej: "Inspirador", "Humorístico", "Técnico").

            **TRANSCRIPCIÓN:**
            ---
            {transcripcion}
            ---

            **FORMATO DE RESPUESTA REQUERIDO:**
            [AQUÍ VAN LAS NOTAS DEL EPISODIO Y TÍTULOS EN MARKDOWN]
            ||METADATOS||
            [AQUÍ VA EL OBJETO JSON VÁLIDO]
            """

        # --- PROMPT PARA CONVERSACIONES (ENFOCADO EN PERSPECTIVAS) ---
        elif tipo_audio == "conversacion":
            return f"""
            Actúa como un psicólogo experto en comunicación. A partir de la transcripción de una conversación, realiza dos tareas:

            **Tarea 1: Síntesis de la Conversación en Markdown**
            Resume los puntos clave de la interacción.
            - **Tema Central:** ¿De qué trata principalmente la conversación?
            - **Puntos de Vista:** Describe las diferentes perspectivas o argumentos presentados por los participantes.
            - **Momentos Clave:** Identifica el punto de inflexión, el momento de mayor acuerdo o desacuerdo.
            
            **Tarea 2: Metadatos en JSON**
            Extrae las siguientes entidades en un objeto JSON estricto.
            - `tema_principal`: El tema en 1-3 palabras.
            - `emocion_dominante`: La emoción principal que se percibe (ej: "Alegría", "Frustración", "Curiosidad").
            - `conclusion`: ¿Se llegó a alguna conclusión o acuerdo? (Breve descripción o `null`).
            - `patrones_comunicacion`: Describe brevemente el estilo de la conversación (ej: "Intercambio rápido de ideas", "Debate formal", "Charla informal").

            **TRANSCRIPCIÓN:**
            ---
            {transcripcion}
            ---

            **FORMATO DE RESPUESTA REQUERIDO:**
            [AQUÍ VA LA SÍNTESIS EN MARKDOWN]
            ||METADATOS||
            [AQUÍ VA EL OBJETO JSON VÁLIDO]
            """

        # --- PROMPT POR DEFECTO (GENÉRICO) ---
        else: # "audio_normal" o cualquier otro caso
            return f"""
            Actúa como un asistente experto en la síntesis de información. A partir de la siguiente transcripción, realiza dos tareas:

            **Tarea 1: Resumen en Markdown**
            Crea un resumen claro y bien estructurado del contenido.
            - Identifica los 2-4 temas principales.
            - Para cada tema, escribe un párrafo corto explicando los puntos clave.
            - Utiliza títulos (##) y viñetas (-) para organizar la información.

            **Tarea 2: Extracción de Metadatos en JSON**
            Extrae las siguientes entidades en un objeto JSON estricto.
            - `personas`: Nombres de personas mencionadas.
            - `lugares`: Ciudades, países o lugares específicos.
            - `organizaciones`: Nombres de empresas o instituciones.
            - `fechas`: Fechas o plazos específicos.
            - `acciones`: Tareas concretas que se deban realizar.
            - `tema_general`: Una frase corta que describa el tema principal del audio.
            
            **TRANSCRIPCIÓN:**
            ---
            {transcripcion}
            ---

            **FORMATO DE RESPUESTA REQUERIDO:**
            [AQUÍ VA EL RESUMEN EN MARKDOWN]
            ||METADATOS||
            [AQUÍ VA EL OBJETO JSON VÁLIDO]
            """

    def generar_resumen_completo(self, transcripcion: str, titulo: str, participantes: list, tipo_audio: str):
        print(f"📝 Generando resumen y metadatos con OpenAI para un audio de tipo '{tipo_audio}'...")
        
        prompt = self._get_prompt_for_type(tipo_audio, transcripcion, titulo, participantes)

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.5,
                max_tokens=2048,
            )
            
            contenido_respuesta = response.choices[0].message.content
            
            if "||METADATOS||" in contenido_respuesta:
                partes = contenido_respuesta.split("||METADATOS||", 1)
                resumen_md = partes[0].strip()
                metadatos_json_str = partes[1].strip()
                
                try:
                    metadatos = json.loads(metadatos_json_str)
                except json.JSONDecodeError:
                    print("⚠️ OpenAI devolvió un JSON mal formado. Se guardarán metadatos básicos.")
                    metadatos = {"error": "El JSON generado por la IA no era válido.", "raw_metadata": metadatos_json_str}
            else:
                print("⚠️ OpenAI no incluyó el separador de metadatos. Se guardará solo el resumen.")
                resumen_md = contenido_respuesta.strip()
                metadatos = {"error": "La IA no generó el separador ||METADATOS||."}

            print("✅ Análisis de OpenAI completado.")
            return resumen_md, metadatos

        except Exception as e:
            print(f"❌ Error al contactar la API de OpenAI: {e}")
            raise ConnectionError(f"No se pudo completar la petición a OpenAI: {e}")