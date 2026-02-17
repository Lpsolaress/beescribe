from openai import OpenAI
from datetime import datetime
import os
import webbrowser
from dotenv import load_dotenv

class GeneradorMapaMental:
    def __init__(self, api_key):
        self.client = OpenAI(api_key=api_key)
        self.export_folder = "mapas_mentales"
        os.makedirs(self.export_folder, exist_ok=True)
    
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
    
    def generar_mapa_mental(self, texto):
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

Texto: "{texto}"
"""
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,  # Reducido para respuestas más concisas
                temperature=0.3  # Menos creatividad, más precisión
            )
            
            mapa = response.choices[0].message.content
            
            # Generar el código Mermaid a partir del Markdown generado por la IA
            mermaid_code = self.markdown_a_mermaid(mapa)
            
            # Devuelve solo el código Mermaid. React se encargará de renderizarlo.
            return mermaid_code
            
        except Exception as e:
            print(f"❌ Error generando mapa mental: {e}")
            return None  # Devuelve None si hay un error.

if __name__ == "__main__":
    # Cargar desde .env
    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY")
    
    generador = GeneradorMapaMental(api_key)
    
    # Ejemplo de uso
    texto_ejemplo = input("Ingresa el texto para el mapa mental: ")
    if texto_ejemplo:
        generador.generar_mapa_mental(texto_ejemplo)