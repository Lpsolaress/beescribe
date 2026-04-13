# services/resumen.py

from core.logger import log_step
import openai
import json
import os
import ssl
import httpx
import certifi
from dotenv import load_dotenv
import textwrap

load_dotenv()

class GeneradorResumenAvanzado:
    def __init__(self, api_key: str):
        base_flag = os.getenv("USE_OPENAI_API", "False")
        summary_flag = os.getenv("USE_OPENAI_SUMMARY", base_flag)
        self.use_openai = summary_flag.lower() == "true"
        
        if self.use_openai:
            print(f"DEBUG: use_openai is True, api_key found: {bool(api_key)}")
            if not api_key:
                print("DEBUG: Raising ValueError due to missing api_key")
                raise ValueError("La clave de API de OpenAI es obligatoria cuando USE_OPENAI_SUMMARY=True.")
            self.api_key = api_key
            self.client = None
            self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
            print(f"✅ Generador de resúmenes con OpenAI listo (MODO ONLINE). Modelo: {self.model}")
        else:
            print(f"DEBUG: use_openai is False. base_flag={base_flag}, summary_flag={summary_flag}")
            self.api_key = None
            self.client = None
            print("✅ Generador de resúmenes listo (MODO LOCAL/OFFLINE).")

    def _ensure_openai_client(self) -> None:
        if not self.use_openai or self.client is not None:
            return
        try:
            # Simplificamos la inicialización del cliente. 
            # OpenAI ya maneja sus propios certificados por defecto de forma robusta.
            self.client = openai.OpenAI()
        except Exception as e:
            print(f"❌ Error al inicializar el cliente de OpenAI: {e}")
            self.use_openai = False
            self.client = None

    def _generar_resumen_local(self, transcripcion: str, tipo_audio: str) -> tuple:
        """Genera un resumen básico usando manipulación de cadenas para el modo local."""
        lineas = [l.strip() for l in transcripcion.split('.') if l.strip()]
        
        resumen_corto = ". ".join(lineas[:3]) + "." if len(lineas) > 3 else transcripcion
        puntos_clave = [f"- {l}." for l in lineas[3:6]] if len(lineas) > 6 else ["- Información insuficiente para extraer puntos clave."]
        puntos_str = "\n".join(puntos_clave)
        
        titulos = {
            "breve": "Resumen Breve",
            "detallado": "Informe Detallado",
            "cuestionario": "Cuestionario",
            "guion": "Guion",
        }
        titulo_seccion = titulos.get(tipo_audio, "Resumen")

        if tipo_audio == "cuestionario":
            resumen_md = f"""
# {titulo_seccion}
1. ¿Cuál es el tema principal tratado?
2. ¿Qué puntos clave se mencionaron?
3. ¿Hubo alguna decisión importante?
4. ¿Quiénes participaron activamente?
5. ¿Cuál es la conclusión general?

> [!NOTE]
> Este es un cuestionario genérico generado localmente.
"""
        elif tipo_audio == "guion":
            resumen_md = f"""
# {titulo_seccion}
(ESCENA: Inicio de la grabación)

PERSONA A: {resumen_corto}

(FIN DEL EXTRACTO)
"""
        else:
            resumen_md = f"""
# {titulo_seccion}

## Contenido Principal
{resumen_corto}

## Puntos Destacados
{puntos_str}
"""
        
        resumen_md += f"\n## Transcripción Original (Extracto)\n_{transcripcion[:300]}..._\n"
        metadatos = {
            "tema_principal": "Análisis Local",
            "tipo": tipo_audio,
            "origen": "Whisper Local",
            "nota": "Generado sin IA externa"
        }
        return resumen_md, metadatos

    def _get_prompt_for_type(self, tipo_audio: str, transcripcion: str, titulo: str, participantes: list) -> str:
        """
        Selector de prompts. Devuelve el prompt más adecuado según el tipo de audio.
        """
        import random
        print(f"🧠 Seleccionando prompt especializado para tipo: '{tipo_audio}'")
        
        # Inyección de VARIEDAD: Instrucción general para evitar repeticiones
        variedad_instr = "IMPORTANTE: Varía el enfoque y los detalles. Si generas contenido varias veces, explora diferentes ángulos, secciones o datos específicos del documento para asegurar variedad y evitar repeticiones exactas."

        # --- PROMPT PARA REUNIONES (ENFOCADO EN ACCIONES) ---
        if tipo_audio == "reunion":
            return f"""
            Actúa como una analista de negocios experta y secretaria de reuniones. A partir de la siguiente transcripción, realiza:
            {variedad_instr}

            - **Tareas:** Tabla con columnas "Acción", "Responsable" y "Plazo".
            
            REGLAS DE FORMATO CRÍTICAS:
            - NO incluyas ninguna sección llamada "Metadatos" o "JSON" en el Markdown.
            - NO uses bloques de código (```json) en esta sección.
            
            IMPORTANTE: No incluyas código JSON ni bloques de código técnico en esta sección.

            **Tarea 2: Metadatos (JSON - PARA PROCESAMIENTO INTERNO)**
            Extrae en un objeto JSON:
            - `tema_principal`: Frase corta.
            - `personas_clave`: Nombres.
            - `proyectos_mencionados`: Nombres.
            - `sentimiento_general`: Tono (ej: "Colaborativo").

            **TRANSCRIPCIÓN:**
            ---
            {transcripcion}
            ---

            **FORMATO REQUERIDO:**
            [RESUMEN Y PLAN DE ACCIÓN EN MARKDOWN]
            ||METADATOS||
            [OBJETO JSON VÁLIDO]
            """

        # --- PROMPT PARA PODCASTS (ENFOCADO EN CONTENIDO) ---
        elif tipo_audio == "podcast":
            return f"""
            Actúa como una productora de contenido experta. A partir de la transcripción, realiza:
            {variedad_instr}

            ## Notas del Episodio
            Crea notas atractivas.
            - **Introducción:** Párrafo que enganche.
            - **Temas:** Lista con viñetas de puntos interesantes.
            - **Citas:** 2-3 frases potentes.

            REGLAS DE FORMATO CRÍTICAS:
            - NO incluyas ninguna sección llamada "Metadatos" o "JSON" en el Markdown.
            - NO uses bloques de código (```json) en esta sección.
            
            IMPORTANTE: No incluyas código JSON ni bloques de código técnico en esta sección.

            **Tarea 2: Metadatos (JSON - PARA PROCESAMIENTO INTERNO)**
            Extrae en un objeto JSON:
            - `tema_principal`: Categoría.
            - `invitados`: Nombres.
            - `recursos_mencionados`: Libros, herramientas.
            - `tono`: Ambiente.

            **TRANSCRIPCIÓN:**
            ---
            {transcripcion}
            ---

            **FORMATO REQUERIDO:**
            [NOTAS DEL EPISODIO EN MARKDOWN]
            ||METADATOS||
            [OBJETO JSON VÁLIDO]
            """

        # --- PROMPT PARA CONVERSACIONES (ENFOCADO EN PERSPECTIVAS) ---
        elif tipo_audio == "conversacion":
            return f"""
            Actúa como una experta en comunicación. A partir de la transcripción, realiza:
            {variedad_instr}

            ## Síntesis
            Resume los puntos clave.
            - **Tema Central:** ¿De qué trata?
            - **Perspectivas:** Argumentos de los participantes.
            - **Momentos:** Puntos de acuerdo o desacuerdo.

            REGLAS DE FORMATO CRÍTICAS:
            - NO incluyas ninguna sección llamada "Metadatos" o "JSON" en el Markdown.
            - NO uses bloques de código (```json) en esta sección.
            
            IMPORTANTE: No incluyas código JSON ni bloques de código técnico en esta sección.

            **Tarea 2: Metadatos (JSON - PARA PROCESAMIENTO INTERNO)**
            Extrae en un objeto JSON:
            - `tema_principal`: 1-3 palabras.
            - `emocion_dominante`: Tono emocional.
            - `conclusion`: Resumen de acuerdos.
            - `patrones_comunicacion`: Estilo.

            **TRANSCRIPCIÓN:**
            ---
            {transcripcion}
            ---

            **FORMATO REQUERIDO:**
            [SÍNTESIS EN MARKDOWN]
            ||METADATOS||
            [OBJETO JSON VÁLIDO]
            """

        # --- NUEVOS PROMPTS DE TRANSFORMACIÓN (BREVE, DETALLADO, CUESTIONARIO, GUION) ---
        elif tipo_audio == "breve":
            return f"""
            Actúa como una sintetizadora experta. Realiza un resumen corto.
            {variedad_instr}

            ## Resumen Ejecutivo
            - Resumen en 3 frases con los HECHOS más importantes del audio.
            - 3 viñetas con datos específicos extraídos (nombres, cifras, decisiones).
            
            REGLA DE ORO: Básate EXCLUSIVAMENTE en la transcripción. PROHIBIDO inventar o usar frases genéricas.

            REGLAS DE FORMATO CRÍTICAS:
            - NO incluyas ninguna sección llamada "Metadatos" o "JSON" en el Markdown.
            - NO uses bloques de código (```json) en esta sección.
            
            IMPORTANTE: No incluyas código JSON ni bloques de código técnico en esta sección.

            **Tarea 2: Metadatos (JSON - PARA PROCESAMIENTO INTERNO)**
            - `tema_principal`: Frase corta.
            - `sentimiento`: Breve descripción.

            **TRANSCRIPCIÓN:**
            ---
            {transcripcion}
            ---

            **FORMATO REQUERIDO:**
            [RESUMEN EN MARKDOWN]
            ||METADATOS||
            [OBJETO JSON VÁLIDO]
            """

        elif tipo_audio == "detallado":
            return f"""
            Actúa como una analista senior experta en documentación técnica y corporativa. Tu objetivo es crear un **INFORME EXHAUSTIVO Y MINUCIOSO**.
            {variedad_instr}
            
            ## Informe de Alta Densidad
            Divide el informe en secciones lógicas y cronológicas MUY EXTENSAS. Se proactivo y reconstructivo.
            - **Resumen Narrativo Profundo:** Un párrafo largo explicativo basado al 100% en lo dicho.
            - **Desglose Exhaustivo de Puntos Clave:** Mínimo 10-15 viñetas detalladas con hechos reales.
            - **Datos Específicos:** Recopila TODAS las cifras, fechas, nombres, herramientas y citas textuales extraídas.
            - **Decisiciones y Acuerdos Detallados:** Describe no solo el qué, sino el por qué según los participantes.
            
            REGLA DE ORO: NO inventes información. Si algo no está en el audio, no lo incluyas.

            REGLAS DE FORMATO CRÍTICAS:
            - EL INFORME DEBE SER MASIVO. No resumas, EXPANDE.
            - **OBLIGATORIO: DIVIDIR EN PÁGINAS**: Inserta el marcador `---PAGINA---` periódicamente.
            
            - NO incluyas ninguna sección llamada "Metadatos" o "JSON" en el Markdown.
            - NO uses bloques de código (```json) en esta sección.

            **Tarea 2: Metadatos (JSON - PARA PROCESAMIENTO INTERNO)**
            - `temas_clave`: Lista exhaustiva.
            - `entidades_relevantes`: Personas, cargos, empresas o software mencionados.
            - `nivel_detalle`: "Máximo".

            **TRANSCRIPCIÓN:**
            ---
            {transcripcion}
            ---

            **FORMATO REQUERIDO:**
            [INFORME EXTENSO EN MARKDOWN]
            ||METADATOS||
            [OBJETO JSON VÁLIDO]
            """

        elif tipo_audio == "cuestionario":
            return f"""
            Actúa como una instructora pedagógica experta. 
            
            TRANSCRIPCIÓN DEL AUDIO:
            ---
            {transcripcion}
            ---

            TAREA: Basándote en la transcripción de arriba, crea un cuestionario de EXACTAMENTE 10 preguntas para validar la comprensión.
            {variedad_instr} 
            Enfócate en detalles concretos diferentes cada vez.

            FORMATO DE RESPUESTA:
            Debes proporcionar primero el cuestionario en formato Markdown legible.
            Al final de todo el texto, añade el separador ||METADATOS|| seguido de un objeto JSON con las preguntas estructuradas.

            # 📝 Cuestionario de Evaluación

            ## Pregunta 1
            **¿[Pregunta específica sobre un dato del audio]?**
            a) Opción A
            b) Opción B
            c) Opción C
            d) Opción D

            ✅ **Respuesta correcta:** [letra]) [texto]
            💡 **Explicación:** [Por qué es correcta según el audio]

            ---
            (Repite para las 10 preguntas)

            ||METADATOS||
            {{
              "preguntas": [
                {{ "id": 1, "pregunta": "...", "opciones": ["...", "...", "...", "..."], "respuesta_correcta": 0, "explicacion": "..." }},
                ...
              ],
              "tema_evaluado": "{titulo}",
              "puntos_totales": 10
            }}
            """


        elif tipo_audio == "guion":
            return f"""
            Actúa como una guionista profesional. Convierte la transcripción en un guion.
            {variedad_instr} Explora diferentes estilos narrativos o focos de la conversación en cada versión.

            ## Guion
            - **Escena:** Entorno real descrito o deducido.
            - **Diálogos:** Formato NOMBRE: Texto. 
            - **Acotaciones:** Tono/Acciones reales detectadas.
            
            REGLA DE ORO: Los personajes DEBEN ser las personas reales que hablan. El guion debe ser una recreación fiel.

            REGLAS DE FORMATO CRÍTICAS:
            - NO incluyas ninguna sección llamada "Metadatos" o "JSON" en el Markdown.
            
            **Tarea 2: Metadatos (JSON - PARA PROCESAMIENTO INTERNO)**
            - `personajes`: Lista.
            - `genero_sugerido`: Estilo (Varía cada vez: ej. Dramático, Técnico, Informal).

            **TRANSCRIPCIÓN:**
            ---
            {transcripcion}
            ---

            **FORMATO REQUERIDO:**
            [GUION EN MARKDOWN]
            ||METADATOS||
            [OBJETO JSON VÁLIDO]
            """

        # --- PROMPT POR DEFECTO (GENÉRICO) ---
        else: # "audio_normal" o cualquier otro caso
            return f"""
            Actúa como una asistente experta en síntesis.
            {variedad_instr}

            ## Resumen
            Crea un resumen claro.
            - Identifica 2-4 temas principales.
            - Explica cada punto con viñetas.

            REGLAS DE FORMATO CRÍTICAS:
            - NO incluyas ninguna sección llamada "Metadatos" o "JSON" en el Markdown.

            **Tarea 2: Metadatos (JSON - PARA PROCESAMIENTO INTERNO)**
            - `personas`, `lugares`, `organizaciones`.
            - `tema_general`: Frase corta.

            **TRANSCRIPCIÓN:**
            ---
            {transcripcion}
            ---

            **FORMATO REQUERIDO:**
            [RESUMEN EN MARKDOWN]
            ||METADATOS||
            [OBJETO JSON VÁLIDO]
            """

    def _dividir_en_fragmentos(self, texto: str, max_chars: int = 18000) -> list:
        """Divide un texto largo en fragmentos más pequeños, manejando bloques sin saltos de línea."""
        if not texto:
            return []
            
        fragmentos = []
        actual = []
        caracteres_actual = 0
        
        # Primero intentamos por líneas
        lineas = texto.split('\n')
        
        for linea in lineas:
            # Si una sola línea es más larga que el límite, hay que trocearla por caracteres/palabras
            if len(linea) > max_chars:
                # Si teníamos algo acumulado, lo guardamos
                if actual:
                    fragmentos.append('\n'.join(actual))
                    actual = []
                    caracteres_actual = 0
                
                # Troceamos la línea gigante
                for i in range(0, len(linea), max_chars):
                    fragmentos.append(linea[i:i + max_chars])
                continue

            if caracteres_actual + len(linea) > max_chars and actual:
                fragmentos.append('\n'.join(actual))
                actual = []
                caracteres_actual = 0
            
            actual.append(linea)
            caracteres_actual += len(linea) + 1
            
        if actual:
            fragmentos.append('\n'.join(actual))
            
        return [f for f in fragmentos if f.strip()]

    def _resumir_fragmento(self, fragmento: str, max_tokens: int = 1500, target_model: str = None) -> str:
        """Genera notas detalladas de un fragmento para no perder información en el Map-Reduce."""
        if target_model is None:
            target_model = self.model
        prompt = f"""
        Extrae NOTAS DETALLADAS del siguiente fragmento de audio. 
        Tu objetivo no es resumir, sino CONSERVAR la información para una síntesis posterior.
        Captura:
        - Todos los nombres propios y participantes.
        - Cifras, fechas y plazos.
        - Decisiones específicas tomadas.
        - Argumentos clave a favor o en contra de los temas.
        - Terminología técnica o nombres de proyectos/herramientas.
        
        TEXTO:
        ---
        {fragmento}
        ---
        """
        try:
            response = self.client.chat.completions.create(
                model=target_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            log_step(f"⚠️ Error al extraer notas del fragmento (modelo: {target_model}): {e}")
            return fragmento[:2000] # Fallback: más texto para compensar

    def _limpiar_markdown(self, texto: str) -> str:
        """Elimina de forma MUY agresiva cualquier rastro de metadatos o código del Markdown."""
        import re
        if not texto: return ""
        
        # 1. Remueve backticks de código
        texto = texto.replace('```', '')
        
        # 2. Elimina cualquier línea que empiece por { y termine por } (JSON suelto)
        texto = re.sub(r'(?m)^\s*\{.*\}\s*$', '', texto, flags=re.DOTALL)
        
        # 3. Elimina separadores artificiales internos
        texto = texto.replace("||METADATOS||", "")
        texto = re.sub(r'\|\|[^|]+\|\|', '', texto)
        texto = re.sub(r'\|\|[A-Za-zÀ-ÿ0-9\s_]+', '', texto) 
        
        # 4. Elimina marcadores específicos solicitados por el usuario
        texto = texto.replace("---PAGINA---", "")
        texto = texto.replace("---PÁGINA---", "") # Por si acaso
        texto = texto.replace("[OBJETO JSON VÁLIDO]", "")
        texto = texto.replace("[INFORME EXTENSO EN MARKDOWN]", "")
        texto = texto.replace("[GUION EN MARKDOWN]", "")
        texto = texto.replace("[RESUMEN EN MARKDOWN]", "")
        texto = texto.replace("[CUESTIONARIO COMPLETO EN MARKDOWN CON LAS 10 PREGUNTAS VISIBLES]", "")
        
        # 5. Elimina líneas de "Tarea X" e instrucciones internas
        texto = re.sub(r'(?im)^.*Tarea \d:.*$', '', texto)
        texto = re.sub(r'(?im)^.*FORMATO REQUERIDO:.*$', '', texto)
        texto = re.sub(r'(?im)^.*TRANSCRIPCIÓN:.*$', '', texto)
        
        # 6. Elimina fugas de campos de metadatos (e.g. "nivel_detalle: Máximo")
        meta_keys = ["nivel_detalle", "temas_clave", "entidades_relevantes", "duración_estimada_relatada", "tema_principal", "sentimiento", "personajes", "genero_sugerido"]
        for key in meta_keys:
            texto = re.sub(r'(?im)^.*' + re.escape(key) + r':.*$', '', texto)

        # 7. Cabeceras de metadatos genéricas
        keywords = ["Metadatos", "Metadata", "Respuesta JSON", "Metadatos de la reunión"]
        for kw in keywords:
            texto = re.sub(r'(?im)^.*' + re.escape(kw) + r'.*$', '', texto)
        
        # 8. Elimina cualquier bloque de llaves remanente al final
        texto = texto.strip()
        while texto.endswith('}') and '{' in texto:
            last_bracket = texto.rfind('{')
            potential_json = texto[last_bracket:].strip()
            if '"' in potential_json and ':' in potential_json:
                texto = texto[:last_bracket].strip()
            else:
                break
        
        # Limpieza final de saltos de línea excesivos
        texto = re.sub(r'\n{3,}', '\n\n', texto)
        
        return texto.strip()

    def generar_resumen_completo(self, transcripcion: str, titulo: str, participantes: list, tipo_audio: str):
        self._ensure_openai_client()
        if not self.use_openai:
            print(f"🏠 Generando análisis local para '{tipo_audio}' (API desactivada)...")
            return self._generar_resumen_local(transcripcion, tipo_audio)

        # Límite de seguridad para el contexto de un solo bloque
        LIMIT_CHUNKING = 25000 
        
        # Selección del modelo desde la configuración (default gpt-4o-mini)
        target_model = self.model
        
        if len(transcripcion) > LIMIT_CHUNKING:
            print(f"🔄 Transcripción muy larga ({len(transcripcion)} caracteres). Iniciando modo 'Map-Reduce'...")
            fragmentos = self._dividir_en_fragmentos(transcripcion, max_chars=18000)
            print(f"📦 Texto dividido en {len(fragmentos)} fragmentos. Procesando resúmenes intermedios...")
            
            resumenes_intermedios = []
            for i, frag in enumerate(fragmentos):
                print(f"  > Procesando fragmento {i+1}/{len(fragmentos)}...")
                resumen_fragmento = self._resumir_fragmento(frag, max_tokens=2000, target_model=target_model)
                resumenes_intermedios.append(resumen_fragmento)
            
            # Unimos los resúmenes para la síntesis final
            print("🔗 Consolidando información para el análisis final...")
            transcripcion_reducida = "\n\n--- SIGUIENTE PARTE DEL AUDIO ---\n\n".join(resumenes_intermedios)
        else:
            transcripcion_reducida = transcripcion

        log_step(f"📝 Generando resumen y metadatos con OpenAI ({target_model}) para un audio de tipo '{tipo_audio}'...")
        
        prompt = self._get_prompt_for_type(tipo_audio, transcripcion_reducida, titulo, participantes)
        prompt = textwrap.dedent(prompt)

        try:
            response = self.client.chat.completions.create(
                model=target_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.8,
                max_tokens=4096,
            )
            
            contenido_respuesta = response.choices[0].message.content
            
            # Estrategia de Extracción: Buscar el ÚLTIMO objeto JSON válido
            import re
            
            # 1. Intentamos usar el separador oficial
            if "||METADATOS||" in contenido_respuesta:
                partes = contenido_respuesta.rsplit("||METADATOS||", 1)
                resumen_md = self._limpiar_markdown(partes[0])
                restante = partes[1].strip()
                
                # Buscamos el objeto JSON dentro del resto
                match = re.search(r'(\{.*\})', restante, re.DOTALL)
                if match:
                    json_str = match.group(1)
                    try:
                        metadatos = json.loads(json_str)
                    except json.JSONDecodeError:
                        # Limpieza extrema de backticks o texto extra
                        clean_json = re.sub(r'^.*?(\{.*\}).*?$', r'\1', json_str, flags=re.DOTALL)
                        try:
                            metadatos = json.loads(clean_json)
                        except:
                            metadatos = {"error": "JSON corrupto tras separador", "raw": json_str}
                else:
                    metadatos = {"error": "Separador hallado pero no objeto JSON", "raw": restante}
            else:
                # 2. Fallback: Escanear todo el mensaje buscando el último bloque JSON funcional
                print("⚠️ Separador ausente. Escaneando bloques JSON...")
                bloques = re.findall(r'(\{.*?\})', contenido_respuesta, re.DOTALL)
                metadatos = {"error": "No se detectó JSON de metadatos"}
                resumen_md = self._limpiar_markdown(contenido_respuesta)
                
                for bloque in reversed(bloques):
                    try:
                        data = json.loads(bloque)
                        # Verificamos que sea el de metadatos (debe tener alguna de estas claves)
                        indicadores = ["preguntas", "tema_principal", "temas_clave", "personajes", "sentimiento"]
                        if any(k in data for k in indicadores):
                            metadatos = data
                            # Limpiamos el resumen quitando este bloque si es posible
                            resumen_md = self._limpiar_markdown(contenido_respuesta.replace(bloque, ""))
                            break
                    except:
                        continue

            print(f"✅ Análisis completado. Tipo: {tipo_audio}, Metadata OK: {not 'error' in metadatos}")
            return resumen_md, metadatos

        except openai.RateLimitError:
            print("⚠️ Rate limit en OpenAI. Usando fallback local.")
            return self._generar_resumen_local(transcripcion, tipo_audio)
        except Exception as e:
            log_step(f"❌ Error en OpenAI en Resumen Acompañado: {e}")
            return self._generar_resumen_local(transcripcion, tipo_audio)
