// src/pages/ResultDetailsPage.js

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';
import apiClient from '../api';
import html2pdf from 'html2pdf.js';
import AIChatPanel from '../components/AIChatPanel';
import '../App.css'; // Asegúrate de que tus estilos base están aquí

// --- Componentes de UI (pueden moverse a un archivo de componentes compartidos) ---
const Icon = ({ path, className = "w-6 h-6" }) => (<svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} /></svg>);
const ICONS = { summary: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", mindmap: "M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122", chevronDown: "M19 9l-7 7-7-7", bolt: "M13 10V3L4 14h7v7l9-11h-7z", question: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", film: "M7 4h10M7 8h10M5 22h14a2 2 0 002-2V4a2 2 0 00-2-2H5a2 2 0 00-2 2v16a2 2 0 002 2z" };

mermaid.initialize({ startOnLoad: true, theme: 'forest', securityLevel: 'loose' });

const customComponents = {
  li: ({ children }) => (
    <li className="flex items-center gap-3 py-1.5 text-gray-700 text-sm">
      <input type="checkbox" className="h-4 w-4 rounded-full border-gray-300 text-amber-500 focus:ring-amber-400 cursor-pointer" />
      <span>{children}</span>
    </li>
  ),
  ul: ({ children }) => <ul className="space-y-2 list-none pl-0">{children}</ul>
};

