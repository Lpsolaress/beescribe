// src/pages/HomePage.js

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api';
import { logout } from '../auth/auth';
import {
  Icon,
  ICONS,
  LoadingScreen,
  HistoryModal,
  AudioTypeModal
} from '../components/HomePageComponents'; // <-- ¡Importamos desde el nuevo archivo!
import '../App.css';

function HomePage() {
  const navigate = useNavigate();
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

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setIsHistoryLoading(true);
      const response = await apiClient.get('/api/meetings');
      const formattedHistory = response.data.map(item => ({
        id: item.id,
        title: item.titulo,
        createdAt: item.fecha_creacion,
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
  };

  const processAudio = async (audioType) => {
    setIsTypeModalOpen(false);
    setIsLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('titulo', title);
    formData.append('participantes', participants);
    formData.append('tipo_audio', audioType);

    try {
      const response = await apiClient.post('/api/meetings', formData);
      await fetchHistory();
      navigate(`/results/${response.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || `Error de red: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHistorySearch = async ({ consulta = '', filtros = {} }) => {
    try {
      setIsHistoryLoading(true);
      const activeFilters = Object.fromEntries(Object.entries(filtros).filter(([_, v]) => v != null && v !== ''));
      const response = await apiClient.post('/api/search', { consulta, filtros: activeFilters });
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
    <div className="min-h-screen bg-slate-100 font-sans text-gray-900">
      {isLoading && <LoadingScreen />}
      <div className={isLoading ? 'hidden' : 'block'}>
        <nav className="bg-gray-800 text-white shadow-lg sticky top-0 z-10">
          <div className="container mx-auto px-6 py-3 flex justify-between items-center">
            <h1 className="text-xl font-bold text-amber-400 flex items-center gap-2">
            <img src="logoabeja3.png" alt="Logo abeja" className="h-12 w-12" />Bee-Scribe</h1>
            <div className="flex items-center space-x-4">
              <button onClick={() => navigate('/calendar')} className="flex items-center px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors">
                <Icon path={ICONS.calendar} className="w-5 h-5 mr-2" /> Calendario
              </button>
              <button onClick={() => { fetchHistory(); setIsHistoryModalOpen(true); }} className="flex items-center px-4 py-2 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors">
                <Icon path={ICONS.history} className="w-5 h-5 mr-2" /> Historial
              </button>
              <button onClick={handleLogout} className="flex items-center px-4 py-2 bg-red-600 rounded-md hover:bg-red-700 transition-colors">
                <Icon path={ICONS.logout} className="w-5 h-5 mr-2" /> Cerrar Sesión
              </button>
            </div>
          </div>
        </nav>

        <HistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} history={history} onSelect={handleSelectFromHistory} isLoading={isHistoryLoading} onSearch={handleHistorySearch} onResetFilters={fetchHistory} />
        <AudioTypeModal isOpen={isTypeModalOpen} onClose={() => setIsTypeModalOpen(false)} onSelectType={processAudio} />

        <main className="container mx-auto px-6 py-10">
          <header className="text-center mb-12">
            <h1 className="text-5xl font-extrabold text-gray-800 tracking-tight">Analizador de Audio <span className="text-amber-500">Bee-Scribe</span></h1>
            <p className="mt-4 text-xl text-gray-500 max-w-3xl mx-auto">Extrae la miel de tus conversaciones. Genera resúmenes y mapas mentales al instante.</p>
          </header>

          <div className="bg-white p-8 rounded-lg shadow-2xl border-t-4 border-amber-400 max-w-3xl mx-auto">
            <form onSubmit={handleInitiateSubmit} className="space-y-10">
              <div>
                <div className="flex items-center space-x-4 mb-6"><div className="flex-shrink-0 bg-amber-400 text-gray-900 w-12 h-12 rounded-full flex items-center justify-center font-bold text-2xl">1</div><h3 className="text-2xl font-bold text-gray-800">Proporciona el Audio</h3></div>
                <div onDragEnter={(e) => handleDragEvents(e, true)} onDragOver={(e) => handleDragEvents(e, true)} onDragLeave={(e) => handleDragEvents(e, false)} onDrop={handleDrop} className={`relative p-8 border-2 border-dashed rounded-lg text-center transition-colors ${isDragging ? 'border-amber-500 bg-amber-50' : 'border-gray-300'}`}>
                  <Icon path={ICONS.upload} className="w-12 h-12 text-gray-400 mx-auto" />
                  <p className="mt-4 text-lg text-gray-600">Arrastra y suelta un archivo aquí o</p>
                  <label htmlFor="file-upload" className="mt-2 inline-block text-amber-600 font-semibold hover:text-amber-700 cursor-pointer transition-colors">búscalo en tu equipo</label>
                  <input id="file-upload" type="file" onChange={handleFileChange} disabled={isRecording} className="hidden"/>
                  <p className="mt-3 text-sm text-gray-500">{file && !isRecording ? file.name : 'Formatos soportados: MP3, WAV, M4A'}</p>
                  <div className="flex items-center w-full my-6"><div className="flex-grow border-t border-gray-200"></div><span className="flex-shrink mx-4 text-gray-400 text-sm font-semibold">O</span><div className="flex-grow border-t border-gray-200"></div></div>
                  {!isRecording ? <button type="button" onClick={handleStartRecording} className="inline-flex items-center bg-gray-700 text-white py-2 px-6 rounded-lg hover:bg-gray-800 transition-colors font-semibold shadow"><Icon path={ICONS.mic} className="w-5 h-5 mr-2" />Grabar desde el micrófono</button> : <button type="button" onClick={handleStopRecording} className="inline-flex items-center bg-red-600 text-white py-2 px-6 rounded-lg hover:bg-red-700 transition-colors font-semibold shadow"><Icon path={ICONS.mic} className="w-5 h-5 mr-2" />Detener Grabación</button>}
                </div>
              </div>
              <div className="min-h-[60px]">
                {isRecording && <div className="flex items-center justify-center text-red-600 font-semibold animate-pulse"><span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>Grabando...</div>}
                {audioPreviewUrl && <div className="p-4 bg-amber-50 rounded-lg"><p className="text-center font-medium text-amber-800 mb-2">Audio listo para analizar</p><audio controls src={audioPreviewUrl} className="w-full h-10"></audio></div>}
              </div>
              <div>
                <div className="flex items-center space-x-4 mb-4"><div className="flex-shrink-0 bg-amber-400 text-gray-900 w-12 h-12 rounded-full flex items-center justify-center font-bold text-2xl">2</div><h3 className="text-2xl font-bold text-gray-800">Contexto <span className="text-lg font-normal text-gray-500">(opcional)</span></h3></div>
                <div className="pl-16">
                  <p className="text-gray-500 mb-4">Añadir estos detalles mejora la precisión del análisis.</p>
                  <div className="space-y-4">
                      <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título de la reunión" className="w-full p-3 border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"/>
                      <input id="participants" type="text" value={participants} onChange={(e) => setParticipants(e.target.value)} placeholder="Participantes (Ej: Ana, Juan)" className="w-full p-3 border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"/>
                  </div>
                </div>
              </div>
              <div className="border-t pt-8">
                  <button type="submit" disabled={isLoading || isRecording} className="w-full bg-amber-400 text-gray-900 py-4 px-4 rounded-lg font-bold text-xl hover:bg-amber-500 transition-transform transform hover:scale-102 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none shadow-lg">
                      {isLoading ? 'Procesando...' : 'Siguiente'}
                  </button>
              </div>
            </form>
          </div>
          {error && <div className="mt-8 max-w-3xl mx-auto p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg" role="alert">{error}</div>}
        </main>
      </div>
    </div>
  );
}

export default HomePage;