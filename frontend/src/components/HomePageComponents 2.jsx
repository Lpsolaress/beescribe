// src/components/HomePageComponents.js

import React, { useState } from 'react';

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

export const ICONS = {
  calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  upload: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
  mic: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z",
  history: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  close: "M6 18L18 6M6 6l12 12",
  meeting: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  podcast: "M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.636 5.636a9 9 0 0112.728 0M18.364 18.364A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636",
  conversation: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  file: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z",
  logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  bell: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  chart: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  plus: "M12 4v16m8-8H4",
  check: "M5 13l4 4L19 7",
  share: "M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z",
  plusCircle: "M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
};

export const CalendarView = ({ onScheduleNew }) => {
  // Simple representation of a month grid (April 2026 example)
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const startEmptyDays = Array.from({ length: 2 }, (_, i) => null); // Starts on a Wednesday?

  return (
    <div className="animate-fade-in-up pb-10">
      {/* Calendar Grid Container */}
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 mb-6">
        <div className="grid grid-cols-7 gap-y-6 text-center">
          {/* Weekday headers */}
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
            <span key={day} className="text-[10px] font-black text-gray-200 uppercase tracking-widest">{day}</span>
          ))}
          
          {/* Empty cells for start of month */}
          {startEmptyDays.map((_, i) => <div key={`empty-${i}`}></div>)}
          
          {/* Day numbers */}
          {days.map(day => (
            <div key={day} className="flex justify-center items-center h-10">
              <span className={`text-sm font-bold w-10 h-10 flex items-center justify-center rounded-xl transition-all cursor-pointer ${day === 10 ? 'bg-amber-400 text-gray-900 shadow-lg shadow-amber-100' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
                {day}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Programar Nuevo Zumbido Banner */}
      <button 
        onClick={onScheduleNew}
        className="w-full bg-amber-400 text-gray-900 py-5 rounded-2xl font-bold flex items-center justify-center space-x-3 shadow-xl shadow-amber-100 hover:bg-amber-500 transition-all transform hover:scale-[1.02] active:scale-95 mb-8"
      >
        <Icon path={ICONS.plusCircle} className="w-6 h-6" />
        <span className="text-sm uppercase tracking-widest font-black">Programar Nuevo Zumbido</span>
      </button>

      {/* Scheduled Meetings Section */}
      <div className="px-2">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Reuniones Programadas</h3>
        
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-50 flex items-center space-x-4 group cursor-pointer hover:border-amber-200 transition-all">
            <div className="bg-amber-50 p-3 rounded-2xl group-hover:bg-amber-100 transition-colors">
              <Icon path={ICONS.meeting} className="w-6 h-6 text-amber-500" />
            </div>
            <div className="flex-grow">
              <h4 className="font-extrabold text-gray-800 text-lg">Reunion</h4>
              <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest mt-0.5">
                10:00 - 11:00 AM
              </p>
            </div>
            <div className="text-amber-400 font-black text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
              Detalles
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AnalysisView = ({ meetingTitle, meetingDate, tasks = [], onShare }) => (
  <div className="animate-fade-in-up">
    {/* Header with Icon and Title */}
    <div className="flex items-center space-x-3 mb-8">
      <div className="bg-amber-400 p-2.5 rounded-xl shadow-md">
        <Icon path={ICONS.check} className="w-6 h-6 text-gray-900" />
      </div>
      <div>
        <p className="text-gray-300 text-[10px] font-bold uppercase tracking-[0.2em]">Resumen</p>
        <h2 className="text-2xl font-extrabold text-gray-800 tracking-tight">Plan de acción</h2>
      </div>
    </div>

    {/* Content Container */}
    <div className="bg-white rounded-[2rem] p-10 shadow-sm border border-gray-100 min-h-[65vh] relative flex flex-col">
      <div className="flex justify-between items-start mb-10">
        <div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">{meetingTitle || "Algoritmos Voraces"}</h3>
          <p className="text-xs text-gray-300 font-bold uppercase tracking-widest">
            {meetingDate || "2/10/2026, 11:32:45"}
          </p>
        </div>
        <button 
          onClick={onShare}
          className="bg-amber-400 text-gray-900 px-8 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-amber-100 hover:bg-amber-500 transition-all transform hover:scale-105 active:scale-95"
        >
          Compartir
        </button>
      </div>

      {/* Task List */}
      <div className="space-y-8 flex-grow">
        {(tasks.length > 0 ? tasks : [
          "crear juego Wordle Multijugador",
          "gestionar dependencias",
          "unirse a partidas",
          "crear partidas",
          "adivinar palabras"
        ]).map((task, index) => (
          <div key={index} className="flex items-center space-x-5 group cursor-pointer">
            <div className="w-7 h-7 rounded-full border-2 border-gray-100 group-hover:border-amber-400 transition-all flex items-center justify-center bg-white shadow-sm">
              <div className="w-3.5 h-3.5 rounded-full bg-amber-400 opacity-0 group-hover:opacity-100 transition-all transform scale-50 group-hover:scale-100"></div>
            </div>
            <span className="text-gray-400 font-bold text-lg group-hover:text-gray-800 transition-colors lowercase tracking-wide">
              {task}
            </span>
          </div>
        ))}
      </div>

      {/* Floating Decorative icon */}
      <div className="absolute top-10 right-10 opacity-[0.03] pointer-events-none">
        <Icon path={ICONS.chart} className="w-32 h-32 text-gray-900" />
      </div>
    </div>
  </div>
);

export const DashboardHeader = ({ userName, onLogout, onProfile }) => (
  <header className="flex justify-between items-center mb-8">
    <div>
      <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">Panel de Control</p>
      <h2 className="text-3xl font-bold text-gray-800">Hola, {userName}</h2>
    </div>
    <div className="flex items-center space-x-4">
      <button className="p-2 text-gray-400 hover:text-amber-500 transition-colors">
        <Icon path={ICONS.bell} className="w-6 h-6" />
      </button>
      <div className="flex items-center space-x-2 bg-white p-1 pr-4 rounded-full shadow-sm border border-gray-100">
        <img 
          src="https://ui-avatars.com/api/?name=Alicia&background=FFC107&color=fff" 
          alt="User Profile" 
          className="w-10 h-10 rounded-full border-2 border-amber-100"
        />
        <button onClick={onLogout} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
          <Icon path={ICONS.logout} className="w-5 h-5" />
        </button>
      </div>
    </div>
  </header>
);

export const StatCard = ({ icon, label, value, trend, trendColor = "text-green-500" }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
    <div className="bg-amber-50 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
      <Icon path={icon} className="w-6 h-6 text-amber-500" />
    </div>
    <div>
      <p className="text-gray-400 text-sm font-medium mb-1">{label}</p>
      <div className="flex items-baseline space-x-2">
        <span className="text-3xl font-bold text-gray-800">{value}</span>
        {trend && <span className={`text-xs font-bold ${trendColor}`}>{trend}</span>}
      </div>
    </div>
  </div>
);

export const CTABanner = ({ onClick }) => (
  <div className="bg-amber-400 rounded-2xl p-6 mb-8 flex justify-between items-center shadow-lg shadow-amber-200/50">
    <div>
      <h3 className="text-xl font-bold text-gray-900 mb-1">¿Listo para la próxima?</h3>
      <p className="text-amber-900/70 font-medium">Graba y transcribe en tiempo real con Bee-Scribe</p>
    </div>
    <button 
      onClick={onClick}
      className="bg-gray-900 text-amber-400 p-4 rounded-2xl hover:bg-gray-800 transition-all transform hover:scale-110 shadow-xl"
    >
      <Icon path={ICONS.mic} className="w-6 h-6" />
    </button>
  </div>
);

export const RecentMeetings = ({ meetings, onSeeAll, onSelect }) => (
  <section className="mb-24">
    <div className="flex justify-between items-center mb-6">
      <h3 className="text-xl font-bold text-gray-800">Reuniones Recientes</h3>
      <button onClick={onSeeAll} className="text-amber-500 font-bold text-sm hover:text-amber-600 transition-colors">Ver Todas</button>
    </div>
    <div className="space-y-4">
      {meetings.slice(0, 3).map(meeting => (
        <div 
          key={meeting.id} 
          onClick={() => onSelect(meeting.id)}
          className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex items-center space-x-4 cursor-pointer hover:border-amber-200 transition-all hover:shadow-md group"
        >
          <div className="bg-gray-100 p-3 rounded-xl group-hover:bg-amber-50 transition-colors">
            <Icon path={ICONS.file} className="w-6 h-6 text-gray-400 group-hover:text-amber-500" />
          </div>
          <div className="flex-grow">
            <h4 className="font-bold text-gray-800">{meeting.title || "Sin título"}</h4>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
              {new Date(meeting.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="text-gray-300 group-hover:text-amber-400">
            <Icon path="M9 5l7 7-7 7" className="w-5 h-5" />
          </div>
        </div>
      ))}
      {meetings.length === 0 && (
        <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <p className="text-gray-400 font-medium">No hay reuniones recientes</p>
        </div>
      )}
    </div>
  </section>
);

export const BottomNav = ({ activeTab, onTabChange, onPlusClick }) => {
  const tabs = [
    { id: 'inicio', label: 'Inicio', icon: ICONS.home },
    { id: 'calendario', label: 'Calendario', icon: ICONS.calendar },
    { id: 'plus', label: '', icon: ICONS.plus, isPlus: true },
    { id: 'analisis', label: 'Análisis', icon: ICONS.chart },
    { id: 'perfil', label: 'Perfil', icon: ICONS.user },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-2 pb-8 flex justify-between items-center z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
      {tabs.map(tab => (
        tab.isPlus ? (
          <button 
            key={tab.id}
            onClick={onPlusClick}
            className="bg-amber-400 p-4 rounded-full -mt-12 shadow-lg shadow-amber-200 hover:bg-amber-500 transition-all transform hover:scale-110 active:scale-95 border-4 border-slate-100"
          >
            <Icon path={tab.icon} className="w-8 h-8 text-gray-900" />
          </button>
        ) : (
          <button 
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === tab.id ? 'text-amber-500' : 'text-gray-300 hover:text-gray-400'}`}
          >
            <Icon path={tab.icon} className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-widest">{tab.label}</span>
          </button>
        )
      ))}
    </nav>
  );
};

