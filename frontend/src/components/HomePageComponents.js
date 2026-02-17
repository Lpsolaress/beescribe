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

export const HistoryModal = ({ isOpen, onClose, history, onSelect, selectedId, isLoading, onSearch, onResetFilters }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const handleSearch = (e) => { if (e.key === 'Enter') { onSearch({ consulta: searchTerm, filtros: {} }); } };
  const handleFilterChange = (nuevosFiltros) => { onSearch({ consulta: searchTerm, filtros: nuevosFiltros }); };
  const handleReset = () => { setSearchTerm(''); onResetFilters(); };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center" onClick={onClose}>
      <div className="bg-gray-800 text-white rounded-lg shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <header className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="text-xl font-bold text-amber-400">Historial de Análisis</h3>
          <div className="flex items-center space-x-2">
            <button onClick={() => setShowFilters(!showFilters)} className={`px-3 py-1 rounded-md text-sm transition-colors ${showFilters ? 'bg-amber-500 text-black' : 'bg-gray-700 hover:bg-gray-600'}`}>Filtros</button>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700"><Icon path={ICONS.close} /></button>
          </div>
        </header>
        <div className="p-4 border-b border-gray-700"><input type="text" placeholder="Buscar por título o contenido..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={handleSearch} className="w-full bg-gray-900 border-gray-600 text-white rounded-md p-2 text-sm"/></div>
        {showFilters && <HistoryFilters onFilterChange={handleFilterChange} onReset={handleReset} />}
        <div className="p-4 overflow-y-auto">
          {isLoading ? <p className="text-center text-gray-400">Cargando...</p> : history.length > 0 ? (
            <ul className="space-y-2">
              {history.map(item => (<li key={item.id} onClick={() => onSelect(item.id)} className={`p-3 rounded-md cursor-pointer transition-all duration-200 ${selectedId === item.id ? 'bg-amber-500 text-black font-semibold' : 'hover:bg-gray-700'}`}><strong className="block text-sm font-medium">{item.title || "Análisis sin título"}</strong><span className="block text-xs text-gray-400">{new Date(item.createdAt).toLocaleString()}</span></li>))}
            </ul>
          ) : <p className="text-center text-gray-400 py-8">No se encontraron resultados.</p>}
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