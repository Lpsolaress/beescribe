// src/pages/HomePage.js

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../api';
import { logout } from '../auth/auth';
import {
  Icon,
  ICONS,
  LoadingScreen,
  HistoryModal,
  AudioTypeModal,
  NotificationsModal
} from '../components/HomePageComponents'; // <-- ¡Importamos desde el nuevo archivo!
import AIChatPanel from '../components/AIChatPanel';
import analisisIcon from '../assets/analisis_icon.png';
import '../App.css';

const HexagonIcon = () => (
  <svg className="w-5 h-5 text-gray-900 fill-current" viewBox="0 0 24 24">
    <path d="M12 2l8.66 5v10L12 22l-8.66-5V7L12 2z" />
  </svg>
);

function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [participants, setParticipants] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const [history, setHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedForChat, setSelectedForChat] = useState([]);
  const [openChatWithSelection, setOpenChatWithSelection] = useState(false);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const response = await apiClient.get("/users/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserProfile(response.data);
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchUserProfile();
  }, [navigate]);

  useEffect(() => {
    if (location.state?.openCreator) {
      setIsTypeModalOpen(true);
      // Limpiar el estado para evitar repeticiones en recargas
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Polling automático si hay algo procesándose
  useEffect(() => {
    const hasActiveProcessing = history.some(h => h.status === 'PROCESSING' || h.status === 'PENDING');
    
    if (hasActiveProcessing) {
      const interval = setInterval(() => {
        fetchHistory();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [history]);

  const fetchHistory = async () => {
    try {
      setIsHistoryLoading(true);
      const response = await apiClient.get('/meetings');
      const formattedHistory = response.data.map(item => ({
        id: item.id,
        title: item.titulo,
        createdAt: item.fecha_creacion,
        status: item.status,
        progress: item.progress || 0
      }));
      setHistory(formattedHistory);
    } catch (err) {
      setError('No se pudo cargar el historial.');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleStartRecording = async () => {
    setFile(null);
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    setAudioPreviewUrl(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => audioChunksRef.current.push(event.data);
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setFile(new File([audioBlob], "grabacion.webm", { type: 'audio/webm' }));
        setAudioPreviewUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('No se pudo acceder al micrófono.');
    }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleDragEvents = (e, dragging) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(dragging);
  };

  const handleDrop = (e) => {
    handleDragEvents(e, false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(URL.createObjectURL(droppedFile));
    }
  };

  const handleInitiateSubmit = (e) => {
    e.preventDefault();
    if (!file) {
      setError('Por favor, selecciona un archivo o realiza una grabación.');
      return;
    }
    setIsTypeModalOpen(true);
    setShowUploadPanel(false); // Cierra el panel de subida para que no tape el siguiente paso
  };

  const processAudio = async (audioType) => {
    setIsTypeModalOpen(false);
    setIsLoading(false); // Ya no bloqueamos la pantalla
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('titulo', title);
    formData.append('participantes', participants);
    formData.append('tipo_audio', audioType);
    if (isScheduled && scheduledAt) {
      formData.append('scheduled_at', new Date(scheduledAt).toISOString());
    }

    try {
      // Mostrar un mensaje temporal o cerrar el panel
      setShowUploadPanel(false);
      
      const response = await apiClient.post('/meetings', formData);
      const status = response.data.status;

      if (status === "SCHEDULED") {
        alert("Reunión programada con éxito.");
      } else {
        // Recargar el historial para que aparezca la nueva reunión "En cola" o "Procesando"
        fetchHistory();
      }
    } catch (err) {
      setError(err.response?.data?.detail || `Error de red: ${err.message}`);
    }
  };

  const handleCancelMeeting = async (meetingId) => {
    try {
      await apiClient.delete(`/meetings/${meetingId}`);
      fetchHistory();
    } catch (err) {
      console.error("Error cancelando reunión:", err);
      setError("No se pudo cancelar la reunión.");
    }
  };

  const handleHistorySearch = async ({ consulta = '', filtros = {} }) => {
    try {
      setIsHistoryLoading(true);
      const activeFilters = Object.fromEntries(Object.entries(filtros).filter(([_, v]) => v != null && v !== ''));
      const response = await apiClient.post('/search', { consulta, filtros: activeFilters });
      const formattedHistory = response.data.resultados.map(item => ({
        id: item.id,
        title: item.titulo,
        createdAt: item.fecha_creacion,
      }));
      setHistory(formattedHistory);
    } catch (err) {
      setError('Error al realizar la búsqueda.');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleSelectFromHistory = (meetingId) => {
    setIsHistoryModalOpen(false);
    navigate(`/results/${meetingId}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-24">
      {isLoading && <LoadingScreen />}
      <div className={isLoading ? 'hidden' : 'block'}>
        <HistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} history={history} onSelect={handleSelectFromHistory} isLoading={isHistoryLoading} onSearch={handleHistorySearch} onResetFilters={fetchHistory} onCancel={handleCancelMeeting} currentUserId={userProfile?.id} />
        <AudioTypeModal isOpen={isTypeModalOpen} onClose={() => setIsTypeModalOpen(false)} onSelectType={processAudio} />
        <NotificationsModal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />

        {/* --- MAIN DASHBOARD VIEW --- */}
        <main className="w-full px-8 py-8">
          {/* Header Layout Mockup */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2.5">
              <div className="bg-amber-400 p-2 rounded-xl shadow-sm flex items-center justify-center">
                <HexagonIcon />
              </div>
              <div>
                <p className="text-gray-400 text-xxs font-semibold">Panel de Control</p>
                <h1 className="text-lg font-bold text-gray-800">
                  Hola, {userProfile && userProfile.email ? userProfile.email.split('@')[0].charAt(0).toUpperCase() + userProfile.email.split('@')[0].slice(1) : 'Usuario'}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-gray-400">
              <button onClick={() => setIsNotificationsOpen(true)} className="hover:text-amber-500 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </button>
              <button onClick={() => navigate('/perfil')} className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-100 shadow-sm flex items-center justify-center">
                <img src={userProfile?.foto_perfil ? `${apiClient.defaults.baseURL.replace('/api', '')}${userProfile.foto_perfil}` : "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80"} alt="Avatar" className="w-full h-full object-cover" />
              </button>
              <button onClick={handleLogout} className="hover:text-red-500 transition-colors">
                <Icon path={ICONS.logout} className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col">
              <span className="p-1.5 bg-amber-50 w-fit rounded-lg text-amber-500 mb-2">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75"/></svg>
              </span>
              <h4 className="text-gray-400 text-xxs font-semibold uppercase tracking-wider">Reuniones totales</h4>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-gray-800">{history.length}</span>
                <span className="text-emerald-500 text-xs font-bold">+100%</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col">
              <span className="p-1.5 bg-amber-50 w-fit rounded-lg text-amber-500 mb-2">
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </span>
              <h4 className="text-gray-400 text-xxs font-semibold uppercase tracking-wider">Minutos ahorrados</h4>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold text-gray-800">{history.length * 35}</span>
                <span className="text-emerald-500 text-xxs font-semibold">+35 min/reunión</span>
              </div>
            </div>
          </div>

          {/* Prompter Yellow Banner */}
          <div className="bg-amber-400 p-5 rounded-2xl shadow-sm mb-6 flex justify-between items-center text-gray-900">
            <div>
              <h2 className="text-lg font-bold">¿Listo para la próxima?</h2>
              <p className="text-xs mt-0.5 opacity-90">Graba y transcribe en tiempo real con Bee-Scribe.</p>
            </div>
            <button onClick={() => setShowUploadPanel(true)} className="bg-gray-800/10 p-3 rounded-full flex items-center justify-center shadow-inner hover:bg-gray-800/20">
              <Icon path={ICONS.mic} className="w-5 h-5 text-gray-900" />
            </button>
          </div>

          {/* Recent Meetings */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-gray-800">Reuniones Recientes</h3>
              <button onClick={() => setIsHistoryModalOpen(true)} className="text-amber-500 text-xs font-bold hover:underline">Ver todas</button>
            </div>
            <div className="space-y-3">
              {history.slice(0, 3).map((item, idx) => (
                <div key={item.id} onClick={() => item.status === 'COMPLETED' && handleSelectFromHistory(item.id)} className={`flex flex-col p-3.5 bg-white rounded-xl border border-gray-50 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${item.status !== 'COMPLETED' ? 'cursor-default opacity-80' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="p-2 bg-gray-50 rounded-lg text-gray-400">
                        <Icon path={ICONS.file} className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="font-semibold text-sm text-gray-800">{item.title}</h4>
                        <p className="text-gray-400 text-xxs mt-0.5">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {item.status === 'COMPLETED' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedForChat.includes(item.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            setSelectedForChat(prev =>
                              prev.includes(item.id) ? prev.filter(x => x !== item.id) : prev.length < 3 ? [...prev, item.id] : prev
                            );
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{ accentColor: '#f59e0b', width: 18, height: 18, cursor: 'pointer' }}
                          title="Seleccionar para analizar con IA"
                        />
                        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                    ) : item.status === 'FAILED' ? (
                      <span className="text-xxs font-bold text-red-400">Error</span>
                    ) : item.status === 'CANCELLED' ? (
                      <span className="text-xxs font-bold text-gray-400">Cancelado</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xxs font-bold text-amber-500 animate-pulse">
                          {item.status === 'PENDING' ? 'En cola' : 'Procesando...'}
                        </span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleCancelMeeting(item.id); }}
                          className="p-1 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-full transition-colors"
                          title="Cancelar"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {(item.status === 'PROCESSING' || item.status === 'PENDING') && (
                    <div className="mt-3">
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-amber-400 h-1.5 rounded-full transition-all duration-700 ease-in-out" 
                          style={{ width: `${item.status === 'PENDING' ? 5 : Math.max(item.progress, 10)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-[9px] text-gray-400 font-medium">
                          {item.status === 'PENDING' ? 'Esperando turno...' : 'Analizando audio y generando resumen...'}
                        </p>
                        <p className="text-[10px] text-amber-600 font-bold">
                          {item.status === 'PENDING' ? '0%' : `${item.progress}%`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {history.length === 0 && <p className="text-center text-gray-400 text-sm">No hay reuniones recientes</p>}
            </div>
          </div>
        </main>

        {/* --- BOTTOM NAVIGATION BAR --- */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-10 py-3 flex justify-between items-center z-40 w-full shadow-2xl rounded-t-3xl">
          <button className="flex flex-col items-center text-amber-500 gap-0.5">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            <span className="text-xxs font-semibold">Inicio</span>
          </button>
          <button onClick={() => navigate('/calendar')} className="flex flex-col items-center text-gray-400 gap-0.5">
            <Icon path={ICONS.calendar} className="w-5 h-5" />
            <span className="text-xxs font-semibold">Calendario</span>
          </button>
          
          <button onClick={() => setShowUploadPanel(true)} className="bg-amber-400 p-4 rounded-full shadow-lg text-gray-900 -translate-y-5 transform hover:scale-105 transition-transform flex items-center justify-center border-4 border-white">
            <svg className="w-6 h-6 fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          </button>

          <button onClick={() => setIsHistoryModalOpen(true)} className="flex flex-col items-center text-gray-400 gap-0.5">
            <img src={analisisIcon} className="w-5 h-5 object-contain opacity-40" alt="Análisis" />
            <span className="text-xxs font-semibold">Análisis</span>
          </button>
          <button onClick={() => navigate('/perfil')} className="flex flex-col items-center text-gray-400 gap-0.5">
            <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span className="text-xxs font-semibold">Perfil</span>
          </button>
        </div>

        {/* --- UPLOAD PANEL OVERLAY --- */}
        {showUploadPanel && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center py-10">
            <div className={`bg-white rounded-t-3xl w-full max-w-md p-6 ${isScheduled ? 'min-h-[60vh]' : ''} max-h-[90vh] overflow-y-auto animate-slide-up shadow-2xl`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">Nueva Reunión</h3>
                <button onClick={() => setShowUploadPanel(false)} className="text-gray-400 p-1.5 hover:bg-gray-100 rounded-full">
                  <Icon path={ICONS.close} className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleInitiateSubmit} className="space-y-6">
                <div onDragEnter={(e) => handleDragEvents(e, true)} onDragOver={(e) => handleDragEvents(e, true)} onDragLeave={(e) => handleDragEvents(e, false)} onDrop={handleDrop} className={`relative p-6 border-2 border-dashed rounded-xl text-center transition-colors ${isDragging ? 'border-amber-500 bg-amber-50' : 'border-gray-200'}`}>
                  <Icon path={ICONS.upload} className="w-10 h-10 text-gray-300 mx-auto" />
                  <p className="mt-3 text-xs text-gray-500">Arrastra un archivo o</p>
                  <label htmlFor="file-upload" className="mt-1 inline-block text-amber-500 font-semibold text-sm hover:underline cursor-pointer">búscalo en tu equipo</label>
                  <input id="file-upload" type="file" onChange={(e) => { handleFileChange(e); }} disabled={isRecording} className="hidden"/>
                  <p className="mt-2 text-xxs text-gray-400">{file && !isRecording ? file.name : 'MP3, WAV, M4A'}</p>
                  
                  <div className="flex items-center my-4"><div className="flex-grow border-t border-gray-100"></div><span className="flex-shrink mx-3 text-gray-300 text-xxs font-semibold">O</span><div className="flex-grow border-t border-gray-100"></div></div>
                  
                  {!isRecording ? (
                    <button type="button" onClick={handleStartRecording} className="inline-flex items-center text-gray-700 font-semibold text-xs border border-gray-200 py-2 px-4 rounded-lg bg-gray-50 hover:bg-gray-100"><Icon path={ICONS.mic} className="w-4 h-4 mr-1.5 text-amber-500" />Grabar ahora</button>
                  ) : (
                    <button type="button" onClick={handleStopRecording} className="inline-flex items-center bg-red-500 text-white font-semibold text-xs py-2 px-4 rounded-lg"><Icon path={ICONS.mic} className="w-4 h-4 mr-1.5" />Detener</button>
                  )}
                </div>

                {isRecording && <div className="text-center text-red-500 text-xs font-semibold animate-pulse">Grabando...</div>}
                {audioPreviewUrl && <audio controls src={audioPreviewUrl} className="w-full h-8 mt-2"></audio>}

                <div className="space-y-3">
                  <div>
                    <label className="text-gray-500 text-xxs font-semibold uppercase">Título</label>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título de la reunión" className="w-full mt-1 p-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"/>
                  </div>
                  <div>
                    <label className="text-gray-500 text-xxs font-semibold uppercase">Participantes</label>
                    <input type="text" value={participants} onChange={(e) => setParticipants(e.target.value)} placeholder="Ej: Ana, Juan" className="w-full mt-1 p-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"/>
                  </div>
                  
                  {/* Nueva sección de programación */}
                  <div className="pt-2 pb-24">
                    <div className="flex items-center gap-2 mb-2">
                      <input 
                        type="checkbox" 
                        id="schedule-toggle" 
                        checked={isScheduled} 
                        onChange={(e) => setIsScheduled(e.target.checked)}
                        className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500 cursor-pointer"
                      />
                      <label htmlFor="schedule-toggle" className="text-gray-700 text-xs font-bold cursor-pointer">
                        Programar para después
                      </label>
                    </div>
                    
                    {isScheduled && (
                      <div className="animate-fade-in">
                        <label className="text-gray-500 text-xxs font-semibold uppercase">Fecha y Hora</label>
                        <input 
                          type="datetime-local" 
                          value={scheduledAt} 
                          onChange={(e) => setScheduledAt(e.target.value)}
                          className="w-full mt-1 p-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <button type="submit" disabled={isLoading || isRecording || !file} className="w-full bg-amber-400 text-gray-900 py-3 rounded-xl font-bold text-sm hover:bg-amber-500 disabled:bg-gray-200 disabled:text-gray-400 shadow-md">
                  Siguiente
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Botón flotante para analizar selección */}
        {selectedForChat.length > 0 && (
          <button
            onClick={() => setOpenChatWithSelection(true)}
            style={{
              position: 'fixed', bottom: 160, right: 32, zIndex: 9999,
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: 'white', border: 'none', borderRadius: 16,
              padding: '12px 20px', fontWeight: 700, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 20px rgba(245,158,11,0.4)',
              cursor: 'pointer'
            }}
          >
            🐝 Analizar {selectedForChat.length} reunión{selectedForChat.length > 1 ? 'es' : ''} con IA
          </button>
        )}

        <AIChatPanel preSelectedIds={openChatWithSelection ? selectedForChat : undefined} autoOpen={openChatWithSelection} onOpened={() => setOpenChatWithSelection(false)} />
      </div>
    </div>

  );
}

export default HomePage;