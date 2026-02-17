// src/pages/ResultDetailsPage.js

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';
import apiClient from '../api';
import '../App.css'; // Asegúrate de que tus estilos base están aquí

// --- Componentes de UI (pueden moverse a un archivo de componentes compartidos) ---
const Icon = ({ path, className = "w-6 h-6" }) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} /></svg> );
const ICONS = { summary: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", mindmap: "M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122", chevronDown: "M19 9l-7 7-7-7" };

mermaid.initialize({ startOnLoad: true, theme: 'forest', securityLevel: 'loose' });

const AccordionSection = ({ title, icon, children }) => {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
        <div className="flex items-center">
          <Icon path={icon} className="w-6 h-6 text-amber-600 mr-3" />
          <h3 className="text-xl font-semibold text-gray-700">{title}</h3>
        </div>
        <Icon path={ICONS.chevronDown} className={`w-6 h-6 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-6 border-t">{children}</div>
      </div>
    </div>
  );
};

function ResultDetailsPage() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMeetingDetails = async () => {
      if (!meetingId) return;
      try {
        setIsLoading(true);
        const response = await apiClient.get(`/api/meetings/${meetingId}`);
        const data = response.data;
        setMeeting({
          id: data.id,
          title: data.titulo,
          summary: data.resumen_md,
          mindmap: data.mapa_mermaid,
          createdAt: data.fecha_creacion,
        });
      } catch (err) {
        setError('No se pudo cargar el análisis. Es posible que no exista o haya ocurrido un error.');
        console.error("Error fetching meeting details:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMeetingDetails();
  }, [meetingId]);

  useEffect(() => {
    if (meeting && meeting.mindmap) {
      const renderMermaid = async () => {
        try {
          const container = document.getElementById(`mermaid-details-${meeting.id}`);
          if (container) {
            container.innerHTML = ''; // Limpiar antes de renderizar
            const { svg } = await mermaid.render(`mermaid-svg-${meeting.id}`, meeting.mindmap);
            container.innerHTML = svg;
          }
        } catch (e) {
          console.error("Error renderizando el diagrama de Mermaid:", e);
          const container = document.getElementById(`mermaid-details-${meeting.id}`);
          if (container) container.innerHTML = '<p class="text-red-500">Error al renderizar el mapa mental.</p>';
        }
      };
      // Usar un pequeño retraso para asegurar que el DOM esté listo
      setTimeout(renderMermaid, 100);
    }
  }, [meeting]);

  if (isLoading) {
    return <div className="text-center p-10">Cargando detalles del análisis...</div>;
  }

  if (error) {
    return (
      <div className="text-center p-10 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-red-600">Error</h2>
        <p className="mt-4 text-gray-600">{error}</p>
        <button onClick={() => navigate('/')} className="mt-6 px-4 py-2 bg-amber-500 text-black rounded-md hover:bg-amber-600">
          Volver a la página principal
        </button>
      </div>
    );
  }

  if (!meeting) {
    return <div className="text-center p-10">No se encontró el análisis.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100">
        <nav className="bg-gray-800 text-white shadow-md">
            <div className="container mx-auto px-6 py-3 flex justify-between items-center">
                <h1 className="text-xl font-bold text-amber-400">Bee-Scribe</h1>
                <button onClick={() => navigate('/')} className="px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors">
                    ← Volver a Inicio
                </button>
            </div>
        </nav>
        <main className="container mx-auto px-6 py-10">
            <div className="mt-12 space-y-6 animate-fade-in-up max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-gray-800 border-b-2 border-amber-400 pb-3">
                    Análisis de: <span className="text-gray-600">{meeting.title || `Reunión ID ${meeting.id}`}</span>
                </h2>
                <AccordionSection title="Resumen" icon={ICONS.summary}>
                    <div className="prose prose-indigo max-w-none">
                        <ReactMarkdown>{meeting.summary}</ReactMarkdown>
                    </div>
                </AccordionSection>
                {meeting.mindmap && (
                    <AccordionSection title="Mapa Mental" icon={ICONS.mindmap}>
                        <div className="mermaid-container bg-gray-50 p-4 rounded-md overflow-auto">
                            <div id={`mermaid-details-${meeting.id}`} className="mermaid">
                                {/* Mermaid se renderizará aquí */}
                            </div>
                        </div>
                    </AccordionSection>
                )}
            </div>
        </main>
    </div>
  );
}

export default ResultDetailsPage;