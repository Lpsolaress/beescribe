// src/App.js

import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// Importa los componentes de las páginas
// LoginPage se queda normal para que la pantalla inicial cargue rápido
import LoginPage from './pages/LoginPage';
import { GoogleOAuthProvider } from '@react-oauth/google';

// Carga perezosa (Lazy loading) para el resto de páginas
const HomePage = lazy(() => import('./pages/HomePage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ResultDetailsPage = lazy(() => import('./pages/ResultDetailsPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

// Importa el componente que protege las rutas
import ProtectedRoute from './auth/ProtectedRoute';

// Pantalla de carga simple para el Suspense
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400"></div>
  </div>
);

function App() {
  const clientId = "725810592448-3ge8d91ddrl8mluood0e7lb4p1fpa9fo.apps.googleusercontent.com"; // Reemplazar con el Client ID real
  
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <Suspense fallback={<PageLoader />}>
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
            <Route path="/perfil" element={<ProfilePage />} />
            
            {/* Si en el futuro tienes más páginas protegidas, irían aquí */}
            {/* <Route path="/profile" element={<ProfilePage />} /> */}
          </Route>




  
          {/* Ruta para cualquier otra URL no definida */}
          {/* Es una buena práctica redirigir al login o a la home en lugar de mostrar un error */}
          <Route path="*" element={<LoginPage />} /> 
        </Routes>
      </Suspense>
    </GoogleOAuthProvider>
  );
}

export default App;