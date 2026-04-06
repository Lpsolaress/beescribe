import React, { useState, useRef, useEffect } from 'react';
import apiClient from '../api';
import { useNavigate } from 'react-router-dom';

// --- COMPONENTES Y CONSTANTES DE UI ---

export const Icon = ({ path, className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
  </svg>
);

export const BeeIcon = ({ className }) => (
// Un SVG de una abeja más simple y amigable
<svg className={className} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    {/* Ala */}
    <path d="M 60 25 C 85 5, 85 55, 60 55" fill="#BEE8F9" stroke="#555" strokeWidth="2"/>
    {/* Cuerpo de la abeja */}
    <ellipse cx="50" cy="50" rx="25" ry="20" fill="#FFD700" stroke="#000" strokeWidth="2.5" />
    {/* Rayas */}
    <path d="M 40 33 Q 42 50 40 67" stroke="#000" strokeWidth="5" fill="none" strokeLinecap="round" />
    <path d="M 52 31 Q 54 50 52 69" stroke="#000" strokeWidth="5" fill="none" strokeLinecap="round" />
    {/* Cara */}
    <circle cx="72" cy="48" r="8" fill="#000" />
    {/* Aguijón */}
    <path d="M 25 50 L 15 50" stroke="#000" strokeWidth="3" strokeLinecap="round" />
</svg>
);

export const ICONS = { calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", upload: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12", mic: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z", history: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", close: "M6 18L18 6M6 6l12 12", meeting: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z", podcast: "M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.636 5.636a9 9 0 0112.728 0M18.364 18.364A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636", conversation: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", file: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z", logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" };

const HistoryFilters = ({ onFilterChange, onReset }) => {
  const [filters, setFilters] = useState({ fecha_inicio: '', fecha_fin: '', metadatos: '' });
  const handleChange = (e) => { setFilters({ ...filters, [e.target.name]: e.target.value }); };
  const handleApply = () => { onFilterChange(filters); };
  const handleReset = () => {
    setFilters({ fecha_inicio: '', fecha_fin: '', metadatos: '' });
    onReset();
  }; // El error de sintaxis estaba aquí (faltaba este ';')

  return (
    <div className="p-4 bg-gray-700 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-xs text-gray-400 mb-1">Desde</label><input type="date" name="fecha_inicio" value={filters.fecha_inicio} onChange={handleChange} className="w-full bg-gray-800 border-gray-600 text-white rounded-md text-sm p-2"/></div>
        <div><label className="block text-xs text-gray-400 mb-1">Hasta</label><input type="date" name="fecha_fin" value={filters.fecha_fin} onChange={handleChange} className="w-full bg-gray-800 border-gray-600 text-white rounded-md text-sm p-2"/></div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Buscar en Metadatos</label>
        <input type="text" name="metadatos" placeholder="Ej: 'Juan', 'Proyecto X'..." value={filters.metadatos} onChange={handleChange} className="w-full bg-gray-800 border-gray-600 text-white rounded-md text-sm p-2"/>
      </div>
      <div className="flex justify-end space-x-2">
        <button onClick={handleReset} className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded-md text-sm">Limpiar</button>
        <button onClick={handleApply} className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-black rounded-md text-sm font-semibold">Aplicar Filtros</button>
      </div>
    </div>
  );
};

export const HistoryModal = ({ isOpen, onClose, history, onSelect, selectedId, isLoading, onSearch, onResetFilters, onCancel, currentUserId }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTab, setCurrentTab] = useState('mias');

  // Filtrar el historial según la pestaña seleccionada y el ID del usuario
  const filteredHistory = history.filter(item => {
    if (currentTab === 'mias') {
      // Es mía si coincide el ID, o si no tiene user_id (por retrocompatibilidad)
      return item.user_id === currentUserId || !item.user_id;
    } else {
      // Es compartida si el creador es diferente
      return item.user_id !== currentUserId && item.user_id;
    }
  });

  const handleSearch = (e) => { if (e.key === 'Enter') { onSearch({ consulta: searchTerm, filtros: {} }); } };
  const handleFilterChange = (nuevosFiltros) => { onSearch({ consulta: searchTerm, filtros: nuevosFiltros }); };
  const handleReset = () => { setSearchTerm(''); onResetFilters(); };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col p-8 animate-fade-in shadow-2xl relative" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-extrabold text-gray-800">Historial</h3>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowFilters(!showFilters)} className="text-gray-400 text-xs font-bold hover:text-amber-500">Filtros</button>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 text-gray-400"><Icon path={ICONS.close} className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-gray-50 p-1 rounded-2xl mb-5 gap-1 border border-gray-100/50">
          <button onClick={() => setCurrentTab('mias')} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all ${currentTab === 'mias' ? 'bg-amber-400 text-gray-900 shadow-sm' : 'text-gray-400 hover:bg-gray-100/50'}`}>Mías</button>
          <button onClick={() => setCurrentTab('compartidas')} className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all ${currentTab === 'compartidas' ? 'bg-amber-400 text-gray-900 shadow-sm' : 'text-gray-400 hover:bg-gray-100/50'}`}>Compartidas</button>
        </div>

        {/* Search Bar */}
        <div className="mb-5">
          <input type="text" placeholder="Buscar por título o contenido" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={handleSearch} className="w-full bg-transparent border-0 border-b border-gray-200 text-gray-800 p-2 text-sm focus:outline-none focus:border-amber-400 placeholder-gray-300"/>
        </div>

        {showFilters && <HistoryFilters onFilterChange={handleFilterChange} onReset={handleReset} />}

        {/* Content list */}
        <div className="flex-1 overflow-y-auto pr-1">
          {isLoading ? (
            <p className="text-center text-gray-400 text-xs mt-8">Cargando...</p>
          ) : filteredHistory.length > 0 ? (
            <div className="space-y-4">
              {filteredHistory.map(item => (
                <div key={item.id} onClick={() => item.status === 'COMPLETED' && onSelect(item.id)} className={`py-3 border-b border-gray-100 flex flex-col transition-colors ${selectedId === item.id ? 'bg-amber-50/50 rounded-xl px-2' : 'hover:bg-gray-50/50'} ${item.status !== 'COMPLETED' ? 'cursor-default opacity-80' : 'cursor-pointer'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <strong className="text-base font-bold text-gray-800">{item.title || "Análisis sin título"}</strong>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleString()}</span>
                        {item.status !== 'COMPLETED' && (
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${item.status === 'FAILED' ? 'text-red-400' : item.status === 'CANCELLED' ? 'text-gray-400' : 'text-amber-500 animate-pulse'}`}>
                            {item.status === 'PENDING' ? 'En cola' : item.status === 'FAILED' ? 'Error' : item.status === 'CANCELLED' ? 'Cancelado' : 'Procesando'}
                          </span>
                        )}
                      </div>
                    </div>
                    {item.status === 'COMPLETED' ? (
                      <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    ) : (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onCancel && onCancel(item.id); }}
                        className="p-1.5 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-full transition-colors"
                        title="Cancelar"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                  
                  {(item.status === 'PROCESSING' || item.status === 'PENDING') && (
                    <div className="mt-2 w-full pr-4">
                      <div className="w-full bg-gray-100 rounded-full h-1">
                        <div 
                          className="bg-amber-400 h-1 rounded-full transition-all duration-500" 
                          style={{ width: `${item.status === 'PENDING' ? 5 : item.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 text-xs py-12">No se encontraron resultados.</p>
          )}
        </div>

        {/* Floating Add icon inside Modal matching mockup visuals setup properly correctly setup framing */}
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10">
          <button className="bg-amber-400 p-4 rounded-full shadow-lg text-gray-900 hover:scale-105 transition-transform flex items-center justify-center border-4 border-white">
            <svg className="w-6 h-6 fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>

      </div>
    </div>
  );
};

export const AudioTypeModal = ({ isOpen, onClose, onSelectType }) => {
  if (!isOpen) return null;
  const types = [{ key: 'reunion', label: 'Reunión de Trabajo', icon: ICONS.meeting }, { key: 'podcast', label: 'Podcast o Entrevista', icon: ICONS.podcast }, { key: 'conversacion', label: 'Conversación Informal', icon: ICONS.conversation }, { key: 'audio_normal', label: 'Otro (Genérico)', icon: ICONS.file }];
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex justify-center items-center" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-slide-up relative" onClick={e => e.stopPropagation()}>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Un último paso...</h3>
        <p className="text-gray-600 mb-6">¿Qué tipo de audio estás analizando? Esto nos ayuda a darte el mejor resultado.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {types.map((type) => (<button key={type.key} onClick={() => onSelectType(type.key)} className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-amber-50 hover:border-amber-400 hover:shadow-lg transition-all transform hover:-translate-y-1"><Icon path={type.icon} className="w-10 h-10 text-amber-500 mb-2" /><span className="font-semibold text-gray-700">{type.label}</span></button>))}
        </div>
      </div>
    </div>
  );
};

export const NewMeetingModal = ({ isOpen, onClose, onSuccess, initialDate }) => {
  const [step, setStep] = useState(1); // 1: Detalles, 2: Tipo de Audio
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [participants, setParticipants] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Estados para programación
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');

  // Efecto para sincronizar con la fecha seleccionada en el calendario
  useEffect(() => {
    if (isOpen && initialDate) {
      setIsScheduled(true);
      const d = new Date(initialDate);
      const now = new Date();
      d.setHours(now.getHours() + 1, 0, 0, 0); // Default a la siguiente hora
      setScheduledAt(d.toISOString().slice(0, 16));
    } else if (isOpen) {
      setIsScheduled(false);
      setScheduledAt('');
    }
  }, [isOpen, initialDate]);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const types = [
    { key: 'reunion', label: 'Reunión de Trabajo', icon: ICONS.meeting },
    { key: 'podcast', label: 'Podcast o Entrevista', icon: ICONS.podcast },
    { key: 'conversacion', label: 'Conversación Informal', icon: ICONS.conversation },
    { key: 'otro', label: 'Otro (Genérico)', icon: ICONS.file }
  ];

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleStartRecording = async () => {
    setError(null);
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

  const handleSubmit = async (selectedType) => {
    if (!file) {
      setError('Por favor, selecciona un archivo o realiza una grabación.');
      return;
    }
    setIsLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('titulo', title || "Reunión sin título");
    formData.append('participantes', participants);
    formData.append('tipo_audio', selectedType); 
    if (isScheduled && scheduledAt) {
      formData.append('scheduled_at', new Date(scheduledAt).toISOString());
    }

    try {
      const response = await apiClient.post('/meetings', formData);
      if (onSuccess) onSuccess(response.data.id);
    } catch (err) {
      console.error("DEBUG Error handleSubmit:", err);
      const detail = err.response?.data?.detail;
      setError(detail || 'Error al procesar la reunión.');
      setStep(1); // Volver al paso 1 para que el usuario pueda ver el error y corregir campos si es necesario
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md p-6 animate-fade-in relative shadow-2xl" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xl font-extrabold text-gray-800">{step === 1 ? "Nueva Reunión" : "Un último paso..."}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 text-gray-400">
            <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {step === 1 ? (
          <>
            {/* Upload Box */}
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center mb-5 bg-gray-50/50 hover:bg-gray-50 transition-colors relative">
              <input type="file" id="audio-upload-modal" accept="audio/*" onChange={handleFileChange} className="hidden" />
              <label htmlFor="audio-upload-modal" className="cursor-pointer flex flex-col items-center">
                <svg className="w-10 h-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                <span className="text-xs text-gray-400">Arrastra un archivo o</span>
                <span className="text-xs font-bold text-amber-500 mt-0.5">búscalo en tu equipo</span>
                <span className="text-xxs text-gray-300 mt-1">MP3, WAV, M4A</span>
              </label>

              {file && (
                <div className="mt-2 text-xxs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button onClick={() => setFile(null)} className="text-gray-400 hover:text-red-400">✕</button>
                </div>
              )}

              <div className="w-full flex items-center gap-2 my-2 mt-4">
                <div className="flex-1 border-b border-gray-100"></div>
                <span className="text-xxs text-gray-300 font-bold">o</span>
                <div className="flex-1 border-b border-gray-100"></div>
              </div>

              <button type="button" onClick={isRecording ? handleStopRecording : handleStartRecording} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-sm ${isRecording ? 'border-red-200 bg-red-50 text-red-600 animate-pulse' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`} >
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 10.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 003-3v-6a3 3 0 00-6 0v6a3 3 0 003 3z" /></svg>
                {isRecording ? 'Detener' : 'Grabar ahora'}
              </button>
            </div>

            {/* Inputs */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xxs font-extrabold text-gray-400 mb-1 uppercase tracking-wider">Título de la Reunión</label>
                <input type="text" placeholder="Ej: Sesión de Estrategia" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-gray-50/50 border border-gray-100 rounded-xl p-3 text-xs font-bold focus:outline-none focus:border-amber-400 placeholder-gray-300" />
              </div>
              <div>
                <label className="block text-xxs font-extrabold text-gray-400 mb-1 uppercase tracking-wider">Participantes</label>
                <input type="text" placeholder="Ej: Ana, Juan" value={participants} onChange={(e) => setParticipants(e.target.value)} className="w-full bg-gray-50/50 border border-gray-100 rounded-xl p-3 text-xs font-bold focus:outline-none focus:border-amber-400 placeholder-gray-300" />
              </div>
            </div>
            
            {/* Programar para después */}
            <div className="flex items-center gap-3 mb-5 p-3.5 bg-gray-50 rounded-2xl border border-gray-100/50 w-full hover:bg-gray-100 transition-colors">
              <div className="flex items-center h-5">
                <input
                  id="scheduled-checkbox-modal"
                  type="checkbox"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                  className="w-5 h-5 text-amber-500 border-gray-300 rounded-lg focus:ring-amber-500 focus:ring-offset-0 cursor-pointer accent-amber-500"
                />
              </div>
              <div className="ml-1 text-sm text-left">
                <label htmlFor="scheduled-checkbox-modal" className="font-extrabold text-gray-700 cursor-pointer text-[11px] uppercase tracking-tight">Programar para después</label>
                <p className="text-gray-400 text-[10px]">Sube el audio ahora y Bee-Scribe lo procesará luego.</p>
              </div>
            </div>

            {isScheduled && (
              <div className="mb-5 animate-fade-in w-full text-left p-1">
                <label className="block text-[10px] font-extrabold text-gray-400 mb-1.5 uppercase tracking-widest ml-1">Fecha y Hora de Proceso</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="block w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500/10 focus:border-amber-400 transition-all cursor-pointer"
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            )}

            {error && <p className="text-xxs text-red-500 mb-2">{error}</p>}

            <button onClick={() => setStep(2)} disabled={!file} className="w-full bg-gray-100 text-gray-400 py-3 rounded-2xl font-bold text-sm transition-colors hover:bg-amber-400 hover:text-gray-900 disabled:bg-gray-100 disabled:text-gray-300" style={file ? { backgroundColor: '#fbbf24', color: '#111827' } : {}} >
              Siguiente
            </button>
          </>
        ) : (
          <>
            <p className="text-gray-500 text-xs mb-5">¿Qué tipo de audio estás analizando? Esto nos ayuda a darte el mejor resultado.</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {types.map((type) => (
                <button key={type.key} onClick={() => handleSubmit(type.key)} disabled={isLoading} className="flex flex-col items-center justify-center p-4 border border-gray-100 rounded-2xl hover:bg-amber-50 hover:border-amber-400 hover:shadow-lg transition-all transform hover:-translate-y-1 bg-gray-50/50">
                  <Icon path={type.icon} className="w-8 h-8 text-amber-500 mb-2" />
                  <span className="font-bold text-gray-700 text-xs">{type.label}</span>
                </button>
              ))}
            </div>
            {isLoading && <p className="text-center text-gray-500 text-xs animate-pulse">Procesando audio...</p>}
            {error && <p className="text-xxs text-red-500 mb-2 text-center">{error}</p>}
            <button onClick={() => setStep(1)} className="w-full text-center text-gray-400 text-xxs mt-2 hover:underline">Volver</button>
          </>
        )}

      </div>
    </div>
  );
};

export const LoadingScreen = () => (
  <div className="fixed inset-0 bg-gray-900 bg-opacity-90 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
    <BeeIcon className="w-48 h-48 animate-float" />
    <h2 className="text-4xl font-bold text-amber-400 mt-4 animate-pulse">Bee-Scribe</h2>
    <p className="text-white text-lg mt-2">Extrayendo la miel de tu audio...</p>
  </div>
);
export const NotificationsModal = ({ isOpen, onClose }) => {
  const [scheduledMeetings, setScheduledMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchScheduled();
    }
  }, [isOpen]);

  const fetchScheduled = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/meetings');
      // Filtrar por estado SCHEDULED
      const scheduled = response.data.filter(m => m.status === 'SCHEDULED');
      setScheduledMeetings(scheduled);
    } catch (err) {
      console.error("Error fetching scheduled meetings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 relative shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-gray-800">Notificaciones</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
            <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-xxs font-extrabold text-gray-500 tracking-wider mb-2">PRÓXIMAS PROGRAMADAS</h4>
            <div className="flex flex-col gap-2">
              {isLoading ? (
                <p className="text-xxs text-gray-400">Cargando...</p>
              ) : scheduledMeetings.length > 0 ? (
                scheduledMeetings.map(m => (
                  <div key={m.id} className="bg-gray-50 rounded-2xl p-3 border border-gray-100 flex flex-col gap-1">
                    <h5 className="text-xs font-bold text-gray-800">{m.titulo}</h5>
                    <span className="text-xxs text-gray-400">
                      {new Date(m.scheduled_at).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-xxs font-semibold">No tienes reuniones programadas.</p>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-xxs font-extrabold text-gray-500 tracking-wider mb-2 mt-4">COMPARTIDAS CONTIGO</h4>
            <p className="text-gray-400 text-xxs font-semibold">No se te han compartido reuniones.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
