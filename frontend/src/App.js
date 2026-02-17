// src/App.js

import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Importa los componentes de las páginas
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ResultDetailsPage from './pages/ResultDetailsPage'; // <--- 1. IMPORTA LA NUEVA PÁGINA
import CalendarPage from './pages/CalendarPage';

// Importa el componente que protege las rutas
import ProtectedRoute from './auth/ProtectedRoute';

function App() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Rutas protegidas */}
      {/* Todas las rutas dentro de este bloque requerirán autenticación */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage />} />
        
        {/* --- 2. AÑADE LA NUEVA RUTA PROTEGIDA AQUÍ --- */}
        <Route path="/results/:meetingId" element={<ResultDetailsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        
        {/* Si en el futuro tienes más páginas protegidas, irían aquí */}
        {/* <Route path="/profile" element={<ProfilePage />} /> */}
      </Route>

      {/* Ruta para cualquier otra URL no definida */}
      {/* Es una buena práctica redirigir al login o a la home en lugar de mostrar un error */}
      <Route path="*" element={<LoginPage />} /> 
    </Routes>
  );
}

export default App;