const HistoryFilters = ({ onFilterChange, onReset }) => {
  const [filters, setFilters] = useState({ fecha_inicio: '', fecha_fin: '', metadatos: '' });
  const handleChange = (e) => { setFilters({ ...filters, [e.target.name]: e.target.value }); };
  const handleApply = () => { onFilterChange(filters); };
  const handleReset = () => {
    setFilters({ fecha_inicio: '', fecha_fin: '', metadatos: '' });
    onReset();
  };

  return (
    <div className="p-4 bg-gray-50 rounded-2xl space-y-4 border border-gray-100">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Desde</label>
          <input 
            type="date" 
            name="fecha_inicio" 
            value={filters.fecha_inicio} 
            onChange={handleChange} 
            className="w-full bg-white border-gray-100 text-gray-700 rounded-xl text-sm p-3 focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Hasta</label>
          <input 
            type="date" 
            name="fecha_fin" 
            value={filters.fecha_fin} 
            onChange={handleChange} 
            className="w-full bg-white border-gray-100 text-gray-700 rounded-xl text-sm p-3 focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
          />
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Buscar en Metadatos</label>
        <input 
          type="text" 
          name="metadatos" 
          placeholder="Ej: 'Juan', 'Proyecto X'..." 
          value={filters.metadatos} 
          onChange={handleChange} 
          className="w-full bg-white border-gray-100 text-gray-700 rounded-xl text-sm p-3 focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
        />
      </div>
      <div className="flex justify-end space-x-3 pt-2">
        <button 
          onClick={handleReset} 
          className="px-4 py-2 text-gray-400 hover:text-gray-600 font-bold text-xs uppercase tracking-widest transition-colors"
        >
          Limpiar
        </button>
        <button 
          onClick={handleApply} 
          className="px-6 py-2 bg-gray-900 text-amber-400 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md active:scale-95"
        >
          Aplicar
        </button>
      </div>
    </div>
  );
};

