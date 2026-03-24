import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api';
import { logout } from '../auth/auth';
import { NotificationsModal } from '../components/HomePageComponents';
import analisisIcon from '../assets/analisis_icon.png';

function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isEditingAlias, setIsEditingAlias] = useState(false);
  const [newAlias, setNewAlias] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get('/users/me');
      setUser(response.data);
      setNewAlias(response.data.alias || '');
    } catch (err) {
      console.error("Error fetching profile", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAlias = async () => {
    try {
      const formData = new FormData();
      formData.append('alias', newAlias);
      const response = await apiClient.put('/users/me', formData);
      setUser({ ...user, alias: response.data.alias });
      setIsEditingAlias(false);
    } catch (err) {
      alert("Error al actualizar alias");
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('foto', file);
      const response = await apiClient.put('/users/me', formData);
      setUser({ ...user, foto_perfil: response.data.foto_perfil });
    } catch (err) {
      alert("Error al subir imagen");
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50/50">Cargando...</div>;
  }

  const avatarUrl = user?.foto_perfil 
    ? `${apiClient.defaults.baseURL.replace('/api', '')}${user.foto_perfil}`
    : "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=faces";

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col items-center p-6 pb-24 relative">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col items-center mt-10 mb-8 w-full">
        
        {/* Hexagon Avatar */}
        <div className="relative group cursor-pointer">
          <input type="file" id="profile-upload" className="hidden" accept="image/*" onChange={handleFileChange} />
          <label htmlFor="profile-upload" className="cursor-pointer block">
            <div 
              className="w-24 h-24 bg-cover bg-center shadow-md relative"
              style={{ 
                backgroundImage: `url(${avatarUrl})`,
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
              }}
            >
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                )}
              </div>
            </div>
          </label>
          <div className="absolute bottom-1 right-1 bg-amber-400 p-1.5 rounded-full border border-gray-900 shadow-sm">
            <svg className="w-3.5 h-3.5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </div>
        </div>

        {/* Alias / Nombre */}
        {isEditingAlias ? (
          <div className="flex items-center gap-1 mt-4">
            <input 
              type="text" 
              value={newAlias} 
              onChange={(e) => setNewAlias(e.target.value)} 
              className="bg-white border rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-amber-400"
            />
            <button onClick={handleUpdateAlias} className="bg-amber-400 p-1.5 rounded-lg text-gray-900">✓</button>
          </div>
        ) : (
          <h2 className="text-xl font-bold text-gray-800 mt-4">{user?.alias || user?.email.split('@')[0]}</h2>
        )}

        <p className="text-xxs text-amber-500 font-semibold mt-1">{user?.email}</p>

        {!isEditingAlias && (
          <button onClick={() => setIsEditingAlias(true)} className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 text-xxs font-bold text-gray-800 mt-3 shadow-sm hover:bg-amber-100 transition-colors">
            <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            Editar alias
          </button>
        )}
      </div>

      {/* --- MENU SECTIONS --- */}
      <div className="w-full max-w-4xl flex flex-col">
        <span className="text-xxs font-extrabold text-amber-500 tracking-wider mb-2">CONFIGURACIÓN DE CUENTA</span>

        <div className="bg-white rounded-2xl p-1 border border-gray-100 shadow-sm flex flex-col gap-1">
          
          {/* Notificaciones */}
          <button onClick={() => setIsNotificationsOpen(true)} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors text-left">
            <div className="flex items-center gap-3">
              <div className="bg-amber-50 p-2 rounded-xl text-amber-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h11zm0 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800">Notificaciones</h4>
                <p className="text-gray-400 text-xxs font-medium">Compartidas contigo y próximas reuniones</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>

          <div className="border-b border-gray-50 mx-4"></div>

          {/* Ayuda y Soporte */}
          <button onClick={() => window.open('https://www.netbees.es', '_blank')} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors text-left">
            <div className="flex items-center gap-3">
              <div className="bg-amber-50 p-2 rounded-xl text-amber-500">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-800">Ayuda y Soporte</h4>
                <p className="text-gray-400 text-xxs font-medium">Centro de ayuda y contacto</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>

        </div>
      </div>

      {/* --- CERRAR SESIÓN --- */}
      <button onClick={handleLogout} className="w-full max-w-4xl mt-8 bg-amber-400 text-gray-900 py-3 rounded-xl font-bold text-sm shadow-sm hover:bg-amber-500 transition-colors flex items-center justify-center gap-2">
        <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        Cerrar Sesión
      </button>

      <NotificationsModal isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />

      {/* --- BOTTOM NAVIGATION BAR --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-40 max-w-md mx-auto rounded-t-3xl shadow-lg">
        <button className="flex flex-col items-center text-gray-400 gap-0.5" onClick={() => navigate('/')}>
          <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <span className="text-xxs font-semibold">Inicio</span>
        </button>
        <button className="flex flex-col items-center text-gray-400 gap-0.5" onClick={() => navigate('/calendar')}>
          <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <span className="text-xxs font-semibold">Calendario</span>
        </button>

        {/* Central Record Button Spacer placeholder for layout node sizing accurately properly */}
        <div className="w-12"></div>

        <button className="flex flex-col items-center text-gray-400 gap-0.5" onClick={() => navigate('/')}>
          <img src={analisisIcon} className="w-5 h-5 object-contain opacity-40" alt="Análisis" />
          <span className="text-xxs font-semibold">Análisis</span>
        </button>
        <button className="flex flex-col items-center text-amber-500 gap-0.5">
          <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span className="text-xxs font-semibold">Perfil</span>
        </button>
      </div>

    </div>
  );
}

export default ProfilePage;
