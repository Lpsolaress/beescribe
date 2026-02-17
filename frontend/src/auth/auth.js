// src/auth/auth.js

import apiClient from '../api';

export const login = async (email, password) => {
  // FastAPI con OAuth2PasswordRequestForm espera datos de tipo 'form-urlencoded'
  const formData = new URLSearchParams();
  formData.append('username', email); // OJO: FastAPI espera 'username', no 'email'
  formData.append('password', password);

  const response = await apiClient.post('/token', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  
  if (response.data.access_token) {
    localStorage.setItem('token', response.data.access_token);
  }
  return response.data;
};

export const register = async (email, password) => {
    return await apiClient.post('/register', { email, password });
};

export const logout = () => {
  localStorage.removeItem('token');
};

export const getCurrentUser = () => {
    // Devuelve el token para que ProtectedRoute sepa si estamos autenticados
    return localStorage.getItem('token');
};

// --- FUNCIÓN AÑADIDA ---
// Esta función es la que necesita App.js.
// Devuelve `true` si getCurrentUser() devuelve un token (una cadena de texto),
// y `false` si devuelve null. El operador `!!` convierte el resultado a un booleano.
export const isAuthenticated = () => !!getCurrentUser();