// src/pages/RegisterPage.js

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../auth/auth'; // Importamos la función de registro

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Verificación de que las contraseñas coinciden
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    try {
      await register(email, password);
      // Si el registro es exitoso, redirigimos al login con un mensaje
      navigate('/login', { state: { message: '¡Registro exitoso! Ya puedes iniciar sesión.' } });
    } catch (err) {
      // Muestra el error que viene del backend (ej: email ya existe)
      setError(err.response?.data?.detail || 'Ocurrió un error durante el registro.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100">
      <div className="p-8 bg-white rounded-lg shadow-2xl w-full max-w-md animate-fade-in-up">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Crea tu Cuenta en <span className="text-amber-500">Bee-Scribe</span>
        </h2>
        <p className="text-center text-gray-500 mb-8">Es rápido y fácil.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
              required
            />
          </div>

          <div>
            <label htmlFor="password"  className="block text-sm font-medium text-gray-700">Contraseña</label>
            <input
              id="password"
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="confirmPassword"  className="block text-sm font-medium text-gray-700">Confirmar Contraseña</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Repite la contraseña"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="mt-1 w-full p-3 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-amber-400 text-gray-900 py-3 rounded-lg font-bold hover:bg-amber-500 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
          
          <p className="text-center text-sm">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="font-semibold text-amber-600 hover:underline">
              Inicia sesión aquí
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;