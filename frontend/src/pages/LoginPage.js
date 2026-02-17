// src/pages/LoginPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../auth/auth';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/'); // Redirige a la página principal
    } catch (err) {
      setError('Email o contraseña incorrectos.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100">
      <div className="p-8 bg-white rounded-lg shadow-2xl w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">Bienvenido a <span className="text-amber-500">Bee-Scribe</span></h2>
        <p className="text-center text-gray-500 mb-8">Inicia sesión para continuar</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 border rounded-md" required />
          <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border rounded-md" required />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" className="w-full bg-amber-400 text-gray-900 py-3 rounded-lg font-bold hover:bg-amber-500">Iniciar Sesión</button>
          <p className="text-center text-sm">¿No tienes cuenta? <Link to="/register" className="text-amber-600 hover:underline">Regístrate aquí</Link></p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;