const AccordionSection = ({ title, icon, children, onPdfClick }) => {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
      <div className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-50 transition-colors">
        <button onClick={() => setIsOpen(!isOpen)} className="flex items-center flex-1 text-left cursor-pointer">
          <Icon path={icon} className="w-6 h-6 text-amber-600 mr-3" />
          <h3 className="text-xl font-semibold text-gray-700">{title}</h3>
        </button>
        <div className="flex items-center gap-4">
          {onPdfClick && (
            <button onClick={(e) => { e.stopPropagation(); onPdfClick(); }} className="flex items-center gap-1 text-amber-600 hover:text-amber-700 font-medium text-sm cursor-pointer">
              <Icon path={ICONS.summary} className="w-4 h-4" /> PDF
            </button>
          )}
          <button onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
            <Icon path={ICONS.chevronDown} className={`w-6 h-6 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
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
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformResult, setTransformResult] = useState(null);
  const [transformError, setTransformError] = useState(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [previewData, setPreviewData] = useState({ title: '', content: '', type: 'markdown' });
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState(null);

  const handleShare = async () => {
    if (!shareEmail) return;
    setIsSharing(true);
    setShareError(null);
    try {
      await apiClient.post(`/meetings/${meetingId}/share`, { email: shareEmail });
      setShowShareModal(false);
      setShareEmail('');
      alert("¡Reunión compartida con éxito!");
    } catch (err) {
      setShareError("No se pudo compartir. Verifica el correo e intenta de nuevo.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownloadPdf = () => {
    const element = document.getElementById('pdf-preview-content');
    if (!element) return;
    
    // Obtener nombre base de la reunión y tipo de reporte
    const meetingTitleRequested = meeting?.title || meetingId || 'analisis';
    const reportType = previewData.title || 'reporte';
    
    // Limpiar caracteres especiales para el nombre de archivo
    const safeTitle = String(meetingTitleRequested).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const safeReport = String(reportType).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${safeTitle}_${safeReport}.pdf`;

    const opt = {
      margin: [0.5, 0.5],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        letterRendering: true
      },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    const originalStyle = element.style.padding;
    element.style.padding = '20px';
    
    html2pdf().from(element).set(opt).save().then(() => {
      element.style.padding = originalStyle;
    });
  };

  const handleOpenPreview = (title, content, type = 'markdown') => {
    setPreviewData({ title, content, type });
    setShowPdfPreview(true);
  };

  const handleTransform = async (tipo) => {
    if (isTransforming) return;
    setIsTransforming(true);
    setTransformError(null);
    try {
      const response = await apiClient.post('/meetings/transform', {
        meeting_id: meetingId,
        tipo_transformacion: tipo
      });
      setTransformResult(response.data); // Guarda en estado para renderizar en la página
    } catch (err) {
      setTransformError(`Error al generar el formato: ${tipo}`);
    } finally {
      setIsTransforming(false);
    }
  };

  useEffect(() => {
    if (showPdfPreview && previewData.type === 'mermaid' && previewData.content) {
      const renderModalMermaid = async () => {
        try {
          const container = document.getElementById('mermaid-preview-container');
          if (container) {
            container.innerHTML = ''; 
            const { svg } = await mermaid.render(`mermaid-svg-modal`, previewData.content);
            container.innerHTML = svg;
          }
        } catch (e) {
          console.error("Error renderizando mermaid en modal:", e);
        }
      };
      setTimeout(renderModalMermaid, 200);
    }
  }, [showPdfPreview, previewData]);

  useEffect(() => {
    const fetchMeetingDetails = async () => {
      if (!meetingId) return;
      try {
        setIsLoading(true);
        const response = await apiClient.get(`/meetings/${meetingId}`);
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
    <div className="min-h-screen bg-gray-50 font-sans pb-24">
      {/* Light Header resembling dashboard */}
      <div className="bg-white px-6 py-4 flex justify-between items-center border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="bg-amber-400 p-2 rounded-xl shadow-sm flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-900 fill-current" viewBox="0 0 24 24"><path d="M12 2l8.66 5v10L12 22l-8.66-5V7L12 2z" /></svg>
          </div>
          <div>
            <p className="text-gray-400 text-xxs font-semibold">Análisis</p>
            <h1 className="text-lg font-bold text-gray-800">Plan de acción</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={() => setShowShareModal(true)} className="bg-amber-400 text-gray-900 px-3.5 py-2 rounded-xl font-bold text-xs shadow-sm hover:bg-amber-500 transition-colors flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            Compartir
          </button>
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-red-500 transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
      </div>

      <main className="w-full px-8 py-6">
        <div className="mt-8 space-y-6 animate-fade-in-up max-w-4xl mx-auto">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">{meeting.title || "Sin título"}</h2>
            <span className="text-xxs text-gray-400 mt-1">{new Date(meeting.createdAt).toLocaleString()}</span>
          </div>
                         <div className="bg-white p-6 rounded-lg shadow-md mt-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Generar nuevo formato:</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl hover:shadow-md transition-shadow cursor-pointer flex flex-col items-center justify-center border border-gray-100 hover:bg-amber-50" onClick={() => handleTransform('breve')}>
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-2">
                        <Icon path={ICONS.bolt} className="w-6 h-6 text-amber-600" />
                      </div>
                      <span className="font-medium text-gray-700 text-sm">Resumen Breve</span>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl hover:shadow-md transition-shadow cursor-pointer flex flex-col items-center justify-center border border-gray-100 hover:bg-amber-50" onClick={() => handleTransform('detallado')}>
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-2">
                        <Icon path={ICONS.summary} className="w-6 h-6 text-amber-600" />
                      </div>
                      <span className="font-medium text-gray-700 text-sm">Informe Detallado</span>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl hover:shadow-md transition-shadow cursor-pointer flex flex-col items-center justify-center border border-gray-100 hover:bg-amber-50" onClick={() => handleTransform('cuestionario')}>
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-2">
                        <Icon path={ICONS.question} className="w-6 h-6 text-amber-600" />
                      </div>
                      <span className="font-medium text-gray-700 text-sm">Cuestionario</span>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl hover:shadow-md transition-shadow cursor-pointer flex flex-col items-center justify-center border border-gray-100 hover:bg-amber-50" onClick={() => handleTransform('guion')}>
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-2">
                        <Icon path={ICONS.film} className="w-6 h-6 text-amber-600" />
                      </div>
                      <span className="font-medium text-gray-700 text-sm">Guion</span>
                    </div>
                  </div>
                  {isTransforming && <p className="text-amber-500 text-sm mt-4 text-center animate-pulse">Generando formato...</p>}
                  {transformError && <p className="text-red-500 text-sm mt-4 text-center">{transformError}</p>}
                </div>

                {transformResult && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-lg font-bold text-gray-800">{transformResult.tipo.charAt(0).toUpperCase() + transformResult.tipo.slice(1)}</h4>
                      <button 
                        onClick={() => handleOpenPreview(transformResult.tipo, transformResult.contenido_md)}
                        className="flex items-center gap-1.5 text-amber-600 hover:text-amber-700 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        <Icon path={ICONS.summary} className="w-4 h-4" /> Vista Previa PDF
                      </button>
                    </div>
                    <div id="transform-content" className="prose prose-indigo max-w-none">
                      <ReactMarkdown components={customComponents}>{transformResult.contenido_md}</ReactMarkdown>
                    </div>
                  </div>
                )}
                
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-bold text-gray-800">Resumen General</h4>
                    <button 
                      onClick={() => handleOpenPreview('Resumen General', meeting.summary)}
                      className="flex items-center gap-1.5 text-amber-600 hover:text-amber-700 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      <Icon path={ICONS.summary} className="w-4 h-4" /> Vista Previa PDF
                    </button>
                  </div>
                  <div id="general-summary-content" className="prose prose-indigo max-w-none">
                    <ReactMarkdown components={customComponents}>{meeting.summary}</ReactMarkdown>
                  </div>
                </div>

                {meeting.mindmap && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mt-6">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-lg font-bold text-gray-800">Mapa Mental</h4>
                      <button 
                        onClick={() => handleOpenPreview('Mapa Mental', meeting.mindmap, 'mermaid')}
                        className="flex items-center gap-1.5 text-amber-600 hover:text-amber-700 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        <Icon path={ICONS.mindmap} className="w-4 h-4" /> Vista Previa PDF
                      </button>
                    </div>
                    <div className="mermaid-container bg-gray-50 p-4 rounded-xl overflow-auto border border-gray-100">
                      <div id={`mermaid-details-${meeting.id}`} className="mermaid"></div>
                    </div>
                  </div>
                )}

                {/* Modal de Vista Previa PDF - Rediseñado Estilo Ventana */}
                {showPdfPreview && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 md:p-8">
                    <div className="bg-[#2a2a2e] rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col border border-white/10 animate-scale-in">
                      
                      {/* Cabecera Tipo Navegador PDF */}
                      <div className="p-3 bg-[#323639] border-b border-black/20 flex justify-between items-center text-white select-none">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 font-medium text-sm truncate max-w-[200px] md:max-w-md">
                            <Icon path={ICONS.summary} className="w-4 h-4 text-amber-400" />
                            <span className="truncate">{meeting?.title || 'Sin título'} - {previewData.title}</span>
                          </div>
                          <div className="hidden md:flex items-center bg-black/20 rounded px-2 py-0.5 text-xs text-gray-300">
                            1 / 1
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <button onClick={() => window.location.reload()} className="p-1.5 hover:bg-white/10 rounded transition-colors" title="Actualizar">
                                <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            </button>
                            <button onClick={handleDownloadPdf} className="p-1.5 hover:bg-white/10 rounded transition-colors" title="Descargar PDF">
                                <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </button>
                            <button className="p-1.5 hover:bg-white/10 rounded transition-colors" title="Imprimir (Próximamente)">
                                <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            </button>
                          </div>
                          
                          <div className="w-px h-4 bg-white/10 mx-1"></div>
                          
                          <button onClick={() => setShowPdfPreview(false)} className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded transition-colors" title="Cerrar">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      </div>
                      
                      {/* Área Principal de Previsualización */}
                      <div className="flex-1 overflow-y-auto bg-[#525659] p-4 md:p-10 flex flex-col items-center relative">
                        
                        {/* Contenido del PDF - Simplificado para coincidir con la UI */}
                        <div 
                          id="pdf-preview-content" 
                          className="bg-white w-full max-w-[800px] shadow-2xl p-8 min-h-[1056px] text-gray-800 animate-slide-up"
                        >
                          <div className="mb-8 block">
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">{previewData.title.toUpperCase()}</h1>
                            <p className="text-sm text-gray-500">{meeting?.title || 'Sin título'}</p>
                            <p className="text-xs text-gray-400 mt-1">{new Date().toLocaleDateString()}</p>
                            <hr className="mt-4 border-gray-100" />
                          </div>

                          <div className="prose prose-sm prose-amber max-w-none leading-relaxed">
                            {previewData.type === 'mermaid' ? (
                              <div id="mermaid-preview-container" className="mermaid flex justify-center py-4">
                                {/* SVG renderizado */}
                              </div>
                            ) : (
                              <ReactMarkdown components={customComponents}>{previewData.content}</ReactMarkdown>
                            )}
                          </div>
                        </div>

                        {/* Botones Flotantes Laterales (Estilo Zoom/Acciones) */}
                        <div className="fixed bottom-20 right-12 flex flex-col gap-3 z-[60]">
                           <button className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:bg-amber-50 transition-colors border border-gray-100">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                           </button>
                           <button className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:bg-amber-50 transition-colors border border-gray-100">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
                           </button>
                           <button onClick={() => navigate('/')} className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:bg-amber-50 transition-colors border border-gray-100">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                           </button>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
        </div>
      </main>

      {/* --- BOTTOM NAVIGATION BAR --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-10 py-3 flex justify-between items-center z-40 w-full shadow-2xl rounded-t-3xl">
        <button className="flex flex-col items-center text-gray-400 gap-0.5" onClick={() => navigate('/')}>
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          <span className="text-xxs font-semibold">Inicio</span>
        </button>
        <button className="flex flex-col items-center text-gray-400 gap-0.5">
          <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
          <span className="text-xxs font-semibold">Calendario</span>
        </button>
        
        <div className="absolute left-1/2 transform -translate-x-1/2 -top-5">
          <button className="bg-amber-400 p-4 rounded-full shadow-lg text-gray-900 hover:scale-105 transition-transform flex items-center justify-center border-4 border-white" onClick={() => navigate('/')}>
            <svg className="w-6 h-6 fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>

        <button className="flex flex-col items-center text-amber-500 gap-0.5">
          <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          <span className="text-xxs font-semibold">Tareas</span>
        </button>
        <button className="flex flex-col items-center text-gray-400 gap-0.5" onClick={() => navigate('/perfil')}>
          <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span className="text-xxs font-semibold">Perfil</span>
        </button>
      </div>

      {/* --- SHARE MODAL --- */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 animate-fade-in shadow-2xl relative">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Compartir Análisis</h3>
            <p className="text-gray-500 text-xs mb-4">Ingresa el correo electrónico de la persona con quien deseas compartir este análisis.</p>
            
            <div className="mb-4">
              <input 
                type="email" 
                placeholder="ejemplo@correo.com" 
                value={shareEmail} 
                onChange={(e) => setShareEmail(e.target.value)} 
                className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:border-amber-400"
              />
              {shareError && <p className="text-red-500 text-xxs mt-1">{shareError}</p>}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowShareModal(false)} 
                className="flex-1 py-3 rounded-xl font-bold text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                disabled={isSharing}
              >
                Cancelar
              </button>
              <button 
                onClick={handleShare} 
                disabled={isSharing || !shareEmail}
                className="flex-1 py-3 rounded-xl font-bold text-xs bg-amber-400 text-gray-900 shadow-sm hover:bg-amber-500 transition-colors disabled:opacity-50"
              >
                {isSharing ? 'Compartiendo...' : 'Compartir'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AIChatPanel 
        meetingId={meetingId} 
        initialMessage={`¡Hola! Estoy listo para ayudarte con los detalles de "${meeting?.title || 'esta reunión'}". ¿Quieres que te explique algún punto o que redacte algo basado en lo hablado? 🐝`}
      />
    </div>
  );
}

export default ResultDetailsPage;