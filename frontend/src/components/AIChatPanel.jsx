/* src/components/AIChatPanel.jsx */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import apiClient from '../api';
import './AIChatPanel.css';

const AIChatPanel = ({ meetingId = null, initialMessage = "", preSelectedIds, autoOpen, onOpened }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', content: initialMessage || '¡Hola! 🐝 Soy Ali-IA. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('bee_muted') === 'true');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasWelcomed, setHasWelcomed] = useState(false);
  const [showMeetingSelector, setShowMeetingSelector] = useState(false);
  const [availableMeetings, setAvailableMeetings] = useState([]);
  const [selectedMeetingIds, setSelectedMeetingIds] = useState(meetingId ? [meetingId] : []);
  const [meetingFilter, setMeetingFilter] = useState('all');
  const messagesEndRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const audioRef = useRef(null);
  const [selectedVoice, setSelectedVoice] = useState(() => localStorage.getItem('bee_voice') || 'shimmer');
  const [chatHistory, setChatHistory] = useState(() => {
    const saved = localStorage.getItem('bee_chat_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    localStorage.setItem('bee_chat_history', JSON.stringify(chatHistory));
  }, [chatHistory]);

  const createNewChat = () => {
    // Solo guardar el historial si hay mensajes del usuario
    if (messages.length > 2 || (messages.length === 2 && messages[1].role === 'user')) {
      const newHistoryEntry = {
        id: Date.now(),
        date: new Date().toISOString(),
        messages: [...messages],
        meetings: [...selectedMeetingIds]
      };
      setChatHistory(prev => [newHistoryEntry, ...prev].slice(0, 20));
    }
    setMessages([{ role: 'ai', content: initialMessage || '¡Hola! 🐝 Soy Ali-IA. ¿En qué puedo ayudarte hoy?' }]);
    setSelectedMeetingIds(meetingId ? [meetingId] : []);
    setHasWelcomed(false);
    setShowHistory(false);
  };

  const loadHistorySession = (session) => {
    setMessages(session.messages);
    setSelectedMeetingIds(session.meetings || []);
    setShowHistory(false);
    setHasWelcomed(true);
  };

  const deleteHistorySession = (id, e) => {
    e.stopPropagation();
    setChatHistory(prev => prev.filter(s => s.id !== id));
  };

  const voiceOptions = [
    { id: 'browser', label: 'Navegador (Gratis)' },
    { id: 'alloy', label: 'Alloy (OA)' },
    { id: 'echo', label: 'Echo (OA)' },
    { id: 'fable', label: 'Fable (OA)' },
    { id: 'onyx', label: 'Onyx (OA)' },
    { id: 'nova', label: 'Nova (OA)' },
    { id: 'shimmer', label: 'Shimmer (OA)' },
  ];

  // Auto-abrir chat con reuniones preseleccionadas desde CalendarPage/HomePage
  useEffect(() => {
    if (autoOpen && preSelectedIds && preSelectedIds.length > 0) {
      setSelectedMeetingIds(preSelectedIds);
      setIsOpen(true);
      if (onOpened) onOpened();
    }
  }, [autoOpen, preSelectedIds]);

  // Función para hablar
  const speak = useCallback(async (text) => {
    if (isMuted || !text) return;
    
    // Parar cualquier audio previo
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    synthRef.current.cancel();

    const plainText = text.replace(/[*#_\[\]()]/g, '').replace(/`[^`]*`/g, '');

    if (selectedVoice === 'browser') {
      const utterance = new SpeechSynthesisUtterance(plainText);
      
      // Asegurarnos de que las voces estén cargadas
      const voices = synthRef.current.getVoices();
      const spanishVoice = voices.find(v => v.lang.includes('es')) || voices.find(v => v.lang.includes('en'));
      if (spanishVoice) utterance.voice = spanishVoice;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      synthRef.current.speak(utterance);
    } else {
      try {
        setIsSpeaking(true);
        const response = await apiClient.post('/tts', { text: plainText, voice: selectedVoice }, { responseType: 'blob' });
        
        const audioUrl = URL.createObjectURL(response.data);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };
        
        audio.onerror = (e) => {
          console.error("Error en objeto Audio:", e);
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
        };
        
        await audio.play().catch(err => {
          console.warn("Autoplay bloqueado o error de audio:", err);
          setIsSpeaking(false);
        });
      } catch (err) {
        console.error("Error en OpenAI TTS, usando fallback de navegador:", err);
        const utterance = new SpeechSynthesisUtterance(plainText);
        const voices = synthRef.current.getVoices();
        const spanishVoice = voices.find(v => v.lang.includes('es')) || voices[0];
        if (spanishVoice) utterance.voice = spanishVoice;
        
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        
        synthRef.current.speak(utterance);
      }
    }
  }, [isMuted, selectedVoice]);


  // Saludo inicial
  useEffect(() => {
    if (isOpen && !hasWelcomed && !isMuted) {
      speak("¡Hola! Soy Ali, tu asistente IA. ¿En qué puedo ayudarte con esta reunión?");
      setHasWelcomed(true);
    }
  }, [isOpen, hasWelcomed, isMuted, speak]);

  // Sincronizar estado de habla con el sintetizador del navegador o audio de OpenAI
  useEffect(() => {
    const checkSpeaking = setInterval(() => {
      // 1. Verificar si hay audio de OpenAI reproduciéndose
      if (audioRef.current && !audioRef.current.paused) {
        if (!isSpeaking) setIsSpeaking(true);
        return;
      }

      // 2. Verificar si el navegador está hablando (fallback)
      const isSynthSpeaking = window.speechSynthesis.speaking;
      
      // Solo actualizamos si no hay un audio de OpenAI activo (que ya manejamos arriba)
      if (!audioRef.current || audioRef.current.paused) {
        if (isSpeaking !== isSynthSpeaking) {
          setIsSpeaking(isSynthSpeaking);
        }
      }
    }, 100);
    return () => clearInterval(checkSpeaking);
  }, [isSpeaking]);


  // Guardar preferencia de mudo y voz
  useEffect(() => {
    localStorage.setItem('bee_muted', isMuted);
    localStorage.setItem('bee_voice', selectedVoice);
    if (isMuted) {
      synthRef.current.cancel();
      if (audioRef.current) audioRef.current.pause();
      setIsSpeaking(false);
    }
  }, [isMuted, selectedVoice]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Cargar lista de reuniones cuando se abre el chat
  useEffect(() => {
    if (isOpen) {
      apiClient.get('/meetings/summary-list')
        .then(res => setAvailableMeetings(res.data))
        .catch(err => console.error('Error cargando reuniones:', err));
    }
  }, [isOpen]);
  // Límite dinámico: reuniones largas (>45min) → máx 2, cortas (≤45min) → máx 3
  const getMaxSelections = (currentIds) => {
    if (currentIds.length === 0) return 3; // Por defecto, permitir hasta 3
    const selectedMeetings = currentIds
      .map(id => availableMeetings.find(m => m.id === id))
      .filter(Boolean);
    const hasLongMeeting = selectedMeetings.some(m => m.duracion_min > 45);
    return hasLongMeeting ? 2 : 3;
  };

  const currentMaxSelections = getMaxSelections(selectedMeetingIds);

  const toggleMeetingSelection = (id) => {
    setSelectedMeetingIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      // Verificar límite con la nueva selección potencial
      const newIds = [...prev, id];
      const maxAllowed = getMaxSelections(newIds);
      if (newIds.length > maxAllowed) return prev;
      return newIds;
    });
  };

  const getFilteredMeetings = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return availableMeetings.filter(m => {
      if (meetingFilter === 'all') return true;
      const date = new Date(m.fecha);
      if (meetingFilter === 'today') return date >= today;
      if (meetingFilter === 'week') {
        const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
        return date >= weekAgo;
      }
      if (meetingFilter === 'month') {
        const monthAgo = new Date(today); monthAgo.setMonth(monthAgo.getMonth() - 1);
        return date >= monthAgo;
      }
      return true;
    });
  };

  const selectAllFiltered = () => {
    const filtered = getFilteredMeetings();
    // Aplicar límite dinámico al seleccionar todas
    const maxForAll = filtered.some(m => m.duracion_min > 45) ? 2 : 3;
    const newIds = filtered.slice(0, maxForAll).map(m => m.id);
    setSelectedMeetingIds(newIds);
  };

  const clearSelections = () => setSelectedMeetingIds([]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const payload = { query: input };
      if (selectedMeetingIds.length > 0) {
        payload.meeting_ids = selectedMeetingIds;
      } else if (meetingId) {
        payload.meeting_id = meetingId;
      }
      const response = await apiClient.post('/chat', payload);

      if (response.data.success) {
        const aiResponse = response.data.respuesta;
        setMessages(prev => [...prev, { role: 'ai', content: aiResponse }]);
        if (!isMuted) speak(aiResponse);
      } else {
        throw new Error(response.data.detail || "Error desconocido");
      }
    } catch (err) {
      console.error("Error en chat:", err);
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: "Lo siento, tuve un problema al conectar con mi colmena mental. ¿Podrías intentarlo de nuevo?" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <>
      {/* Botón flotante siempre visible en las páginas permitidas */}
      <button 
        onClick={() => setIsOpen(true)} 
        className={`chat-bubble-button shadow-2xl ${isOpen ? 'hidden' : 'inline-flex'}`}
        style={{ 
          position: 'fixed', 
          bottom: '32px', 
          right: '32px', 
          left: 'auto', 
          zIndex: 99999,
          display: isOpen ? 'none' : 'flex'
        }}
        title="Abrir Asistente AI"
      >
        <svg className="w-6 h-6 fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      {/* Overlay / Backdrop */}
      {isOpen && (
        <div 
          className="chat-sidebar-backdrop"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <div className={`chat-sidebar ${isOpen ? 'open' : ''} shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)]`}>
        <div className="chat-sidebar-header">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 flex items-center justify-center -ml-2">
              <img src="/LogoBeeScribe.png" alt="Logo" className="w-full h-full object-contain scale-125" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-800">Ali-IA (Asistente)</h3>
              <p className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider">En línea</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={createNewChat}
              className="chat-action-btn"
              title="Nueva conversación"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className={`chat-action-btn ${showHistory ? 'active' : ''}`}
              title="Ver historial"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
            <div className="w-px h-6 bg-gray-100 mx-1"></div>
            <select 
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="text-[10px] bg-gray-50 border-gray-100 rounded-lg px-2 py-1 font-bold text-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
              title="Cambiar voz de la IA"
            >
              {voiceOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
            <button 
              onClick={() => setIsMuted(!isMuted)} 
              className={`p-2 rounded-full transition-all ${isMuted ? 'text-gray-300 hover:bg-gray-100' : 'text-amber-500 bg-amber-50 hover:bg-amber-100'}`}
              title={isMuted ? "Activar voz" : "Silenciar voz"}
            >
              {isMuted ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
              )}
            </button>
            <button 
              onClick={() => setIsOpen(false)} 
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Selector de reuniones */}
        {showMeetingSelector && (
          <div className="meeting-selector-panel">
            <div className="meeting-selector-header">
              <span className="text-xs font-bold text-gray-700">Seleccionar Reuniones ({selectedMeetingIds.length}/{currentMaxSelections})</span>
              <span className="text-[9px] text-gray-400">{currentMaxSelections === 2 ? '⏱ Reuniones largas: máx 2' : '⏱ Reuniones cortas: máx 3'}</span>
              <div className="flex gap-1">
                <button onClick={selectAllFiltered} className="meeting-selector-action">Todas</button>
                <button onClick={clearSelections} className="meeting-selector-action">Limpiar</button>
              </div>
            </div>
            <div className="meeting-quick-filters">
              {[['all','Todas'],['today','Hoy'],['week','Esta semana'],['month','Último mes']].map(([key, label]) => (
                <button 
                  key={key}
                  onClick={() => setMeetingFilter(key)}
                  className={`meeting-filter-btn ${meetingFilter === key ? 'active' : ''}`}
                >{label}</button>
              ))}
            </div>
            <div className="meeting-selector-list">
              {getFilteredMeetings().length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No hay reuniones en este período</p>
              ) : (
                getFilteredMeetings().map(m => (
                  <label key={m.id} className={`meeting-selector-item ${selectedMeetingIds.includes(m.id) ? 'selected' : ''}`}>
                    <input 
                      type="checkbox" 
                      checked={selectedMeetingIds.includes(m.id)}
                      onChange={() => toggleMeetingSelection(m.id)}
                      disabled={!selectedMeetingIds.includes(m.id) && selectedMeetingIds.length >= currentMaxSelections}
                    />
                    <div className="meeting-selector-info">
                      <span className="meeting-selector-title">{m.titulo}</span>
                      <div className="meeting-selector-meta">
                        <span className="meeting-selector-date">{new Date(m.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span className={`meeting-duration-badge ${m.duracion_min > 45 ? 'long' : 'short'}`}>
                          {m.duracion_min > 60 ? `${Math.floor(m.duracion_min/60)}h ${m.duracion_min%60}m` : `${m.duracion_min} min`}
                        </span>
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        {/* Chips de reuniones seleccionadas */}
        {selectedMeetingIds.length > 0 && (
          <div className="selected-meetings-chips">
            {selectedMeetingIds.map(id => {
              const m = availableMeetings.find(x => x.id === id);
              return m ? (
                <span key={id} className="meeting-chip">
                  📋 {m.titulo.length > 20 ? m.titulo.slice(0, 20) + '...' : m.titulo}
                  <button onClick={() => toggleMeetingSelection(id)} className="meeting-chip-remove">×</button>
                </span>
              ) : null;
            })}
          </div>
        )}
        
        <div className="chat-sidebar-messages">
          {/* Panel de Historial */}
          {showHistory && (
            <div className="history-overlay">
              <div className="chat-sidebar-header" style={{borderBottom: '1px solid #f3f4f6', padding: '12px 24px'}}>
                <span className="text-sm font-bold text-gray-700">Conversaciones Previas</span>
                <button onClick={() => setShowHistory(false)} className="chat-action-btn">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="history-list">
                {chatHistory.length === 0 ? (
                  <div className="history-empty">
                    <svg className="w-12 h-12 text-gray-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300">Historial vacío</p>
                  </div>
                ) : (
                  chatHistory.map(session => (
                    <div key={session.id} className="history-item" onClick={() => loadHistorySession(session)}>
                      <div className="flex justify-between items-start">
                        <div className="title">
                          {([...session.messages].reverse().find(m => m.role === 'user')?.content.slice(0, 40) || 'Nueva Consulta')}...
                        </div>
                        <button onClick={(e) => deleteHistorySession(session.id, e)} className="text-gray-300 hover:text-red-400 p-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                      <div className="meta">
                        <span>{new Date(session.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                        <span>{session.messages.length} mensajes</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* La abeja solo se muestra si el sonido está activo y NO estamos viendo el historial */}
          {!showHistory && (
            <div className={`bee-assistant-wrapper ${(isSpeaking || isLoading) ? 'active' : ''}`}>
              <div className="bee-assistant-container">
                <div className="bee-robot-wrapper">
                  <img 
                    src={(isSpeaking || isLoading) ? "/Abeja-hablando.gif" : "/Abeja-idle.gif"} 
                    alt="Bee Assistant" 
                    className="bee-robot-image" 
                  />
                </div>
                {(isSpeaking || isLoading) && <div className="bee-speaking-vibrance"></div>}
              </div>
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <div key={idx} className={`message-wrapper ${msg.role === 'user' ? 'user' : 'ai'}`}>
              <div className={`message-bubble ${msg.role === 'user' ? 'bg-amber-400 text-gray-900' : 'bg-gray-50 border border-gray-100 text-gray-700'}`}>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
              <span className="text-[9px] text-gray-300 mt-1 px-1">
                {msg.role === 'user' ? 'Tú' : 'Ali-IA'}
              </span>
            </div>
          ))}
          {isLoading && (
            <div className="message-wrapper ai">
              <div className="message-bubble bg-gray-50 border border-gray-100 italic text-gray-400 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                </div>
                <span>Ali-IA está consultando su colmena...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="chat-sidebar-input-area">
          <div className="relative group flex gap-2">
            <button 
              type="button"
              onClick={() => setShowMeetingSelector(!showMeetingSelector)}
              className={`meeting-selector-toggle ${selectedMeetingIds.length > 0 ? 'has-selection' : ''}`}
              title="Seleccionar reuniones para analizar"
            >
              📋
              {selectedMeetingIds.length > 0 && (
                <span className="meeting-count-badge">{selectedMeetingIds.length}</span>
              )}
            </button>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregunta sobre la reunión..." 
              className="chat-sidebar-input"
              disabled={isLoading}
            />
            <button 
              type="submit" 
              className="chat-sidebar-send-button"
              disabled={isLoading || !input.trim()}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l7-7-7-7M5 12h14" />
              </svg>
            </button>
          </div>
          <p className="text-[9px] text-center text-gray-300 mt-2">
            La IA puede cometer errores. Verifica la información clave.
          </p>
        </form>
      </div>
    </>,
    document.body
  );
};

export default AIChatPanel;

