// src/pages/CalendarPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api';
import { NewMeetingModal, NotificationsModal } from '../components/HomePageComponents';
import AIChatPanel from '../components/AIChatPanel';
import analisisIcon from '../assets/analisis_icon.png';

function CalendarPage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isNewMeetingModalOpen, setIsNewMeetingModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [selectedForChat, setSelectedForChat] = useState([]);
  const [openChatWithSelection, setOpenChatWithSelection] = useState(false);

  useEffect(() => {
    fetchMeetings();
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await apiClient.get('/users/me');
      setUserProfile(response.data);
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  };

  const fetchMeetings = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/meetings');
      setMeetings(response.data);
    } catch (err) {
      setError('No se pudo cargar el historial de reuniones.');
    } finally {
      setIsLoading(false);
    }
  };

  const changeMonth = (offset) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(newDate);
    setSelectedDate(newDate); // Reinicia selección al primer día del mes
  };

  // --- Lógica del Calendario ---
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Convertir: Lunes=0, Domingo=6
  };

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const startDayOffset = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

  // Generar cuadrícula
  const dayTiles = [];
  for (let i = 0; i < startDayOffset; i++) {
    dayTiles.push({ day: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const tileDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
    const hasMeetings = meetings.some(m => {
      const mDate = new Date(m.fecha_creacion);
      return mDate.getDate() === d && mDate.getMonth() === currentDate.getMonth() && mDate.getFullYear() === currentDate.getFullYear();
    });
    dayTiles.push({ day: d, date: tileDate, hasMeetings });
  }

  // Filtrar reuniones del día seleccionado
  const dayMeetings = meetings.filter(m => {
    const mDate = new Date(m.fecha_creacion);
    return mDate.getDate() === selectedDate.getDate() &&
           mDate.getMonth() === selectedDate.getMonth() &&
           mDate.getFullYear() === selectedDate.getFullYear();
  });

  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const weekdays = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-24 text-gray-900">
      
      {/* --- HEADER --- */}
      <div className="bg-white px-6 py-4 flex justify-between items-center border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="bg-amber-400 p-2 rounded-xl shadow-sm flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-900 fill-current" viewBox="0 0 24 24"><path d="M12 2l8.66 5v10L12 22l-8.66-5V7L12 2z" /></svg>
          </div>
          <h2 className="text-lg font-bold text-gray-800">Bee-Scribe</h2>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsNotificationsOpen(true)} className="text-gray-400 hover:text-amber-500 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          </button>
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-amber-500 transition-colors">
            <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          </button>
          <button onClick={() => navigate('/perfil')} className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 border border-gray-100 shadow-sm overflow-hidden">
            {userProfile?.foto_perfil ? (
              <img src={`${apiClient.defaults.baseURL.replace('/api', '')}${userProfile.foto_perfil}`} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              userProfile?.email ? userProfile.email[0].toUpperCase() : 'U'
            )}
          </button>
        </div>
      </div>

      <main className="w-full px-8 py-6 max-w-4xl mx-auto flex flex-col items-center">
        
        {/* --- CALENDAR PANEL --- */}
        <div className="w-full bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-6 flex flex-col items-center">
          
          <div className="w-full flex justify-between items-center mb-4">
            <h3 className="text-lg font-extrabold text-gray-800 capitalize">{months[currentDate.getMonth()]} de {currentDate.getFullYear()}</h3>
            <div className="flex gap-2">
              <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-xl hover:bg-gray-50 text-gray-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={() => changeMonth(1)} className="p-1.5 rounded-xl hover:bg-gray-50 text-gray-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="w-full grid grid-cols-7 text-center text-xxs font-bold text-gray-400 border-b border-gray-50 pb-2 mb-2">
            {weekdays.map(d => <div key={d}>{d}</div>)}
          </div>

          {/* Grid Layout Row */}
          <div className="w-full grid grid-cols-7 text-center gap-y-2">
            {dayTiles.map((tile, index) => {
              if (!tile.day) return <div key={`empty-${index}`} className="aspect-square"></div>;
              
              const isSelected = selectedDate.getDate() === tile.day && selectedDate.getMonth() === currentDate.getMonth() && selectedDate.getFullYear() === currentDate.getFullYear();
              
              return (
                <button 
                  key={`day-${tile.day}`} 
                  onClick={() => setSelectedDate(tile.date)} 
                  className={`aspect-square flex flex-col items-center justify-center relative rounded-2xl text-xs font-semibold transition-all hover:bg-gray-50
                    ${isSelected ? 'bg-amber-400 text-gray-900 shadow-md font-bold' : 'text-gray-700'}
                  `}
                >
                  {tile.day}
                  {tile.hasMeetings && (
                    <div className={`w-1 h-1 rounded-full absolute bottom-1 ${isSelected ? 'bg-gray-900' : 'bg-amber-500'}`}></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* --- SCHEDULE VIEW PANEL --- */}
        <div className="w-full flex flex-col gap-4">
          
          <button onClick={() => setIsNewMeetingModalOpen(true)} className="w-full bg-amber-400 text-gray-900 py-3.5 rounded-2xl font-bold text-sm shadow-sm hover:bg-amber-500 transition-colors flex items-center justify-center gap-2">
            <svg className="w-5 h-5 fill-none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            Programar Nuevo Zumbido
          </button>

          <div className="flex justify-between items-center mt-2">
            <h4 className="text-base font-bold text-gray-800">Reuniones Programadas</h4>
            <span className="text-xxs text-gray-400 font-semibold">{selectedDate.toLocaleDateString()}</span>
          </div>

          {isLoading ? (
            <p className="text-center text-gray-400 text-xs py-8">Cargando...</p>
          ) : dayMeetings.length > 0 ? (
            <div className="space-y-3">
              {dayMeetings.map(m => (
                <div key={m.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer hover:shadow-md transition-shadow"
                  style={selectedForChat.includes(m.id) ? { borderColor: '#f59e0b', background: '#fffbeb' } : {}}
                >
                  <div className="flex items-center gap-3" onClick={() => navigate(`/results/${m.id}`)}>
                    <div className="bg-amber-100 p-2.5 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-amber-600 fill-none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-gray-800">{m.titulo || "Reunión"}</h5>
                      <div className="flex items-center gap-1 text-gray-400 text-xxs mt-0.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>{new Date(m.fecha_creacion).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedForChat.includes(m.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSelectedForChat(prev =>
                          prev.includes(m.id) ? prev.filter(x => x !== m.id) : prev.length < 3 ? [...prev, m.id] : prev
                        );
                      }}
                      style={{ accentColor: '#f59e0b', width: 18, height: 18, cursor: 'pointer' }}
                      title="Seleccionar para analizar"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 text-xs py-8">No hay reuniones para este día.</p>
          )}

          {error && <div className="p-4 bg-red-50 text-red-500 rounded-xl text-xs">{error}</div>}

        </div>

      </main>

      {/* --- BOTTOM NAVIGATION BAR --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-10 py-3 flex justify-between items-center z-40 w-full shadow-2xl rounded-t-3xl">
        <button className="flex flex-col items-center text-gray-400 gap-0.5" onClick={() => navigate('/')}>
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          <span className="text-xxs font-semibold">Inicio</span>
        </button>
        <button className="flex flex-col items-center text-amber-500 gap-0.5">
          <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
          <span className="text-xxs font-semibold">Calendario</span>
        </button>
        
        <div className="absolute left-1/2 transform -translate-x-1/2 -top-5">
          <button className="bg-amber-400 p-4 rounded-full shadow-lg text-gray-900 hover:scale-105 transition-transform flex items-center justify-center border-4 border-white" onClick={() => navigate('/')}>
            <svg className="w-6 h-6 fill-none stroke-current" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h10a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
        </div>

        <button className="flex flex-col items-center text-gray-400 gap-0.5" onClick={() => navigate('/')}>
          <img src={analisisIcon} className="w-5 h-5 object-contain opacity-40" alt="Análisis" />
          <span className="text-xxs font-semibold">Análisis</span>
        </button>
        <button className="flex flex-col items-center text-gray-400 gap-0.5" onClick={() => navigate('/perfil')}>
          <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span className="text-xxs font-semibold">Perfil</span>
        </button>
      </div>

      <NotificationsModal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />

      <NewMeetingModal 
        isOpen={isNewMeetingModalOpen} 
        onClose={() => setIsNewMeetingModalOpen(false)} 
        initialDate={selectedDate}
        onSuccess={(newId) => {
          setIsNewMeetingModalOpen(false);
          fetchMeetings(); // Recargar el calendario para ver el puntito
          navigate(`/results/${newId}`); // Redirigir al nuevo análisis
        }} 
      />

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
            cursor: 'pointer', animation: 'slideUpFade 0.3s ease-out'
          }}
        >
          🐝 Analizar {selectedForChat.length} reunión{selectedForChat.length > 1 ? 'es' : ''} con IA
        </button>
      )}

      <AIChatPanel preSelectedIds={openChatWithSelection ? selectedForChat : undefined} autoOpen={openChatWithSelection} onOpened={() => setOpenChatWithSelection(false)} />
    </div>
  );
}

export default CalendarPage;
