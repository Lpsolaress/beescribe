import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getCurrentUser } from './auth';

const ProtectedRoute = () => {
  const isAuthenticated = !!getCurrentUser(); // Comprueba si el token existe
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;