export const HistoryModal = ({ isOpen, onClose, history, onSelect, selectedId, isLoading, onSearch, onResetFilters }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('mias');
  
  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      onSearch({ consulta: searchTerm, filtros: {} });
    }
  };

  const handleFilterChange = (nuevosFiltros) => {
    onSearch({ consulta: searchTerm, filtros: nuevosFiltros });
  };

  const handleReset = () => {
    setSearchTerm('');
    onResetFilters();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-center items-end sm:items-center" onClick={onClose}>
      <div 
        className="bg-white text-gray-800 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg h-[90vh] sm:h-[80vh] flex flex-col animate-fade-in-up relative overflow-hidden" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex justify-between items-center p-6 pb-2">
          <h3 className="text-2xl font-bold text-gray-800">Historial</h3>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setShowFilters(!showFilters)} 
              className="text-gray-400 text-sm font-medium hover:text-amber-500 transition-colors"
            >
              Filtros
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
              <Icon path={ICONS.close} className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex px-6 py-4 space-x-2">
          <button 
            onClick={() => setActiveTab('mias')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'mias' ? 'bg-amber-400 text-gray-900 shadow-sm shadow-amber-200' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            Mías
          </button>
          <button 
            onClick={() => setActiveTab('compartidas')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'compartidas' ? 'bg-amber-400 text-gray-900 shadow-sm shadow-amber-200' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            Compartidas
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 mb-4">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar por título o contenido..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              onKeyDown={handleSearch}
              className="w-full bg-gray-50 border-none focus:ring-2 focus:ring-amber-400 rounded-xl p-4 text-sm placeholder:text-gray-300 transition-all"
            />
          </div>
        </div>

        {showFilters && (
          <div className="px-6 mb-4">
            <HistoryFilters onFilterChange={handleFilterChange} onReset={handleReset} />
          </div>
        )}

        {/* List */}
        <div className="flex-grow overflow-y-auto px-6 pb-32 scrollbar-hide">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-400 font-medium">Cargando tu historial...</p>
            </div>
          ) : history.length > 0 ? (
            <ul className="space-y-6">
              {history.map(item => (
                <li 
                  key={item.id} 
                  onClick={() => onSelect(item.id)} 
                  className="group cursor-pointer"
                >
                  <h4 className="text-lg font-bold text-gray-800 group-hover:text-amber-500 transition-colors mb-1">
                    {item.title || "Análisis sin título"}
                  </h4>
                  <p className="text-xs text-gray-300 font-medium tracking-wide uppercase">
                    {new Date(item.createdAt).toLocaleString('es-ES', {
                      day: 'numeric',
                      month: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
              <p className="text-gray-400 font-medium">No se encontraron resultados.</p>
            </div>
          )}
        </div>

        {/* Floating Plus Button (at bottom of list area) */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
          <button 
            onClick={onClose} // En la imagen parece ser un botón de acción principal o cierre/nueva acción
            className="bg-amber-400 p-5 rounded-full shadow-xl shadow-amber-200 hover:bg-amber-500 transition-all transform hover:scale-110 active:scale-95 border-4 border-white"
          >
            <Icon path={ICONS.plus} className="w-8 h-8 text-gray-900" />
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
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6 animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Un último paso...</h3>
        <p className="text-gray-600 mb-6">¿Qué tipo de audio estás analizando? Esto nos ayuda a darte el mejor resultado.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {types.map((type) => (<button key={type.key} onClick={() => onSelectType(type.key)} className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-amber-50 hover:border-amber-400 hover:shadow-lg transition-all transform hover:-translate-y-1"><Icon path={type.icon} className="w-10 h-10 text-amber-500 mb-2" /><span className="font-semibold text-gray-700">{type.label}</span></button>))}
        </div>
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