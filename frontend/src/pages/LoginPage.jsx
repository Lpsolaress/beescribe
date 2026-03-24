// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../auth/auth';
import bannerImg from '../assets/login_banner.png';

const HexagonIcon = () => (
  <svg className="w-5 h-5 text-amber-500 fill-current" viewBox="0 0 24 24">
    <path d="M12 2l8.66 5v10L12 22l-8.66-5V7L12 2z" />
  </svg>
);

const MailIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zM9 11V7a3 3 0 016 0v4" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const GoogleIcon = () => (
  <svg className="w-4 h-4 mr-2" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#34A853" d="M9.07 28.56c-.53-1.57-.83-3.25-.83-5s.3-3.43.83-5l-7.98-6.19C.41 16.14 0 19.51 0 23s.41 6.86 1.09 10.61l7.98-6.19z"/>
    <path fill="#FBBC05" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-10.11H2.56v6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

const AppleIcon = () => (
  <svg className="w-4 h-4 mr-2 fill-current" viewBox="0 0 384 512">
    <path d="M318.7 171.8c-.3-51.3 42.1-76.3 44-77.5-24-35.1-61.5-40-74.8-40.5-31.9-3.2-62.1 18.9-78.2 18.9-16.2 0-41.6-18.9-68.5-18.9-35.3 0-67.9 20.1-86.1 51.7-36.8 64.1-9.4 158.5 26.2 209.9 17.5 25.1 38.3 53.4 65.5 52.4 26.1-1 36-16.7 67.5-16.7 31.4 0 40.5 16.7 68 16.7 27.9 0 46.1-25.9 63.2-51.2 19.8-28.7 28-56.5 28.4-58-.6-.3-54.9-21.1-55.4-83.1zM249.4 83.9c13.6-16.5 22.7-39.3 20.2-62.1-19.5.8-43.1 13-57.1 29.5-12.1 14.2-22.6 37.4-19.7 59.7 21.8 1.7 44.1-10.6 56.6-27.1z"/>
  </svg>
);

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();



  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Email o contraseña incorrectos.');
    }
  };

  const handleSocialClick = (provider) => {
    alert(`La autenticación con ${provider} está en modo visual. Próximamente disponible.`);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
        
        {/* Banner Image */}
        <div className="w-full h-40 overflow-hidden">
          <img src={bannerImg} alt="Banner" className="w-full h-full object-cover" />
        </div>

        <div className="p-8">
          {/* Header Title Bar */}
          <div className="flex justify-center items-center gap-1.5 mb-4">
            <HexagonIcon />
            <span className="text-gray-600 font-semibold tracking-wide text-sm">Bee-Scribe</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 text-left">Bienvenido</h2>
          <p className="text-gray-400 text-xs mb-6 text-left">Ingresa tus credenciales para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-600 text-xs font-semibold mb-1">Correo electrónico</label>
              <div className="relative">
                <span className="absolute left-3 top-3">
                  <MailIcon />
                </span>
                <input 
                  type="email" 
                  placeholder="ejemplo@gmail.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-100 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" 
                  required 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-gray-600 text-xs font-semibold">Contraseña</label>
                <Link to="#" className="text-amber-500 text-xs font-semibold hover:underline">¿Olvidaste tu contraseña?</Link>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-3">
                  <LockIcon />
                </span>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-100 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500" 
                  required 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-3 top-3 cursor-pointer"
                >
                  <EyeIcon />
                </button>
              </div>
            </div>

            {error && <p className="text-red-500 text-xs text-center">{error}</p>}

            <button type="submit" className="w-full bg-amber-400 text-gray-900 py-2.5 rounded-lg font-bold text-sm shadow-sm hover:bg-amber-500 transition-colors mt-2">
              Iniciar Sesión
            </button>

            {/* Separator */}
            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-gray-100"></div>
              <span className="mx-3 text-gray-400 text-xs">o continúa con</span>
              <div className="flex-1 border-t border-gray-100"></div>
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-2">
              <button 
                type="button" 
                onClick={() => handleSocialClick('Google')} 
                className="w-full flex items-center justify-center py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <GoogleIcon /> Continuar con Google
              </button>
              <button 
                type="button" 
                onClick={() => handleSocialClick('Apple')} 
                className="w-full flex items-center justify-center py-2.5 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-900 transition-colors"
              >
                <AppleIcon /> Continuar con Apple ID
              </button>
            </div>

            <p className="text-center text-xs text-gray-500 mt-4">
              ¿No tienes cuenta? <Link to="/register" className="text-amber-500 font-semibold hover:underline">Regístrate aquí</Link>
            </p>
          </form>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;