from openai import OpenAI
from datetime import datetime
import os
import webbrowser
from dotenv import load_dotenv

class GeneradorMapaMental:
    def __init__(self, api_key):
        base_flag = os.getenv("USE_OPENAI_API", "False")
        mindmap_flag = os.getenv("USE_OPENAI_MINDMAP", base_flag)
        self.use_openai = mindmap_flag.lower() == "true"
        self.api_key = api_key
        self.client = None
        self.export_folder = "mapas_mentales"
        os.makedirs(self.export_folder, exist_ok=True)
    
    def _ensure_client(self):
        if not self.use_openai or self.client is not None:
            return
        try:
            # Lazy initialization to avoid SSLError during startup on some systems
            self.client = OpenAI(api_key=self.api_key)
        except Exception as e:
            print(f"❌ Error al inicializar el cliente de OpenAI en MapaMental: {e}")
            self.use_openai = False
            self.client = None
    
    def markdown_a_mermaid(self, texto_md):
        graph_lines = ["graph LR"]
        id_counter = 0
        
        def make_id():
            nonlocal id_counter
            id_counter += 1
            return f"n{id_counter}"
        
        last_ids_by_level = {0: "root"}
        graph_lines.append('root["💡 Ideas Principales"]')
        
        for line in texto_md.splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or stripped.startswith("**Texto original:**"):
                continue
            
            if stripped.startswith("- "):
                stripped = stripped[2:]
            elif stripped.startswith("* "):
                stripped = stripped[2:]
            
            indent = len(line) - len(line.lstrip())
            level = indent // 4 + 1
            
            # Limpiar y acortar texto del nodo
            node_text = stripped.replace('"', "'").strip()
            if len(node_text) > 40:  # Limitar longitud
                node_text = node_text[:37] + "..."
            
            current_id = make_id()
            graph_lines.append(f'{current_id}["{node_text}"]')
            parent_id = last_ids_by_level.get(level - 1, "root")
            graph_lines.append(f"{parent_id} --> {current_id}")
            last_ids_by_level[level] = current_id
        
        return "\n".join(graph_lines)
    
    def _generar_mapa_local(self, texto):
        """Genera un mapa mental básico basado en palabras clave para el modo local."""
        palabras = texto.replace(".", "").replace(",", "").split()
        # Filtrar palabras cortas (probablemente stopwords)
        palabras_clave = [p for p in palabras if len(p) > 5][:5]
        
        if not palabras_clave:
            palabras_clave = ["Sin", "Palabras", "Clave", "Detectadas"]

        # Mock Mermaid Code dinámico
        mock_mermaid = "graph TD\n"
        mock_mermaid += '    root[Tema Detectado]\n'
        
        for i, palabra in enumerate(palabras_clave):
            mock_mermaid += f'    root --> N{i}[{palabra}]\n'
        
        return mock_mermaid

    def generar_html_mermaid(self, mermaid_code, filename):
        contenido_html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
    mermaid.initialize({{ startOnLoad: true }});
  </script>
  <style>
    body {{
      font-family: sans-serif;
      background-color: #fdfdfd;
      padding: 2rem;
    }}
    .mermaid {{
      font-size: 16px;
      min-width: 1000px;
    }}
  </style>
</head>
<body>
  <h1>🧠 Mapa Mental</h1>
  <div style="overflow-x: auto;">
    <pre class="mermaid">
{mermaid_code}
    </pre>
  </div>
</body>
</html>
"""
        with open(filename, "w", encoding="utf-8") as f:
            f.write(contenido_html)

    def _dividir_en_fragmentos(self, texto: str, max_chars: int = 18000) -> list:
        """Divide un texto largo en fragmentos más pequeños, manejando bloques sin saltos de línea."""
        if not texto:
            return []
            
        fragmentos = []
        actual = []
        caracteres_actual = 0
        lineas = texto.split('\n')
        
        for linea in lineas:
            if len(linea) > max_chars:
                if actual:
                    fragmentos.append('\n'.join(actual))
                    actual = []
                    caracteres_actual = 0
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

    def _extraer_ideas_fuerza(self, fragmento: str) -> str:
        """Extrae los conceptos clave de un fragmento para el mapa mental."""
        prompt = f"""
        Identifica los conceptos, decisiones y temas más importantes del siguiente fragmento de audio.
        Escribe una lista corta de puntos clave (máximo 10 puntos).
        
        TEXTO:
        ---
        {fragmento}
        ---
        """
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=400,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"⚠️ Error al extraer ideas del fragmento: {e}")
            return fragmento[:500]

    def generar_mapa_mental(self, texto):
        self._ensure_client()
        if not self.use_openai:
            print("🏠 Generando mapa mental local (API desactivada)...")
            return self._generar_mapa_local(texto)

        # Límite de seguridad para el contexto de un solo bloque
        LIMIT_CHUNKING = 25000 
        
        if len(texto) > LIMIT_CHUNKING:
            print(f"🔄 Texto muy largo para el mapa mental ({len(texto)} caracteres). Iniciando modo 'Map-Reduce'...")
            fragmentos = self._dividir_en_fragmentos(texto, max_chars=18000)
            print(f"📦 Procesando {len(fragmentos)} bloques para extraer ideas clave...")
            
            ideas_consolidadas = []
            for i, frag in enumerate(fragmentos):
                print(f"  > Bloque {i+1}/{len(fragmentos)}...")
                ideas_consolidadas.append(self._extraer_ideas_fuerza(frag))
            
            texto_para_mapa = "\n\n".join(ideas_consolidadas)
            print("🔗 Ideas consolidadas. Generando estructura final del mapa...")
        else:
            texto_para_mapa = texto

        prompt = f"""
Crea un mapa mental CONCISO del siguiente texto. 

REGLAS ESTRICTAS:
- Solo ideas CLAVE, sin repeticiones
- Máximo 3 niveles de profundidad
- Frases cortas (máximo 5 palabras por idea)
- Sin explicaciones adicionales
- Formato: líneas con guiones y sangrías

Ejemplo de formato:
- Idea principal 1
    - Subtema A
    - Subtema B
- Idea principal 2
    - Subtema C

Texto: "{texto_para_mapa}"
"""
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,
                temperature=0.3
            )
            
            mapa = response.choices[0].message.content
            mermaid_code = self.markdown_a_mermaid(mapa)
            return mermaid_code
        
        except Exception as e:
            import openai
            error_str = str(e)
            
            # Manejo específico de errores comunes de OpenAI
            if isinstance(e, openai.BadRequestError) and "context_length" in error_str:
                print("⚠️ Error de longitud de contexto en OpenAI. Usando fallback local.")
            elif "429" in error_str or "quota" in error_str.lower():
                print("⚠️ Cuota excedida en OpenAI. Usando fallback local.")
            else:
                print(f"❌ Error inesperado en OpenAI: {e}")
                
            return self._generar_mapa_local(texto)

if __name__ == "__main__":
    # Cargar desde .env
    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY")
    
    generador = GeneradorMapaMental(api_key)
    
    # Ejemplo de uso
    texto_ejemplo = input("Ingresa el texto para el mapa mental: ")
    if texto_ejemplo:
        generador.generar_mapa_mental(texto_ejemplo)
