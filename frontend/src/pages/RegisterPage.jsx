// src/pages/RegisterPage.js

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../auth/auth';

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

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    try {
      await register(email, password);
      navigate('/login', { state: { message: '¡Registro exitoso! Ya puedes iniciar sesión.' } });
    } catch (err) {
      setError(err.response?.data?.detail || 'Ocurrió un error durante el registro.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
        <div className="p-8">
          {/* Header Title Bar */}
          <div className="flex justify-center items-center gap-1.5 mb-4">
            <HexagonIcon />
            <span className="text-gray-600 font-semibold tracking-wide text-sm">Bee-Scribe</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 text-left">Crea tu Cuenta</h2>
          <p className="text-gray-400 text-xs mb-6 text-left">Es rápido y fácil.</p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-600 text-xs font-semibold mb-1">Email</label>
              <div className="relative">
                <span className="absolute left-3 top-3">
                  <MailIcon />
                </span>
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-100 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-600 text-xs font-semibold mb-1">Contraseña</label>
              <div className="relative">
                <span className="absolute left-3 top-3">
                  <LockIcon />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña"
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
            
            <div>
              <label className="block text-gray-600 text-xs font-semibold mb-1">Confirmar Contraseña</label>
              <div className="relative">
                <span className="absolute left-3 top-3">
                  <LockIcon />
                </span>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repite la contraseña"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-100 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                  className="absolute right-3 top-3 cursor-pointer"
                >
                  <EyeIcon />
                </button>
              </div>
            </div>

            {error && <p className="text-red-500 text-xs text-center">{error}</p>}
            
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-amber-400 text-gray-900 py-3 rounded-lg font-bold hover:bg-amber-500 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md text-sm mt-2"
            >
              {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </button>
            
            <p className="text-center text-xs text-gray-500 mt-4">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-amber-500 font-semibold hover:underline">
                Inicia sesión aquí
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;